import { Router } from "express";
import { db } from "@workspace/db";
import {
  demoBatchesTable,
  demoSessionsTable,
  demoBatchEnrollmentsTable,
  liveClassesTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, and, sql, count, inArray, or } from "drizzle-orm";
import { requireRole, requireAuth } from "../middlewares/auth.js";
import { hashPassword } from "../lib/password.js";

const router = Router();
const adminOnly = requireRole("admin");
const staffAuth = requireRole("teacher"); // mentor-level or above

// ── Helper: total session count for a batch (live_classes + historical demo_sessions) ──
async function countIgniteSessions(batchId: number): Promise<number> {
  const [lcRow] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(liveClassesTable)
    .where(and(eq(liveClassesTable.igniteBatchId, batchId), eq(liveClassesTable.classType, "ignite")));
  const [dsRow] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(demoSessionsTable)
    .where(eq(demoSessionsTable.batchId, batchId));
  return Number(lcRow?.cnt ?? 0) + Number(dsRow?.cnt ?? 0);
}

// ── Helper: normalize a live_classes row into a demo-session-compatible shape ──
// This lets the admin UI work with the new live_classes rows without changes.
function lcToSessionShape(lc: typeof liveClassesTable.$inferSelect, batchId: number) {
  return {
    id: lc.id,
    batchId,
    title: lc.title,
    description: null as string | null,
    dayNumber: lc.dayNumber ?? 1,
    subject: null as string | null,
    teacherId: lc.teacherId ?? null,
    teacherName: lc.teacher ?? null,
    scheduledAt: lc.scheduledAt,
    duration: lc.duration,
    joinUrl: lc.joinUrl ?? `/live/${lc.id}?role=student&type=ignite`,
    recordingUrl: lc.recordingUrl ?? null,
    homeworkText: lc.homeworkText ?? null,
    homeworkLink: lc.homeworkLink ?? null,
    bannerUrl: lc.thumbnailUrl ?? null,
    status: lc.status === "upcoming" ? "scheduled" : lc.status, // normalize for admin UI compat
    slideUrl: lc.slideUrl ?? null,
    isPublished: lc.isPublished,
    createdAt: lc.createdAt,
    sessionType: "live_class" as const,
  };
}

// ── Public / Student routes ──────────────────────────────────

router.get("/demo-batches", async (_req, res) => {
  const batches = await db
    .select()
    .from(demoBatchesTable)
    .where(eq(demoBatchesTable.isPublic, true))
    .orderBy(desc(demoBatchesTable.createdAt));
  res.json(batches);
});

router.get("/demo-batches/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [batch] = await db.select().from(demoBatchesTable).where(eq(demoBatchesTable.id, id));
  if (!batch) { res.status(404).json({ error: "Not found" }); return; }

  // 1. Historical sessions — pre-migration, stored in demo_sessions (read-only)
  const demoSessions = await db
    .select()
    .from(demoSessionsTable)
    .where(and(eq(demoSessionsTable.batchId, id), eq(demoSessionsTable.isPublished, true)));

  // 2. New Ignite sessions — post-migration, written to live_classes with igniteBatchId
  const igniteLiveClasses = await db
    .select()
    .from(liveClassesTable)
    .where(
      and(
        eq(liveClassesTable.igniteBatchId, id),
        eq(liveClassesTable.classType, "ignite"),
        eq(liveClassesTable.isPublished, true),
        eq(liveClassesTable.isArchived, false),
      )
    );

  // 3. Legacy "advanced blue classes" — mastery sessions linked via batchId FK (backward compat)
  const advancedLiveClasses = await db
    .select()
    .from(liveClassesTable)
    .where(
      and(
        eq(liveClassesTable.batchId, id),
        eq(liveClassesTable.isPublished, true),
        eq(liveClassesTable.isArchived, false),
      )
    );

  const normalSessions = demoSessions.map(session => ({
    ...session,
    sessionType: "demo_session" as const,
    slideUrl: null,
  }));

  const igniteSessions = igniteLiveClasses.map(lc => lcToSessionShape(lc, id));

  // For legacy blue classes, append after all proper day-numbered sessions
  const maxDayNumber = Math.max(
    0,
    ...demoSessions.map(s => s.dayNumber ?? 0),
    ...igniteLiveClasses.map(s => s.dayNumber ?? 0),
  );
  const blueSessions = advancedLiveClasses.map((liveClass, index) => ({
    id: liveClass.id,
    batchId: id,
    title: liveClass.title,
    description: null as string | null,
    dayNumber: maxDayNumber + 1 + index,
    subject: null as string | null,
    teacherId: liveClass.teacherId,
    teacherName: liveClass.teacher,
    scheduledAt: liveClass.scheduledAt,
    duration: liveClass.duration,
    joinUrl: `/live/${liveClass.id}?role=student&type=ignite`,
    recordingUrl: liveClass.recordingUrl ?? null,
    homeworkText: liveClass.homeworkText ?? null,
    homeworkLink: liveClass.homeworkLink ?? null,
    bannerUrl: liveClass.thumbnailUrl ?? null,
    status: liveClass.status,
    isPublished: liveClass.isPublished,
    createdAt: liveClass.createdAt,
    sessionType: "live_class" as const,
    slideUrl: liveClass.slideUrl ?? null,
  }));

  const sessions = [...normalSessions, ...igniteSessions, ...blueSessions]
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  res.json({ batch, sessions });
});

