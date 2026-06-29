import { Router } from "express";
import { db } from "@workspace/db";
import { demoBatchesTable, demoSessionsTable, demoBatchEnrollmentsTable, usersTable } from "@workspace/db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { requireRole, requireAuth } from "../middlewares/auth.js";
import crypto from "crypto";

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(pw + "braintam_salt").digest("hex");
}

const router = Router();
const adminOnly = requireRole("admin");
const staffAuth = requireRole("teacher"); // mentor-level or above

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
  const sessions = await db
    .select()
    .from(demoSessionsTable)
    .where(eq(demoSessionsTable.batchId, id))
    .orderBy(demoSessionsTable.dayNumber);
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

  // Auto-generate 5 default sessions if startDate was provided
  const sessions: typeof demoSessionsTable.$inferSelect[] = [];
  if (parsedStart) {
    for (let i = 0; i < DEFAULT_SESSION_TEMPLATE.length; i++) {
      const tpl = DEFAULT_SESSION_TEMPLATE[i];
      const [s] = await db.insert(demoSessionsTable).values({
        batchId: row.id,
        title: `Day ${i + 1} – ${tpl.subject}`,
        subject: tpl.subject,
        dayNumber: i + 1,
        scheduledAt: sessionDateForDay(parsedStart, i),
        duration: 60,
        status: "scheduled",
      }).returning();
      sessions.push(s);
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

  // Cascade startDate change to all sessions
  if (startDate !== undefined && oldBatch.startDate) {
    const oldStart = oldBatch.startDate.getTime();
    const newStart = new Date(String(startDate)).getTime();
    const offsetMs = newStart - oldStart;
    if (offsetMs !== 0) {
      const sessions = await db
        .select({ id: demoSessionsTable.id, scheduledAt: demoSessionsTable.scheduledAt })
        .from(demoSessionsTable)
        .where(eq(demoSessionsTable.batchId, id));
      for (const s of sessions) {
        const newScheduledAt = new Date(s.scheduledAt.getTime() + offsetMs);
        await db.update(demoSessionsTable).set({ scheduledAt: newScheduledAt }).where(eq(demoSessionsTable.id, s.id));
      }
    }
  }

  res.json(row);
});

router.delete("/admin/demo-batches/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
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
  const sessions = await db
    .select()
    .from(demoSessionsTable)
    .where(eq(demoSessionsTable.batchId, batchId))
    .orderBy(demoSessionsTable.dayNumber);
  res.json(sessions);
});

// Auto-generate 5 sessions for an existing batch (idempotent — deletes and recreates)
router.post("/admin/demo-batches/:batchId/generate-sessions", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }

  const [batch] = await db.select().from(demoBatchesTable).where(eq(demoBatchesTable.id, batchId));
  if (!batch) { res.status(404).json({ error: "Not found" }); return; }
  if (!batch.startDate) { res.status(400).json({ error: "Batch has no start date — set one in settings first" }); return; }

  // Clear existing sessions then regenerate
  await db.delete(demoSessionsTable).where(eq(demoSessionsTable.batchId, batchId));

  const sessions: typeof demoSessionsTable.$inferSelect[] = [];
  for (let i = 0; i < DEFAULT_SESSION_TEMPLATE.length; i++) {
    const tpl = DEFAULT_SESSION_TEMPLATE[i];
    const [s] = await db.insert(demoSessionsTable).values({
      batchId,
      title: `Day ${i + 1} – ${tpl.subject}`,
      subject: tpl.subject,
      dayNumber: i + 1,
      scheduledAt: sessionDateForDay(batch.startDate, i),
      duration: 60,
      status: "scheduled",
    }).returning();
    sessions.push(s);
  }

  await db.update(demoBatchesTable)
    .set({ totalDays: sessions.length })
    .where(eq(demoBatchesTable.id, batchId));

  res.json(sessions);
});

