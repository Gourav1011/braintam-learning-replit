/**
 * Ignite CRM — Mentor Performance Rankings & Historical Leaderboards
 * Admin, Manager, and Team Lead only.
 */

import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  mentorFollowUpsTable,
  demoBatchEnrollmentsTable,
  ignitePaidStudentsTable,
  mentorPerformanceSnapshotsTable,
} from "@workspace/db";
import { eq, and, gte, lte, count, avg, sql, desc, asc, or, inArray } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");

// ── Helpers ──────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getWeekBounds(year: number, week: number): { start: Date; end: Date } {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = (jan4.getDay() + 6) % 7;
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { start: weekStart, end: weekEnd };
}

function parsePeriod(periodType: string, periodKey: string): { start: Date; end: Date } | null {
  if (periodType === "weekly") {
    const m = periodKey.match(/^(\d{4})-W(\d+)$/);
    if (!m) return null;
    return getWeekBounds(parseInt(m[1]!), parseInt(m[2]!));
  }
  if (periodType === "monthly") {
    const m = periodKey.match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    const y = parseInt(m[1]!), mo = parseInt(m[2]!) - 1;
    return {
      start: new Date(y, mo, 1, 0, 0, 0, 0),
      end:   new Date(y, mo + 1, 0, 23, 59, 59, 999),
    };
  }
  if (periodType === "yearly") {
    const y = parseInt(periodKey);
    if (isNaN(y)) return null;
    return {
      start: new Date(y, 0, 1, 0, 0, 0, 0),
      end:   new Date(y, 11, 31, 23, 59, 59, 999),
    };
  }
  return null;
}

function currentPeriodKey(type: string): string {
  const now = new Date();
  if (type === "weekly") return `${now.getFullYear()}-W${String(getISOWeek(now)).padStart(2, "0")}`;
  if (type === "monthly") return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return String(now.getFullYear());
}

function prevPeriodKey(type: string, key: string): string {
  if (type === "weekly") {
    const m = key.match(/^(\d{4})-W(\d+)$/);
    if (!m) return key;
    let [y, w] = [parseInt(m[1]!), parseInt(m[2]!) - 1];
    if (w < 1) { y--; w = 52; }
    return `${y}-W${String(w).padStart(2, "0")}`;
  }
  if (type === "monthly") {
    const m = key.match(/^(\d{4})-(\d{2})$/);
    if (!m) return key;
    let [y, mo] = [parseInt(m[1]!), parseInt(m[2]!) - 1];
    if (mo < 1) { y--; mo = 12; }
    return `${y}-${String(mo).padStart(2, "0")}`;
  }
  return String(parseInt(key) - 1);
}

function periodLabel(type: string, key: string): string {
  if (type === "weekly") {
    const m = key.match(/^(\d{4})-W(\d+)$/);
    return m ? `Week ${m[2]}, ${m[1]}` : key;
  }
  if (type === "monthly") {
    const m = key.match(/^(\d{4})-(\d{2})$/);
    if (!m) return key;
    const d = new Date(parseInt(m[1]!), parseInt(m[2]!) - 1, 1);
    return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
  }
  return `Year ${key}`;
}

// ── Compute live mentor stats ─────────────────────────────────────────────────

interface MentorStats {
  mentorId:             number;
  mentorName:           string;
  mentorEmail:          string | null;
  isActive:             string;
  assignedLeads:        number;
  successfulCalls:      number;
  pendingCalls:         number;
  noResponseLeads:      number;
  demoAttendancePct:    number;
  successfulPayments:   number;
  conversionPct:        number;
  nonActiveLeads:       number;
  rank:                 number;
}