// ── Admin: Batch CRUD ─────────────────────────────────────────

router.get("/admin/demo-batches", adminOnly, async (_req, res) => {
  const batches = await db
    .select()
    .from(demoBatchesTable)
    .orderBy(desc(demoBatchesTable.createdAt));

  // Enrich each batch with enrollment counts
  const enriched = await Promise.all(batches.map(async (b) => {
    const [counts] = await db
      .select({
        total: count(demoBatchEnrollmentsTable.id),
        converted: sql<number>`SUM(CASE WHEN ${demoBatchEnrollmentsTable.enrollmentStatus} = 'converted' THEN 1 ELSE 0 END)`,
        dropped: sql<number>`SUM(CASE WHEN ${demoBatchEnrollmentsTable.enrollmentStatus} = 'dropped' THEN 1 ELSE 0 END)`,
      })
      .from(demoBatchEnrollmentsTable)
      .where(eq(demoBatchEnrollmentsTable.batchId, b.id));
    const total = Number(counts?.total ?? 0);
    const converted = Number(counts?.converted ?? 0);
    const dropped = Number(counts?.dropped ?? 0);
    return {
      ...b,
      enrolledCount: total,
      convertedCount: converted,
      droppedCount: dropped,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    };
  }));

  res.json(enriched);
});

const DEFAULT_SESSION_TEMPLATE: { subject: string }[] = [
  { subject: "Maths" },
  { subject: "Science" },
  { subject: "Maths" },
  { subject: "English" },
  { subject: "Science" },
];

function sessionDateForDay(startDate: Date, dayIndex: number): Date {
  const istStr = startDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const [y, m, d] = istStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dayIndex, 11, 30, 0)); // 5 PM IST = 11:30 UTC
}

router.post("/admin/demo-batches", adminOnly, async (req, res) => {
  const { title, joinLink, startDate, endDate, grade, isPublic, batchCode, status } = req.body as {
    title?: string; joinLink?: string; startDate?: string; endDate?: string;
    grade?: number; isPublic?: boolean; batchCode?: string; status?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "Title required" }); return; }

  const parsedStart = startDate ? new Date(startDate) : undefined;

  const [row] = await db.insert(demoBatchesTable).values({
    title: title.trim(),
    joinLink: joinLink?.trim(),
    startDate: parsedStart,
    endDate: endDate ? new Date(endDate) : undefined,
    grade: grade ?? undefined,
    totalDays: 5,
    isPublic: isPublic ?? true,
    batchCode: batchCode?.trim(),
    status: status ?? "upcoming",
  }).returning();

  // Auto-generate 5 default sessions — written to live_classes (Approach B migration)
  const sessions: ReturnType<typeof lcToSessionShape>[] = [];
  if (parsedStart) {
    for (let i = 0; i < DEFAULT_SESSION_TEMPLATE.length; i++) {
      const tpl = DEFAULT_SESSION_TEMPLATE[i];
      const [s] = await db.insert(liveClassesTable).values({
        classType: "ignite",
        igniteBatchId: row.id,
        title: `Day ${i + 1} – ${tpl.subject}`,
        dayNumber: i + 1,
        grade: row.grade ?? 0,
        teacher: row.teacherName ?? "",
        teacherId: row.teacherId ?? undefined,
        scheduledAt: sessionDateForDay(parsedStart, i),
        duration: 60,
        status: "upcoming",
      }).returning();
      sessions.push(lcToSessionShape(s, row.id));
    }
  }

  res.json({ ...row, sessions });
});

