import { Router } from "express";
import { logger } from "../lib/logger";
import { db } from "@workspace/db";
import { sessionAttendanceTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// ── In-memory ring buffer for payment funnel events ───────────
const MAX_EVENTS = 5000;
type AnalyticsEntry = {
  ts: string;
  event: string;
  sessionId: string;
  userId: string;
  role: string;
  metadata: Record<string, unknown>;
};
const eventLog: AnalyticsEntry[] = [];

// POST /api/analytics/event
router.post("/analytics/event", (req, res) => {
  const { event, sessionId, userId, role, metadata = {} } = req.body as {
    event: string;
    sessionId: string;
    userId: string;
    role: string;
    metadata?: Record<string, unknown>;
  };

  if (!event || !sessionId) {
    return res.status(400).json({ error: "event and sessionId are required" });
  }

  const entry: AnalyticsEntry = {
    ts: new Date().toISOString(),
    event,
    sessionId,
    userId,
    role,
    metadata,
  };

  logger.info(
    { analyticsEvent: event, sessionId, userId, role, metadata },
    "payment_analytics"
  );

  if (eventLog.length >= MAX_EVENTS) eventLog.shift();
  eventLog.push(entry);

  return res.json({ ok: true });
});

// GET /api/analytics/events
// Query params: sessionId, grade, batch, paymentLink, event, limit (default 200)
router.get("/analytics/events", (req, res) => {
  const {
    sessionId,
    grade,
    batch,
    paymentLink,
    event: eventFilter,
    limit: rawLimit,
  } = req.query as Record<string, string | undefined>;

  const limit = Math.min(Number(rawLimit ?? 200), 2000);

  let results = [...eventLog];

  if (sessionId)   results = results.filter(e => e.sessionId === sessionId);
  if (eventFilter) results = results.filter(e => e.event === eventFilter);
  if (grade)       results = results.filter(e => String(e.metadata["grade"] ?? "") === grade);
  if (batch)       results = results.filter(e => String(e.metadata["batch"] ?? "") === batch);
  if (paymentLink) results = results.filter(e => String(e.metadata["payLink"] ?? "") === paymentLink);

  // Return newest-first, then apply limit
  results = results.reverse().slice(0, limit);

  // Funnel summary
  const funnel = {
    popup_opened:    eventLog.filter(e => e.event === "popup_opened"   && (!sessionId || e.sessionId === sessionId)).length,
    cta_clicked:     eventLog.filter(e => e.event === "cta_clicked"    && (!sessionId || e.sessionId === sessionId)).length,
    payment_started: eventLog.filter(e => e.event === "payment_started" && (!sessionId || e.sessionId === sessionId)).length,
  };

  return res.json({ events: results, total: results.length, funnel });
});

// GET /api/analytics/attendance/:sessionId
// Returns per-student attendance with joinedAt, leftAt, totalDurationSeconds, attendancePct
router.get("/analytics/attendance/:sessionId", async (req, res) => {
  const sid = Number(req.params["sessionId"]);
  if (Number.isNaN(sid)) return res.status(400).json({ error: "Invalid sessionId" });

  try {
    const rows = await db
      .select()
      .from(sessionAttendanceTable)
      .where(eq(sessionAttendanceTable.sessionId, sid))
      .orderBy(desc(sessionAttendanceTable.joinedAt));

    if (rows.length === 0) return res.json({ students: [], sessionId: sid });

    // Compute class duration from earliest joinedAt to latest leftAt/lastSeenAt
    const earliest = rows.reduce((min, r) =>
      r.joinedAt && r.joinedAt < min ? r.joinedAt : min,
      rows[0]!.joinedAt ?? new Date()
    );
    const latest = rows.reduce((max, r) => {
      const t = r.leftAt ?? r.lastSeenAt ?? new Date();
      return t > max ? t : max;
    }, earliest);

    const classDurationSeconds = Math.max(
      Math.round((latest.getTime() - earliest.getTime()) / 1000),
      1
    );

    const students = rows.map(r => ({
      studentId:           r.studentId,
      studentName:         r.studentName,
      mentorGroupId:       r.mentorGroupId,
      role:                r.role,
      joinedAt:            r.joinedAt?.toISOString() ?? null,
      leftAt:              r.leftAt?.toISOString() ?? null,
      lastSeenAt:          r.lastSeenAt?.toISOString() ?? null,
      totalDurationSeconds: r.totalDurationSeconds ?? 0,
      attendancePct:       Math.min(
        100,
        Math.round(((r.totalDurationSeconds ?? 0) / classDurationSeconds) * 100)
      ),
    }));

    // Aggregate stats
    const present = students.filter(s => (s.totalDurationSeconds ?? 0) > 30);
    const avgPct  = present.length
      ? Math.round(present.reduce((sum, s) => sum + s.attendancePct, 0) / present.length)
      : 0;

    return res.json({
      sessionId: sid,
      classDurationSeconds,
      totalStudents: rows.length,
      studentsPresent: present.length,
      avgAttendancePct: avgPct,
      students,
    });
  } catch (err) {
    logger.error({ err }, "attendance analytics query failed");
    return res.status(500).json({ error: "Query failed" });
  }
});

export default router;