async function computeMentorStats(
  mentorIds: number[],
  start: Date | null,
  end: Date | null,
): Promise<MentorStats[]> {
  if (mentorIds.length === 0) return [];

  // ── Assigned leads ────────────────────────────────────────────────────────
  const leadsQ = db
    .select({
      mentorId: usersTable.assignedMentorId,
      cnt:      count().as("cnt"),
    })
    .from(usersTable)
    .where(
      and(
        inArray(usersTable.assignedMentorId, mentorIds),
        start ? gte(usersTable.createdAt, start) : undefined,
        end   ? lte(usersTable.createdAt, end)   : undefined,
      )
    )
    .groupBy(usersTable.assignedMentorId);

  // ── Successful calls (Call Connected or Call Back Later, incl. legacy values) ────
  const callsQ = db
    .select({
      mentorId: mentorFollowUpsTable.mentorId,
      cnt:      count().as("cnt"),
    })
    .from(mentorFollowUpsTable)
    .where(
      and(
        inArray(mentorFollowUpsTable.mentorId, mentorIds),
        inArray(mentorFollowUpsTable.callStatus, ["Picked", "Call Back", "Call Connected", "Call Back Later"]),
        start ? gte(mentorFollowUpsTable.createdAt, start) : undefined,
        end   ? lte(mentorFollowUpsTable.createdAt, end)   : undefined,
      )
    )
    .groupBy(mentorFollowUpsTable.mentorId);

  // ── Pending calls (Need To Call / Pending) ────────────────────────────────
  const pendingQ = db
    .select({
      mentorId: usersTable.assignedMentorId,
      cnt:      count().as("cnt"),
    })
    .from(usersTable)
    .where(
      and(
        inArray(usersTable.assignedMentorId, mentorIds),
        inArray(usersTable.callStatus, ["Need To Call", "Pending"]),
      )
    )
    .groupBy(usersTable.assignedMentorId);

  // ── No Response leads (not connected, busy, switched off, wrong number) ───
  const noRespQ = db
    .select({
      mentorId: usersTable.assignedMentorId,
      cnt:      count().as("cnt"),
    })
    .from(usersTable)
    .where(
      and(
        inArray(usersTable.assignedMentorId, mentorIds),
        inArray(usersTable.callStatus, ["Not Connected", "Busy", "No Response", "Switched Off", "Wrong Number"]),
      )
    )
    .groupBy(usersTable.assignedMentorId);

  // ── Demo attendance % ─────────────────────────────────────────────────────
  const attendQ = db
    .select({
      mentorId: demoBatchEnrollmentsTable.assignedMentorId,
      avgAttend: avg(demoBatchEnrollmentsTable.lastDayAttended).as("avg_attend"),
    })
    .from(demoBatchEnrollmentsTable)
    .where(inArray(demoBatchEnrollmentsTable.assignedMentorId, mentorIds))
    .groupBy(demoBatchEnrollmentsTable.assignedMentorId);

  // ── Successful payments ───────────────────────────────────────────────────
  const paymentsQ = db
    .select({
      mentorId: ignitePaidStudentsTable.assignedMentorId,
      cnt:      count().as("cnt"),
    })
    .from(ignitePaidStudentsTable)
    .where(
      and(
        inArray(ignitePaidStudentsTable.assignedMentorId, mentorIds),
        start ? gte(ignitePaidStudentsTable.paidAt, start) : undefined,
        end   ? lte(ignitePaidStudentsTable.paidAt, end)   : undefined,
      )
    )
    .groupBy(ignitePaidStudentsTable.assignedMentorId);

  // ── Non-active leads ──────────────────────────────────────────────────────
  const nonActiveQ = db
    .select({
      mentorId: usersTable.assignedMentorId,
      cnt:      count().as("cnt"),
    })
    .from(usersTable)
    .where(
      and(
        inArray(usersTable.assignedMentorId, mentorIds),
        or(
          eq(usersTable.leadStage, "Non-Active"),
          eq(usersTable.isActive, false),
        ),
      )
    )
    .groupBy(usersTable.assignedMentorId);

  const [leadsRows, callsRows, pendingRows, noRespRows, attendRows, paymentsRows, nonActiveRows] =
    await Promise.all([leadsQ, callsQ, pendingQ, noRespQ, attendQ, paymentsQ, nonActiveQ]);

  const toMap = <T extends { mentorId: number | null }>(rows: T[], key: keyof T) =>
    Object.fromEntries(rows.map((r) => [r.mentorId, r[key] as number]));

  const leadsMap    = toMap(leadsRows,    "cnt");
  const callsMap    = toMap(callsRows,    "cnt");
  const pendingMap  = toMap(pendingRows,  "cnt");
  const noRespMap   = toMap(noRespRows,   "cnt");
  const paymentsMap = toMap(paymentsRows, "cnt");
  const nonActiveMap= toMap(nonActiveRows,"cnt");

  const attendMap: Record<number, number> = {};
  for (const r of attendRows) {
    if (r.mentorId != null) attendMap[r.mentorId] = Math.round((Number(r.avgAttend ?? 0) / 5) * 100);
  }

  return mentorIds.map((mid) => {
    const leads    = leadsMap[mid]    ?? 0;
    const payments = paymentsMap[mid] ?? 0;
    return {
      mentorId:           mid,
      mentorName:         "",  // filled below
      mentorEmail:        null,
      isActive:           "active",
      assignedLeads:      leads,
      successfulCalls:    callsMap[mid]   ?? 0,
      pendingCalls:       pendingMap[mid] ?? 0,
      noResponseLeads:    noRespMap[mid]  ?? 0,
      demoAttendancePct:  attendMap[mid]  ?? 0,
      successfulPayments: payments,
      conversionPct:      leads > 0 ? Math.round((payments / leads) * 1000) / 10 : 0,
      nonActiveLeads:     nonActiveMap[mid] ?? 0,
      rank:               0,
    };
  });
}