router.put("/admin/demo-batches/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  // Read old batch before updating (for startDate cascade)
  const [oldBatch] = await db.select().from(demoBatchesTable).where(eq(demoBatchesTable.id, id));
  if (!oldBatch) { res.status(404).json({ error: "Not found" }); return; }

  const { title, joinLink, startDate, endDate, grade, isPublic, isActive, status, batchCode } = req.body as Record<string, unknown>;
  const updates: Partial<typeof demoBatchesTable.$inferInsert> = {};
  if (title !== undefined) updates.title = String(title).trim();
  if (joinLink !== undefined) updates.joinLink = String(joinLink).trim();
  if (startDate !== undefined) updates.startDate = new Date(String(startDate));
  if (endDate !== undefined) updates.endDate = new Date(String(endDate));
  if (grade !== undefined) updates.grade = Number(grade);
  if (isPublic !== undefined) updates.isPublic = Boolean(isPublic);
  if (isActive !== undefined) updates.isActive = Boolean(isActive);
  if (status !== undefined) updates.status = String(status);
  if (batchCode !== undefined) updates.batchCode = String(batchCode).trim();

  const [row] = await db.update(demoBatchesTable).set(updates).where(eq(demoBatchesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  // Cascade startDate change to all sessions (live_classes only — demo_sessions are historical/read-only)
  if (startDate !== undefined && oldBatch.startDate) {
    const oldStart = oldBatch.startDate.getTime();
    const newStart = new Date(String(startDate)).getTime();
    const offsetMs = newStart - oldStart;
    if (offsetMs !== 0) {
      const lcSessions = await db
        .select({ id: liveClassesTable.id, scheduledAt: liveClassesTable.scheduledAt })
        .from(liveClassesTable)
        .where(and(eq(liveClassesTable.igniteBatchId, id), eq(liveClassesTable.classType, "ignite")));
      for (const s of lcSessions) {
        const newScheduledAt = new Date(s.scheduledAt.getTime() + offsetMs);
        await db.update(liveClassesTable).set({ scheduledAt: newScheduledAt }).where(eq(liveClassesTable.id, s.id));
      }
    }
  }

  res.json(row);
});

router.delete("/admin/demo-batches/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  // Delete new live_classes sessions for this batch first (they have the ignite_batch_id FK)
  await db.delete(liveClassesTable).where(
    and(eq(liveClassesTable.igniteBatchId, id), eq(liveClassesTable.classType, "ignite"))
  );
  // Delete historical demo_sessions (still present for old batches)
  await db.delete(demoSessionsTable).where(eq(demoSessionsTable.batchId, id));
  await db.delete(demoBatchEnrollmentsTable).where(eq(demoBatchEnrollmentsTable.batchId, id));
  await db.delete(demoBatchesTable).where(eq(demoBatchesTable.id, id));
  res.json({ success: true });
});

// ── Admin: Batch Overview ─────────────────────────────────────

router.get("/admin/demo-batches/:id/overview", adminOnly, async (req, res) => {
  const batchId = Number(req.params.id);
  if (!batchId) { res.status(400).json({ error: "Invalid id" }); return; }

  const [batch] = await db.select().from(demoBatchesTable).where(eq(demoBatchesTable.id, batchId));
  if (!batch) { res.status(404).json({ error: "Not found" }); return; }

  const sessions = await db.select().from(demoSessionsTable)
    .where(eq(demoSessionsTable.batchId, batchId)).orderBy(demoSessionsTable.dayNumber);

  const enrollments = await db.select().from(demoBatchEnrollmentsTable)
    .where(eq(demoBatchEnrollmentsTable.batchId, batchId));

  const total = enrollments.length;
  const converted = enrollments.filter(e => e.enrollmentStatus === "converted").length;
  const dropped = enrollments.filter(e => e.enrollmentStatus === "dropped").length;
  const active = total - converted - dropped;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  // Day-by-day attendance: count of students who reached each day (lastDayAttended >= N)
  const dayBreakdown: { day: number; count: number }[] = [];
  for (let d = 1; d <= batch.totalDays; d++) {
    dayBreakdown.push({
      day: d,
      count: enrollments.filter(e => (e.lastDayAttended ?? 0) >= d).length,
    });
  }

  // Mentor assignment summary
  const mentorMap = new Map<string, { name: string; assigned: number; converted: number; pending: number }>();
  for (const e of enrollments) {
    const mname = e.assignedMentorName ?? "Unassigned";
    if (!mentorMap.has(mname)) mentorMap.set(mname, { name: mname, assigned: 0, converted: 0, pending: 0 });
    const m = mentorMap.get(mname)!;
    m.assigned++;
    if (e.enrollmentStatus === "converted") m.converted++;
    else if (e.enrollmentStatus === "active") m.pending++;
  }
  const mentorStats = Array.from(mentorMap.values()).map(m => ({
    ...m,
    conversionRate: m.assigned > 0 ? Math.round((m.converted / m.assigned) * 100) : 0,
  }));

  res.json({
    batch,
    sessions,
    metrics: { total, converted, dropped, active, conversionRate },
    dayBreakdown,
    mentorStats,
  });
});

// ── Admin: Batch Students (enriched) ─────────────────────────

