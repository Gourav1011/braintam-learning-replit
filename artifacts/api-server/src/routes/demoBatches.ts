import { Router } from "express";
import { db } from "@workspace/db";
import { demoBatchesTable, demoSessionsTable, demoBatchEnrollmentsTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireRole, requireAuth } from "../middlewares/auth.js";

const router = Router();
const adminOnly = requireRole("admin");
const staffOnly = requireRole("teacher");

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

// ── Admin routes ─────────────────────────────────────────────

router.get("/admin/demo-batches", adminOnly, async (_req, res) => {
  const batches = await db
    .select()
    .from(demoBatchesTable)
    .orderBy(desc(demoBatchesTable.createdAt));
  res.json(batches);
});

router.post("/admin/demo-batches", adminOnly, async (req, res) => {
  const { title, description, teacherName, bannerUrl, joinLink, startDate, endDate, grade, subject, totalDays, isPublic } = req.body as {
    title?: string; description?: string; teacherName?: string; bannerUrl?: string;
    joinLink?: string; startDate?: string; endDate?: string; grade?: number;
    subject?: string; totalDays?: number; isPublic?: boolean;
  };
  if (!title?.trim()) { res.status(400).json({ error: "Title required" }); return; }
  const [row] = await db.insert(demoBatchesTable).values({
    title: title.trim(),
    description: description?.trim(),
    teacherName: teacherName?.trim(),
    bannerUrl: bannerUrl?.trim(),
    joinLink: joinLink?.trim(),
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    grade: grade ?? undefined,
    subject: subject?.trim(),
    totalDays: totalDays ?? 5,
    isPublic: isPublic ?? true,
  }).returning();
  res.json(row);
});

router.put("/admin/demo-batches/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { title, description, teacherName, bannerUrl, joinLink, startDate, endDate, grade, subject, totalDays, isPublic, isActive, status } = req.body as Record<string, unknown>;
  const updates: Partial<typeof demoBatchesTable.$inferInsert> = {};
  if (title !== undefined) updates.title = String(title).trim();
  if (description !== undefined) updates.description = String(description).trim();
  if (teacherName !== undefined) updates.teacherName = String(teacherName).trim();
  if (bannerUrl !== undefined) updates.bannerUrl = String(bannerUrl).trim();
  if (joinLink !== undefined) updates.joinLink = String(joinLink).trim();
  if (startDate !== undefined) updates.startDate = new Date(String(startDate));
  if (endDate !== undefined) updates.endDate = new Date(String(endDate));
  if (grade !== undefined) updates.grade = Number(grade);
  if (subject !== undefined) updates.subject = String(subject).trim();
  if (totalDays !== undefined) updates.totalDays = Number(totalDays);
  if (isPublic !== undefined) updates.isPublic = Boolean(isPublic);
  if (isActive !== undefined) updates.isActive = Boolean(isActive);
  if (status !== undefined) updates.status = String(status);
  const [row] = await db.update(demoBatchesTable).set(updates).where(eq(demoBatchesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/admin/demo-batches/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(demoSessionsTable).where(eq(demoSessionsTable.batchId, id));
  await db.delete(demoBatchesTable).where(eq(demoBatchesTable.id, id));
  res.json({ success: true });
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

router.post("/admin/demo-batches/:batchId/sessions", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }
  const { title, description, dayNumber, scheduledAt, duration, joinUrl, recordingUrl, homeworkText, bannerUrl } = req.body as {
    title?: string; description?: string; dayNumber?: number; scheduledAt?: string;
    duration?: number; joinUrl?: string; recordingUrl?: string; homeworkText?: string; bannerUrl?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "Title required" }); return; }
  if (!scheduledAt) { res.status(400).json({ error: "Scheduled time required" }); return; }
  const [row] = await db.insert(demoSessionsTable).values({
    batchId,
    title: title.trim(),
    description: description?.trim(),
    dayNumber: dayNumber ?? 1,
    scheduledAt: new Date(scheduledAt),
    duration: duration ?? 60,
    joinUrl: joinUrl?.trim(),
    recordingUrl: recordingUrl?.trim(),
    homeworkText: homeworkText?.trim(),
    bannerUrl: bannerUrl?.trim(),
  }).returning();
  res.json(row);
});

router.put("/admin/demo-batches/:batchId/sessions/:sessionId", adminOnly, async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  if (!sessionId) { res.status(400).json({ error: "Invalid sessionId" }); return; }
  const { title, description, dayNumber, scheduledAt, duration, joinUrl, recordingUrl, homeworkText, bannerUrl, status, isPublished } = req.body as Record<string, unknown>;
  const updates: Partial<typeof demoSessionsTable.$inferInsert> = {};
  if (title !== undefined) updates.title = String(title).trim();
  if (description !== undefined) updates.description = String(description).trim();
  if (dayNumber !== undefined) updates.dayNumber = Number(dayNumber);
  if (scheduledAt !== undefined) updates.scheduledAt = new Date(String(scheduledAt));
  if (duration !== undefined) updates.duration = Number(duration);
  if (joinUrl !== undefined) updates.joinUrl = String(joinUrl).trim();
  if (recordingUrl !== undefined) updates.recordingUrl = String(recordingUrl).trim();
  if (homeworkText !== undefined) updates.homeworkText = String(homeworkText).trim();
  if (bannerUrl !== undefined) updates.bannerUrl = String(bannerUrl).trim();
  if (status !== undefined) updates.status = String(status);
  if (isPublished !== undefined) updates.isPublished = Boolean(isPublished);
  const [row] = await db.update(demoSessionsTable).set(updates).where(eq(demoSessionsTable.id, sessionId)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/admin/demo-batches/:batchId/sessions/:sessionId", adminOnly, async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  if (!sessionId) { res.status(400).json({ error: "Invalid sessionId" }); return; }
  await db.delete(demoSessionsTable).where(eq(demoSessionsTable.id, sessionId));
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
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      grade: usersTable.grade,
      school: usersTable.school,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(usersTable, eq(demoBatchEnrollmentsTable.studentId, usersTable.id))
    .where(eq(demoBatchEnrollmentsTable.batchId, batchId))
    .orderBy(desc(demoBatchEnrollmentsTable.enrolledAt));
  res.json(rows);
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