// ── Sort & rank ───────────────────────────────────────────────────────────────

function rankStats(stats: MentorStats[]): MentorStats[] {
  return stats
    .sort((a, b) =>
      b.conversionPct        - a.conversionPct        ||
      b.successfulPayments   - a.successfulPayments   ||
      a.nonActiveLeads       - b.nonActiveLeads
    )
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

// ── GET /api/admin/ignite/performance-rankings/live ───────────────────────────
router.get("/admin/ignite/performance-rankings/live", adminOnly, async (req, res) => {
  const { periodType = "weekly", periodKey, startDate, endDate } = req.query as Record<string, string>;

  let start: Date | null = null;
  let end:   Date | null = null;

  if (startDate && endDate) {
    start = new Date(startDate);
    end   = new Date(endDate);
  } else {
    const key    = periodKey ?? currentPeriodKey(periodType);
    const bounds = parsePeriod(periodType, key);
    if (bounds) { start = bounds.start; end = bounds.end; }
  }

  // Prev period for "Most Improved"
  const curKey  = periodKey ?? currentPeriodKey(periodType);
  const prevKey = prevPeriodKey(periodType, curKey);

  const [mentors, prevSnapshots] = await Promise.all([
    db.select({
      id:       usersTable.id,
      name:     usersTable.name,
      email:    usersTable.email,
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .where(eq(usersTable.role, "mentor")),

    db.select()
      .from(mentorPerformanceSnapshotsTable)
      .where(
        and(
          eq(mentorPerformanceSnapshotsTable.periodType, periodType),
          eq(mentorPerformanceSnapshotsTable.periodKey, prevKey),
        )
      ),
  ]);

  const mentorIds = mentors.map((m) => m.id);
  const rawStats  = await computeMentorStats(mentorIds, start, end);

  // Attach names
  const mentorMap = Object.fromEntries(mentors.map((m) => [m.id, m]));
  for (const s of rawStats) {
    const m = mentorMap[s.mentorId];
    if (m) {
      s.mentorName  = m.name ?? "Unknown";
      s.mentorEmail = m.email ?? null;
      s.isActive    = m.isActive ? "active" : "inactive";
    }
  }

  const ranked = rankStats(rawStats.filter((s) => mentorMap[s.mentorId]?.isActive !== false || s.assignedLeads > 0));

  // Most Improved: biggest positive delta in conversionPct vs prev snapshot
  const prevMap = Object.fromEntries(prevSnapshots.map((p) => [p.mentorId, p.conversionPct]));
  let mostImproved: { mentorId: number; mentorName: string; delta: number } | null = null;
  for (const s of ranked) {
    const prev  = prevMap[s.mentorId] ?? 0;
    const delta = s.conversionPct - prev;
    if (!mostImproved || delta > mostImproved.delta) {
      mostImproved = { mentorId: s.mentorId, mentorName: s.mentorName, delta };
    }
  }

  // Top cards
  const topConversion  = [...ranked].sort((a, b) => b.conversionPct      - a.conversionPct)[0]      ?? null;
  const topPayments    = [...ranked].sort((a, b) => b.successfulPayments  - a.successfulPayments)[0]  ?? null;
  const lowestNonActive= [...ranked].filter((r) => r.assignedLeads > 0).sort((a, b) => a.nonActiveLeads - b.nonActiveLeads)[0] ?? null;

  res.json({
    periodType,
    periodKey:   curKey,
    periodLabel: periodLabel(periodType, curKey),
    startDate:   start?.toISOString() ?? null,
    endDate:     end?.toISOString()   ?? null,
    rankings:    ranked,
    cards: {
      topPerformer:    ranked[0] ?? null,
      topConversion,
      topPayments,
      lowestNonActive,
      mostImproved,
    },
  });
});

// ── GET /api/admin/ignite/performance-rankings/snapshots ──────────────────────
router.get("/admin/ignite/performance-rankings/snapshots", adminOnly, async (req, res) => {
  const { periodType, periodKey } = req.query as Record<string, string>;

  const conditions = [];
  if (periodType) conditions.push(eq(mentorPerformanceSnapshotsTable.periodType, periodType));
  if (periodKey)  conditions.push(eq(mentorPerformanceSnapshotsTable.periodKey,  periodKey));

  const rows = await db
    .select()
    .from(mentorPerformanceSnapshotsTable)
    .where(conditions.length ? and(...conditions as Parameters<typeof and>) : undefined)
    .orderBy(desc(mentorPerformanceSnapshotsTable.periodKey), asc(mentorPerformanceSnapshotsTable.rank));

  res.json(rows);
});

// ── GET /api/admin/ignite/performance-rankings/snapshot-periods ───────────────
router.get("/admin/ignite/performance-rankings/snapshot-periods", adminOnly, async (_req, res) => {
  const rows = await db
    .selectDistinct({
      periodType:  mentorPerformanceSnapshotsTable.periodType,
      periodKey:   mentorPerformanceSnapshotsTable.periodKey,
      periodLabel: mentorPerformanceSnapshotsTable.periodLabel,
    })
    .from(mentorPerformanceSnapshotsTable)
    .orderBy(desc(mentorPerformanceSnapshotsTable.periodKey));

  res.json(rows);
});

// ── POST /api/admin/ignite/performance-rankings/snapshots ─────────────────────
// Save current live rankings as a frozen snapshot for the given period.
router.post("/admin/ignite/performance-rankings/snapshots", adminOnly, async (req, res) => {
  const {
    periodType = "weekly",
    periodKey,
    snapshotNote,
  } = req.body as { periodType?: string; periodKey?: string; snapshotNote?: string };

  const admin = req.authUser!;
  const key   = periodKey ?? currentPeriodKey(periodType);
  const label = periodLabel(periodType, key);

  const bounds = parsePeriod(periodType, key);
  const start  = bounds?.start ?? null;
  const end    = bounds?.end   ?? null;

  const mentors = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, isActive: usersTable.isActive })
    .from(usersTable)
    .where(eq(usersTable.role, "mentor"));

  const mentorIds = mentors.map((m) => m.id);
  const rawStats  = await computeMentorStats(mentorIds, start, end);
  const mentorMap = Object.fromEntries(mentors.map((m) => [m.id, m]));
  for (const s of rawStats) {
    const m = mentorMap[s.mentorId];
    if (m) { s.mentorName = m.name ?? "Unknown"; s.mentorEmail = m.email ?? null; s.isActive = m.isActive ? "active" : "inactive"; }
  }

  const ranked = rankStats(rawStats);

  // Upsert each mentor row (conflict = (periodType, periodKey, mentorId) → update)
  for (const s of ranked) {
    await db
      .insert(mentorPerformanceSnapshotsTable)
      .values({
        periodType,
        periodKey:          key,
        periodLabel:        label,
        mentorId:           s.mentorId,
        mentorName:         s.mentorName,
        mentorEmail:        s.mentorEmail,
        isActive:           s.isActive,
        assignedLeads:      s.assignedLeads,
        successfulCalls:    s.successfulCalls,
        pendingCalls:       s.pendingCalls,
        noResponseLeads:    s.noResponseLeads,
        demoAttendancePct:  s.demoAttendancePct,
        homeworkCompletionPct: 0,
        successfulPayments: s.successfulPayments,
        conversionPct:      s.conversionPct,
        nonActiveLeads:     s.nonActiveLeads,
        rank:               s.rank,
        snapshotNote:       snapshotNote ?? null,
        savedById:          admin.id,
        savedByName:        admin.name ?? "Admin",
      })
      .onConflictDoUpdate({
        target: [
          mentorPerformanceSnapshotsTable.periodType,
          mentorPerformanceSnapshotsTable.periodKey,
          mentorPerformanceSnapshotsTable.mentorId,
        ],
        set: {
          assignedLeads:      s.assignedLeads,
          successfulCalls:    s.successfulCalls,
          pendingCalls:       s.pendingCalls,
          noResponseLeads:    s.noResponseLeads,
          demoAttendancePct:  s.demoAttendancePct,
          successfulPayments: s.successfulPayments,
          conversionPct:      s.conversionPct,
          nonActiveLeads:     s.nonActiveLeads,
          rank:               s.rank,
          snapshotNote:       snapshotNote ?? null,
          savedById:          admin.id,
          savedByName:        admin.name ?? "Admin",
        },
      });
  }

  res.json({ ok: true, saved: ranked.length, periodKey: key, periodLabel: label });
});

// ── GET /api/admin/ignite/performance-rankings/mentor/:id ─────────────────────
// Detailed mentor report with trend data across all available snapshots.
router.get("/admin/ignite/performance-rankings/mentor/:id", adminOnly, async (req, res) => {
  const mentorId = parseInt(req.params["id"] as string, 10);
  if (isNaN(mentorId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [mentor] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, isActive: usersTable.isActive })
    .from(usersTable)
    .where(eq(usersTable.id, mentorId))
    .limit(1);

  if (!mentor) { res.status(404).json({ error: "Mentor not found" }); return; }

  // All snapshots for this mentor ordered by period
  const snapshots = await db
    .select()
    .from(mentorPerformanceSnapshotsTable)
    .where(eq(mentorPerformanceSnapshotsTable.mentorId, mentorId))
    .orderBy(asc(mentorPerformanceSnapshotsTable.periodKey));

  // Current live stats (all-time)
  const [live] = await computeMentorStats([mentorId], null, null);

  res.json({
    mentor: { id: mentor.id, name: mentor.name, email: mentor.email, isActive: mentor.isActive },
    live:   live ?? null,
    snapshots,
  });
});

// ── GET /api/admin/ignite/performance-rankings/export.csv ────────────────────
router.get("/admin/ignite/performance-rankings/export.csv", adminOnly, async (req, res) => {
  const { periodType = "weekly", periodKey, source = "live" } = req.query as Record<string, string>;

  let rows: Array<Record<string, string | number>>;

  if (source === "snapshot") {
    const snaps = await db
      .select()
      .from(mentorPerformanceSnapshotsTable)
      .where(
        and(
          eq(mentorPerformanceSnapshotsTable.periodType, periodType),
          periodKey ? eq(mentorPerformanceSnapshotsTable.periodKey, periodKey) : undefined,
        )
      )
      .orderBy(asc(mentorPerformanceSnapshotsTable.rank));

    rows = snaps.map((s) => ({
      Rank:                s.rank,
      "Mentor Name":       s.mentorName,
      "Period":            s.periodLabel ?? s.periodKey,
      "Status":            s.isActive,
      "Assigned Leads":    s.assignedLeads,
      "Successful Calls":  s.successfulCalls,
      "Demo Attendance %": s.demoAttendancePct,
      "Successful Payments": s.successfulPayments,
      "Conversion %":      s.conversionPct,
      "Non-Active Leads":  s.nonActiveLeads,
    }));
  } else {
    const curKey    = periodKey ?? currentPeriodKey(periodType);
    const bounds    = parsePeriod(periodType, curKey);
    const mentors   = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.role, "mentor"));
    const rawStats  = await computeMentorStats(mentors.map((m) => m.id), bounds?.start ?? null, bounds?.end ?? null);
    const mentorMap = Object.fromEntries(mentors.map((m) => [m.id, m]));
    for (const s of rawStats) { s.mentorName = mentorMap[s.mentorId]?.name ?? "Unknown"; }
    const ranked = rankStats(rawStats);

    rows = ranked.map((s) => ({
      Rank:                s.rank,
      "Mentor Name":       s.mentorName,
      "Period":            periodLabel(periodType, curKey),
      "Assigned Leads":    s.assignedLeads,
      "Successful Calls":  s.successfulCalls,
      "Demo Attendance %": s.demoAttendancePct,
      "Successful Payments": s.successfulPayments,
      "Conversion %":      s.conversionPct,
      "Non-Active Leads":  s.nonActiveLeads,
    }));
  }

  if (rows.length === 0) { res.json({ data: [] }); return; }

  const headers = Object.keys(rows[0]!);
  const csvRows = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))
  ];

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="ignite-rankings-${periodType}-${Date.now()}.csv"`);
  res.send(csvRows.join("\n"));
});

export default router;