router.get("/admin/demo-batches/:batchId/students", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }
  const filter = String(req.query.filter ?? "all");

  const rows = await db
    .select({
      enrollmentId: demoBatchEnrollmentsTable.id,
      studentId: demoBatchEnrollmentsTable.studentId,
      enrolledAt: demoBatchEnrollmentsTable.enrolledAt,
      enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
      lastDayAttended: demoBatchEnrollmentsTable.lastDayAttended,
      assignedMentorId: demoBatchEnrollmentsTable.assignedMentorId,
      assignedMentorName: demoBatchEnrollmentsTable.assignedMentorName,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      grade: usersTable.grade,
      school: usersTable.school,
      city: usersTable.city,
      callStatus: usersTable.callStatus,
      interestLevel: usersTable.interestLevel,
      leadStage: usersTable.leadStage,
      nextFollowUpAt: usersTable.nextFollowUpAt,
      lastCallAt: usersTable.lastCallAt,
      repeatedCustomer: usersTable.repeatedCustomer,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(usersTable, eq(demoBatchEnrollmentsTable.studentId, usersTable.id))
    .where(eq(demoBatchEnrollmentsTable.batchId, batchId))
    .orderBy(desc(demoBatchEnrollmentsTable.enrolledAt));

  // Filter by day or status
  const filtered = filter === "all" ? rows
    : filter === "converted" ? rows.filter(r => r.enrollmentStatus === "converted")
    : filter === "dropped" ? rows.filter(r => r.enrollmentStatus === "dropped")
    : filter.startsWith("day") ? (() => {
        const day = parseInt(filter.replace("day", ""));
        return rows.filter(r => (r.lastDayAttended ?? 0) >= day);
      })()
    : rows;

  res.json(filtered);
});

// ── Admin: Mentor Tracking ────────────────────────────────────

router.get("/admin/demo-batches/:batchId/mentor-tracking", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }

  const [batch] = await db.select({ totalDays: demoBatchesTable.totalDays })
    .from(demoBatchesTable).where(eq(demoBatchesTable.id, batchId));
  if (!batch) { res.status(404).json({ error: "Not found" }); return; }

  const rows = await db
    .select({
      enrollmentId: demoBatchEnrollmentsTable.id,
      studentId: demoBatchEnrollmentsTable.studentId,
      enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
      lastDayAttended: demoBatchEnrollmentsTable.lastDayAttended,
      assignedMentorId: demoBatchEnrollmentsTable.assignedMentorId,
      assignedMentorName: demoBatchEnrollmentsTable.assignedMentorName,
      name: usersTable.name,
      grade: usersTable.grade,
      school: usersTable.school,
      city: usersTable.city,
      phone: usersTable.phone,
      callStatus: usersTable.callStatus,
      interestLevel: usersTable.interestLevel,
      leadStage: usersTable.leadStage,
      nextFollowUpAt: usersTable.nextFollowUpAt,
      nextFollowUpTime: usersTable.nextFollowUpTime,
      lastCallAt: usersTable.lastCallAt,
      repeatedCustomer: usersTable.repeatedCustomer,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(usersTable, eq(demoBatchEnrollmentsTable.studentId, usersTable.id))
    .where(eq(demoBatchEnrollmentsTable.batchId, batchId))
    .orderBy(usersTable.name);

  const totalDays = batch.totalDays;
  const enriched = rows.map(r => ({
    ...r,
    attPct: totalDays > 0 ? Math.round(((r.lastDayAttended ?? 0) / totalDays) * 100) : 0,
  }));

  res.json(enriched);
});

// ── Admin: Update Enrollment Status ──────────────────────────

router.put("/admin/demo-batches/:batchId/enrollments/:enrollmentId/status", adminOnly, async (req, res) => {
  const enrollmentId = Number(req.params.enrollmentId);
  if (!enrollmentId) { res.status(400).json({ error: "Invalid enrollmentId" }); return; }
  const { status } = req.body as { status?: string };
  if (!status || !["active", "converted", "dropped"].includes(status)) {
    res.status(400).json({ error: "status must be active|converted|dropped" }); return;
  }
  const [row] = await db.update(demoBatchEnrollmentsTable)
    .set({ enrollmentStatus: status })
    .where(eq(demoBatchEnrollmentsTable.id, enrollmentId))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  // If converting to paid student, update user's leadStage
  if (status === "converted") {
    await db.update(usersTable)
      .set({ leadStage: "Converted", accountType: "paid_student" })
      .where(eq(usersTable.id, row.studentId));
  }
  res.json(row);
});

// ── Admin: Update Enrollment Attendance Day ───────────────────

router.put("/admin/demo-batches/:batchId/enrollments/:enrollmentId/attendance", adminOnly, async (req, res) => {
  const enrollmentId = Number(req.params.enrollmentId);
  if (!enrollmentId) { res.status(400).json({ error: "Invalid enrollmentId" }); return; }
  const { lastDayAttended } = req.body as { lastDayAttended?: number };
  if (lastDayAttended === undefined || lastDayAttended < 0) {
    res.status(400).json({ error: "lastDayAttended required" }); return;
  }
  const [row] = await db.update(demoBatchEnrollmentsTable)
    .set({ lastDayAttended })
    .where(eq(demoBatchEnrollmentsTable.id, enrollmentId))
    .returning();
  res.json(row);
});