router.post("/admin/demo-batches/:batchId/sessions", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }
  const { title, description, subject, teacherName, dayNumber, scheduledAt, duration, joinUrl, recordingUrl, homeworkText, homeworkLink, bannerUrl, status } = req.body as {
    title?: string; description?: string; subject?: string; teacherName?: string;
    dayNumber?: number; scheduledAt?: string; duration?: number;
    joinUrl?: string; recordingUrl?: string; homeworkText?: string; homeworkLink?: string;
    bannerUrl?: string; status?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "Title required" }); return; }
  if (!scheduledAt) { res.status(400).json({ error: "Scheduled time required" }); return; }

  // Resolve teacherName → teacher_id for assignment-based visibility
  let resolvedTeacherId: number | null = null;
  if (teacherName?.trim()) {
    const [tUser] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`lower(${usersTable.name}) = lower(${teacherName.trim()})`);
    if (tUser) {
      resolvedTeacherId = tUser.id;
      // Also set batch.teacher_id so teacher's batch list is correct
      await db.update(demoBatchesTable).set({ teacherId: resolvedTeacherId }).where(eq(demoBatchesTable.id, batchId));
    }
  }

  const [row] = await db.insert(demoSessionsTable).values({
    batchId,
    title: title.trim(),
    description: description?.trim(),
    subject: subject?.trim(),
    teacherName: teacherName?.trim(),
    dayNumber: dayNumber ?? 1,
    scheduledAt: new Date(scheduledAt),
    duration: duration ?? 60,
    joinUrl: joinUrl?.trim(),
    recordingUrl: recordingUrl?.trim(),
    homeworkText: homeworkText?.trim(),
    homeworkLink: homeworkLink?.trim(),
    bannerUrl: bannerUrl?.trim(),
    status: status ?? "scheduled",
  }).returning();

  // Update totalDays to reflect actual session count
  const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` })
    .from(demoSessionsTable).where(eq(demoSessionsTable.batchId, batchId));
  await db.update(demoBatchesTable).set({ totalDays: cnt }).where(eq(demoBatchesTable.id, batchId));

  res.json(row);
});

router.put("/admin/demo-batches/:batchId/sessions/:sessionId", adminOnly, async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  if (!sessionId) { res.status(400).json({ error: "Invalid sessionId" }); return; }
  const { title, description, subject, teacherName, dayNumber, scheduledAt, duration, joinUrl, recordingUrl, homeworkText, homeworkLink, bannerUrl, status, isPublished } = req.body as Record<string, unknown>;
  const updates: Partial<typeof demoSessionsTable.$inferInsert> = {};
  if (title !== undefined) updates.title = String(title).trim();
  if (description !== undefined) updates.description = String(description).trim();
  if (subject !== undefined) updates.subject = String(subject).trim();
  if (teacherName !== undefined) updates.teacherName = String(teacherName).trim();
  if (dayNumber !== undefined) updates.dayNumber = Number(dayNumber);
  if (scheduledAt !== undefined) updates.scheduledAt = new Date(String(scheduledAt));
  if (duration !== undefined) updates.duration = Number(duration);
  if (joinUrl !== undefined) updates.joinUrl = String(joinUrl).trim();
  if (recordingUrl !== undefined) updates.recordingUrl = String(recordingUrl).trim();
  if (homeworkText !== undefined) updates.homeworkText = String(homeworkText).trim();
  if (homeworkLink !== undefined) updates.homeworkLink = String(homeworkLink).trim();
  if (bannerUrl !== undefined) updates.bannerUrl = String(bannerUrl).trim();
  if (status !== undefined) updates.status = String(status);
  if (isPublished !== undefined) updates.isPublished = Boolean(isPublished);

  // Resolve teacherName → teacher_id and update batch assignment
  if (teacherName !== undefined && String(teacherName).trim()) {
    const tName = String(teacherName).trim();
    const [tUser] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`lower(${usersTable.name}) = lower(${tName})`);
    if (tUser) {
      const batchId = Number(req.params.batchId);
      await db.update(demoBatchesTable).set({ teacherId: tUser.id }).where(eq(demoBatchesTable.id, batchId));
    }
  }

  const [row] = await db.update(demoSessionsTable).set(updates).where(eq(demoSessionsTable.id, sessionId)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/admin/demo-batches/:batchId/sessions/:sessionId", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  const sessionId = Number(req.params.sessionId);
  if (!sessionId) { res.status(400).json({ error: "Invalid sessionId" }); return; }
  await db.delete(demoSessionsTable).where(eq(demoSessionsTable.id, sessionId));

  // Update totalDays to reflect actual session count
  if (batchId) {
    const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` })
      .from(demoSessionsTable).where(eq(demoSessionsTable.batchId, batchId));
    await db.update(demoBatchesTable).set({ totalDays: cnt }).where(eq(demoBatchesTable.id, batchId));
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
  const result: { batch: typeof demoBatchesTable.$inferSelect; sessions: typeof demoSessionsTable.$inferSelect[] }[] = [];

  for (const batchId of batchIds) {
    const [batch] = await db.select().from(demoBatchesTable).where(eq(demoBatchesTable.id, batchId)).limit(1);
    if (!batch) continue;
    const sessions = await db.select().from(demoSessionsTable)
      .where(and(eq(demoSessionsTable.batchId, batchId), eq(demoSessionsTable.isPublished, true)))
      .orderBy(demoSessionsTable.dayNumber);
    result.push({ batch, sessions });
  }
  res.json(result);
});

export default router;