// ── Admin: Assign Mentor to Enrollment ───────────────────────

router.put("/admin/demo-batches/:batchId/enrollments/:enrollmentId/mentor", adminOnly, async (req, res) => {
  const enrollmentId = Number(req.params.enrollmentId);
  if (!enrollmentId) { res.status(400).json({ error: "Invalid enrollmentId" }); return; }
  const { mentorId, mentorName } = req.body as { mentorId?: number; mentorName?: string };
  const [row] = await db.update(demoBatchEnrollmentsTable)
    .set({ assignedMentorId: mentorId ?? null, assignedMentorName: mentorName ?? null })
    .where(eq(demoBatchEnrollmentsTable.id, enrollmentId))
    .returning();
  res.json(row);
});

// ── Admin: Batch Analytics ────────────────────────────────────

router.get("/admin/demo-batches/:batchId/analytics", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }

  const enrollments = await db
    .select({
      enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
      grade: usersTable.grade,
      assignedMentorName: demoBatchEnrollmentsTable.assignedMentorName,
      interestLevel: usersTable.interestLevel,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(usersTable, eq(demoBatchEnrollmentsTable.studentId, usersTable.id))
    .where(eq(demoBatchEnrollmentsTable.batchId, batchId));

  // By grade
  const gradeMap = new Map<number, { total: number; converted: number }>();
  for (const e of enrollments) {
    const g = e.grade ?? 0;
    if (!gradeMap.has(g)) gradeMap.set(g, { total: 0, converted: 0 });
    const gd = gradeMap.get(g)!;
    gd.total++;
    if (e.enrollmentStatus === "converted") gd.converted++;
  }
  const byGrade = Array.from(gradeMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([grade, d]) => ({
      grade,
      total: d.total,
      converted: d.converted,
      pct: d.total > 0 ? Math.round((d.converted / d.total) * 100) : 0,
    }));

  // By mentor
  const mentorMap = new Map<string, { total: number; converted: number }>();
  for (const e of enrollments) {
    const m = e.assignedMentorName ?? "Unassigned";
    if (!mentorMap.has(m)) mentorMap.set(m, { total: 0, converted: 0 });
    const md = mentorMap.get(m)!;
    md.total++;
    if (e.enrollmentStatus === "converted") md.converted++;
  }
  const byMentor = Array.from(mentorMap.entries())
    .map(([mentor, d]) => ({
      mentor,
      total: d.total,
      converted: d.converted,
      pct: d.total > 0 ? Math.round((d.converted / d.total) * 100) : 0,
    }))
    .sort((a, b) => b.converted - a.converted);

  // By interest level
  const interestMap = new Map<string, { total: number; converted: number }>();
  for (const e of enrollments) {
    const lvl = e.interestLevel ?? "Unknown";
    if (!interestMap.has(lvl)) interestMap.set(lvl, { total: 0, converted: 0 });
    const id = interestMap.get(lvl)!;
    id.total++;
    if (e.enrollmentStatus === "converted") id.converted++;
  }
  const byInterest = Array.from(interestMap.entries()).map(([level, d]) => ({
    level, total: d.total, converted: d.converted,
    pct: d.total > 0 ? Math.round((d.converted / d.total) * 100) : 0,
  }));

  res.json({ byGrade, byMentor, byInterest, total: enrollments.length });
});

// ── Demo Session CRUD ────────────────────────────────────────

router.get("/admin/demo-batches/:batchId/sessions", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }

  // New sessions live in live_classes (Approach B)
  const newSessions = await db
    .select()
    .from(liveClassesTable)
    .where(and(eq(liveClassesTable.igniteBatchId, batchId), eq(liveClassesTable.classType, "ignite")))
    .orderBy(liveClassesTable.dayNumber);

  // Historical sessions remain in demo_sessions (read-only)
  const historicalSessions = await db
    .select()
    .from(demoSessionsTable)
    .where(eq(demoSessionsTable.batchId, batchId))
    .orderBy(demoSessionsTable.dayNumber);

  const combined = [
    ...newSessions.map(s => lcToSessionShape(s, batchId)),
    ...historicalSessions.map(s => ({ ...s, sessionType: "demo_session" as const })),
  ].sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0));

  res.json(combined);
});

// Auto-generate 5 sessions for an existing batch (idempotent — deletes live_classes and recreates)
router.post("/admin/demo-batches/:batchId/generate-sessions", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }

  const [batch] = await db.select().from(demoBatchesTable).where(eq(demoBatchesTable.id, batchId));
  if (!batch) { res.status(404).json({ error: "Not found" }); return; }
  if (!batch.startDate) { res.status(400).json({ error: "Batch has no start date — set one in settings first" }); return; }

  // Clear only the new live_classes sessions — historical demo_sessions are untouched (read-only)
  await db.delete(liveClassesTable).where(
    and(eq(liveClassesTable.igniteBatchId, batchId), eq(liveClassesTable.classType, "ignite"))
  );

  const sessions: ReturnType<typeof lcToSessionShape>[] = [];
  for (let i = 0; i < DEFAULT_SESSION_TEMPLATE.length; i++) {
    const tpl = DEFAULT_SESSION_TEMPLATE[i];
    const [s] = await db.insert(liveClassesTable).values({
      classType: "ignite",
      igniteBatchId: batchId,
      title: `Day ${i + 1} – ${tpl.subject}`,
      dayNumber: i + 1,
      grade: batch.grade ?? 0,
      teacher: batch.teacherName ?? "",
      teacherId: batch.teacherId ?? undefined,
      scheduledAt: sessionDateForDay(batch.startDate, i),
      duration: 60,
      status: "upcoming",
    }).returning();
    sessions.push(lcToSessionShape(s, batchId));
  }

  const total = await countIgniteSessions(batchId);
  await db.update(demoBatchesTable).set({ totalDays: total }).where(eq(demoBatchesTable.id, batchId));

  res.json(sessions);
});

router.post("/admin/demo-batches/:batchId/sessions", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }
  const { title, description: _desc, subject, teacherName, dayNumber, scheduledAt, duration, joinUrl, recordingUrl, homeworkText, homeworkLink, bannerUrl, status } = req.body as {
    title?: string; description?: string; subject?: string; teacherName?: string;
    dayNumber?: number; scheduledAt?: string; duration?: number;
    joinUrl?: string; recordingUrl?: string; homeworkText?: string; homeworkLink?: string;
    bannerUrl?: string; status?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "Title required" }); return; }
  if (!scheduledAt) { res.status(400).json({ error: "Scheduled time required" }); return; }

  const [batch] = await db.select().from(demoBatchesTable).where(eq(demoBatchesTable.id, batchId)).limit(1);
  if (!batch) { res.status(404).json({ error: "Batch not found" }); return; }

  // Resolve teacherName → teacher_id
  let resolvedTeacherId: number | null = null;
  let resolvedTeacherName: string = teacherName?.trim() ?? "";
  if (teacherName?.trim()) {
    const [tUser] = await db.select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(sql`lower(${usersTable.name}) = lower(${teacherName.trim()})`);
    if (tUser) {
      resolvedTeacherId = tUser.id;
      resolvedTeacherName = tUser.name;
      await db.update(demoBatchesTable).set({ teacherId: resolvedTeacherId }).where(eq(demoBatchesTable.id, batchId));
    }
  }

  // Use subject in title if provided separately and not already in title
  const finalTitle = subject?.trim() && !title.trim().toLowerCase().includes(subject.trim().toLowerCase())
    ? `${title.trim()} – ${subject.trim()}`
    : title.trim();

  const [row] = await db.insert(liveClassesTable).values({
    classType: "ignite",
    igniteBatchId: batchId,
    title: finalTitle,
    dayNumber: dayNumber ?? 1,
    grade: batch.grade ?? 0,
    teacher: resolvedTeacherName,
    teacherId: resolvedTeacherId ?? undefined,
    scheduledAt: new Date(scheduledAt),
    duration: duration ?? 60,
    status: status === "live" ? "live" : status === "completed" ? "completed" : "upcoming",
    joinUrl: joinUrl?.trim() ?? null,
    recordingUrl: recordingUrl?.trim() ?? null,
    homeworkText: homeworkText?.trim() ?? null,
    homeworkLink: homeworkLink?.trim() ?? null,
    thumbnailUrl: bannerUrl?.trim() ?? null,
  }).returning();

  const total = await countIgniteSessions(batchId);
  await db.update(demoBatchesTable).set({ totalDays: total }).where(eq(demoBatchesTable.id, batchId));

  res.json(lcToSessionShape(row, batchId));
});

router.put("/admin/demo-batches/:batchId/sessions/:sessionId", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  const sessionId = Number(req.params.sessionId);
  if (!sessionId) { res.status(400).json({ error: "Invalid sessionId" }); return; }

  // Only new live_classes sessions can be updated — historical demo_sessions are read-only
  const [existing] = await db
    .select({ id: liveClassesTable.id })
    .from(liveClassesTable)
    .where(and(
      eq(liveClassesTable.id, sessionId),
      eq(liveClassesTable.igniteBatchId, batchId),
      eq(liveClassesTable.classType, "ignite"),
    ))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Session not found (historical sessions from demo_sessions are read-only)" });
    return;
  }

  const { title, subject, teacherName, dayNumber, scheduledAt, duration, joinUrl, recordingUrl, homeworkText, homeworkLink, bannerUrl, status, isPublished } = req.body as Record<string, unknown>;
  const updates: Partial<typeof liveClassesTable.$inferInsert> = {};

  if (title !== undefined) updates.title = String(title).trim();
  if (dayNumber !== undefined) updates.dayNumber = Number(dayNumber);
  if (scheduledAt !== undefined) updates.scheduledAt = new Date(String(scheduledAt));
  if (duration !== undefined) updates.duration = Number(duration);
  if (joinUrl !== undefined) updates.joinUrl = String(joinUrl).trim();
  if (recordingUrl !== undefined) updates.recordingUrl = String(recordingUrl).trim();
  if (homeworkText !== undefined) updates.homeworkText = String(homeworkText).trim();
  if (homeworkLink !== undefined) updates.homeworkLink = String(homeworkLink).trim();
  if (bannerUrl !== undefined) updates.thumbnailUrl = String(bannerUrl).trim();
  if (isPublished !== undefined) updates.isPublished = Boolean(isPublished);
  if (status !== undefined) {
    // Normalize: admin UI may send "scheduled" — map to "upcoming" for live_classes
    const s = String(status);
    updates.status = s === "scheduled" ? "upcoming" : s;
  }
  // Append subject to title if provided and not already embedded
  if (subject !== undefined) {
    const subj = String(subject).trim();
    const currentTitle = updates.title ?? "";
    if (subj && currentTitle && !currentTitle.toLowerCase().includes(subj.toLowerCase())) {
      updates.title = `${currentTitle} – ${subj}`;
    }
  }

  // Resolve teacherName → teacher_id
  if (teacherName !== undefined) {
    const tName = String(teacherName).trim();
    if (tName) {
      const [tUser] = await db.select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable)
        .where(sql`lower(${usersTable.name}) = lower(${tName})`);
      if (tUser) {
        updates.teacherId = tUser.id;
        updates.teacher = tUser.name;
        await db.update(demoBatchesTable).set({ teacherId: tUser.id }).where(eq(demoBatchesTable.id, batchId));
      } else {
        updates.teacher = tName;
      }
    } else {
      updates.teacherId = null;
      updates.teacher = "";
    }
  }

  const [row] = await db.update(liveClassesTable).set(updates).where(eq(liveClassesTable.id, sessionId)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(lcToSessionShape(row, batchId));
});

router.delete("/admin/demo-batches/:batchId/sessions/:sessionId", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  const sessionId = Number(req.params.sessionId);
  if (!sessionId) { res.status(400).json({ error: "Invalid sessionId" }); return; }

  // Try live_classes (new sessions) first
  const [lcSession] = await db
    .select({ id: liveClassesTable.id })
    .from(liveClassesTable)
    .where(and(
      eq(liveClassesTable.id, sessionId),
      eq(liveClassesTable.igniteBatchId, batchId),
      eq(liveClassesTable.classType, "ignite"),
    ))
    .limit(1);

  if (lcSession) {
    await db.delete(liveClassesTable).where(eq(liveClassesTable.id, sessionId));
  } else {
    // Fall back to historical demo_session (admin cleanup of old data)
    await db.delete(demoSessionsTable).where(eq(demoSessionsTable.id, sessionId));
  }

  if (batchId) {
    const total = await countIgniteSessions(batchId);
    await db.update(demoBatchesTable).set({ totalDays: total }).where(eq(demoBatchesTable.id, batchId));
  }

  res.json({ success: true });
});

// ── Admin: Enrollment CRUD ────────────────────────────────────

router.get("/admin/demo-batches/:batchId/enrollments", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }
  const rows = await db
    .select({
      enrollmentId: demoBatchEnrollmentsTable.id,
      studentId: demoBatchEnrollmentsTable.studentId,
      enrolledAt: demoBatchEnrollmentsTable.enrolledAt,
      enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
      lastDayAttended: demoBatchEnrollmentsTable.lastDayAttended,
      assignedMentorName: demoBatchEnrollmentsTable.assignedMentorName,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      grade: usersTable.grade,
      school: usersTable.school,
      repeatedCustomer: usersTable.repeatedCustomer,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(usersTable, eq(demoBatchEnrollmentsTable.studentId, usersTable.id))
    .where(eq(demoBatchEnrollmentsTable.batchId, batchId))
    .orderBy(desc(demoBatchEnrollmentsTable.enrolledAt));
  res.json(rows);
});

router.post("/admin/demo-batches/:batchId/enrollments/bulk", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }

  const { rows } = req.body as {
    rows: { name: string; email?: string; phone?: string; grade?: number }[];
  };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows[] required" }); return;
  }

  const results = { created: 0, skipped: 0, enrolled: 0, errors: [] as string[] };

  for (const row of rows) {
    if (!row.name?.trim()) { results.errors.push(`Row missing name: ${JSON.stringify(row)}`); continue; }
    if (!row.email?.trim() && !row.phone?.trim()) {
      results.errors.push(`${row.name}: needs email or phone`); continue;
    }

    let userId: number | null = null;

    if (row.email?.trim()) {
      const [ex] = await db.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.email, row.email.trim())).limit(1);
      if (ex) { userId = ex.id; results.skipped++; }
    }
    if (userId === null && row.phone?.trim()) {
      const [ex] = await db.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.phone, row.phone.trim())).limit(1);
      if (ex) { userId = ex.id; results.skipped++; }
    }

    if (userId === null) {
      const pwd = (row.phone ?? row.email ?? row.name).slice(-6);
      try {
        const [user] = await db.insert(usersTable).values({
          name: row.name.trim(),
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          passwordHash: hashPassword(pwd),
          role: "student",
          accountType: "demo_student",
          grade: row.grade ?? 0,
        }).returning({ id: usersTable.id });
        userId = user.id;
        results.created++;
      } catch {
        results.errors.push(`${row.name}: account creation failed (duplicate?)`); continue;
      }
    }

    const [existing] = await db.select({ id: demoBatchEnrollmentsTable.id })
      .from(demoBatchEnrollmentsTable)
      .where(and(eq(demoBatchEnrollmentsTable.batchId, batchId), eq(demoBatchEnrollmentsTable.studentId, userId)))
      .limit(1);
    if (!existing) {
      await db.insert(demoBatchEnrollmentsTable).values({ batchId, studentId: userId });
      results.enrolled++;
    }
  }

  res.json(results);
});

router.post("/admin/demo-batches/:batchId/enrollments", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }
  const { studentId } = req.body as { studentId?: number };
  if (!studentId) { res.status(400).json({ error: "studentId required" }); return; }
  const [student] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, studentId)).limit(1);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  const existing = await db.select().from(demoBatchEnrollmentsTable)
    .where(and(eq(demoBatchEnrollmentsTable.batchId, batchId), eq(demoBatchEnrollmentsTable.studentId, studentId)))
    .limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Already enrolled" }); return; }
  const [row] = await db.insert(demoBatchEnrollmentsTable).values({ batchId, studentId }).returning();
  res.json(row);
});

router.delete("/admin/demo-batches/:batchId/enrollments/:enrollmentId", adminOnly, async (req, res) => {
  const enrollmentId = Number(req.params.enrollmentId);
  if (!enrollmentId) { res.status(400).json({ error: "Invalid enrollmentId" }); return; }
  await db.delete(demoBatchEnrollmentsTable).where(eq(demoBatchEnrollmentsTable.id, enrollmentId));
  res.json({ success: true });
});

// ── Student: My Demo Batches ─────────────────────────────────

router.get("/student/my-demo-batches", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;
  const enrollments = await db
    .select({ batchId: demoBatchEnrollmentsTable.batchId })
    .from(demoBatchEnrollmentsTable)
    .where(eq(demoBatchEnrollmentsTable.studentId, studentId));

  if (enrollments.length === 0) { res.json([]); return; }

  const batchIds = enrollments.map(e => e.batchId);
  const result: { batch: typeof demoBatchesTable.$inferSelect; sessions: unknown[] }[] = [];

  for (const batchId of batchIds) {
    const [batch] = await db.select().from(demoBatchesTable).where(eq(demoBatchesTable.id, batchId)).limit(1);
    if (!batch) continue;

    // Historical sessions (pre-migration, stored in demo_sessions)
    const historicalSessions = await db.select().from(demoSessionsTable)
      .where(and(eq(demoSessionsTable.batchId, batchId), eq(demoSessionsTable.isPublished, true)))
      .orderBy(demoSessionsTable.dayNumber);

    // New Ignite sessions (post-migration, stored in live_classes with igniteBatchId)
    const igniteSessions = await db.select().from(liveClassesTable)
      .where(and(
        eq(liveClassesTable.igniteBatchId, batchId),
        eq(liveClassesTable.classType, "ignite"),
        eq(liveClassesTable.isPublished, true),
        eq(liveClassesTable.isArchived, false),
      ))
      .orderBy(liveClassesTable.dayNumber);

    const combined = [
      ...historicalSessions.map(s => ({ ...s, sessionType: "demo_session" as const, slideUrl: null })),
      ...igniteSessions.map(s => lcToSessionShape(s, batchId)),
    ].sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0));

    result.push({ batch, sessions: combined });
  }
  res.json(result);
});

export default router;
