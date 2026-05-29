import { Router } from "express";
import { db } from "@workspace/db";
import {
  academicYearsTable,
  chaptersTable,
  topicsTable,
  subjectsTable,
  courseSubjectsTable,
  coursesTable,
  liveClassesTable,
  homeworkTable,
  assignmentsTable,
  testsTable,
  recordingsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const adminOnly = requireRole("admin");
const staffOnly = requireRole("admin", "teacher");

// ── Academic Years ───────────────────────────────────────────────

router.get("/admin/academic-years", adminOnly, async (_req, res) => {
  const rows = await db.select().from(academicYearsTable).orderBy(academicYearsTable.name);
  res.json(rows);
});

router.post("/admin/academic-years", adminOnly, async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }
  const [row] = await db.insert(academicYearsTable).values({ name: name.trim() }).returning();
  res.json(row);
});

router.put("/admin/academic-years/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  const { name, isActive } = req.body as { name?: string; isActive?: boolean };
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const updates: Partial<typeof academicYearsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name.trim();
  if (isActive !== undefined) updates.isActive = isActive;
  const [row] = await db.update(academicYearsTable).set(updates).where(eq(academicYearsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/admin/academic-years/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(academicYearsTable).where(eq(academicYearsTable.id, id));
  res.json({ success: true });
});

// ── Course Subjects (subjects inside a specific course) ───────────

router.get("/admin/course-subjects", staffOnly, async (req, res) => {
  const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
  if (!courseId) { res.status(400).json({ error: "courseId is required" }); return; }
  const rows = await db
    .select()
    .from(courseSubjectsTable)
    .where(eq(courseSubjectsTable.courseId, courseId))
    .orderBy(courseSubjectsTable.name);
  res.json(rows.map(r => ({
    ...r,
    description: r.description ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    subjectCode: `SUB${String(r.id).padStart(4, "0")}`,
  })));
});

router.post("/admin/course-subjects", adminOnly, async (req, res) => {
  const { courseId, name, description, thumbnailUrl } =
    req.body as { courseId?: number; name?: string; description?: string; thumbnailUrl?: string };
  if (!courseId || !name?.trim()) {
    res.status(400).json({ error: "courseId and name are required" });
    return;
  }
  const [row] = await db
    .insert(courseSubjectsTable)
    .values({ courseId, name: name.trim(), description: description?.trim() ?? null, thumbnailUrl: thumbnailUrl?.trim() ?? null })
    .returning();
  res.json({ ...row, subjectCode: `SUB${String(row.id).padStart(4, "0")}` });
});

router.put("/admin/course-subjects/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, thumbnailUrl } = req.body as { name?: string; description?: string; thumbnailUrl?: string };
  const updates: Partial<typeof courseSubjectsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim() || null;
  if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl.trim() || null;
  const [row] = await db.update(courseSubjectsTable).set(updates).where(eq(courseSubjectsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, subjectCode: `SUB${String(row.id).padStart(4, "0")}` });
});

router.delete("/admin/course-subjects/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const chaps = await db.select({ id: chaptersTable.id }).from(chaptersTable).where(eq(chaptersTable.courseSubjectId, id));
  for (const ch of chaps) {
    await db.delete(topicsTable).where(eq(topicsTable.chapterId, ch.id));
  }
  await db.delete(chaptersTable).where(eq(chaptersTable.courseSubjectId, id));
  await db.delete(courseSubjectsTable).where(eq(courseSubjectsTable.id, id));
  res.json({ success: true });
});

// ── Chapters ─────────────────────────────────────────────────────

router.get("/admin/chapters", staffOnly, async (req, res) => {
  const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
  const courseSubjectId = req.query.courseSubjectId ? Number(req.query.courseSubjectId) : undefined;
  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
  const grade = req.query.grade ? Number(req.query.grade) : undefined;

  const rows = await db
    .select({
      id: chaptersTable.id,
      subjectId: chaptersTable.subjectId,
      subjectName: subjectsTable.name,
      grade: chaptersTable.grade,
      courseId: chaptersTable.courseId,
      courseSubjectId: chaptersTable.courseSubjectId,
      name: chaptersTable.name,
      description: chaptersTable.description,
      order: chaptersTable.order,
      sequenceNo: chaptersTable.sequenceNo,
      createdAt: chaptersTable.createdAt,
    })
    .from(chaptersTable)
    .leftJoin(subjectsTable, eq(chaptersTable.subjectId, subjectsTable.id))
    .where(and(
      courseId ? eq(chaptersTable.courseId, courseId) : undefined,
      courseSubjectId ? eq(chaptersTable.courseSubjectId, courseSubjectId) : undefined,
      subjectId ? eq(chaptersTable.subjectId, subjectId) : undefined,
      grade ? eq(chaptersTable.grade, grade) : undefined,
    ))
    .orderBy(chaptersTable.order, chaptersTable.name);

  res.json(rows.map(r => ({
    ...r,
    description: r.description ?? null,
    courseId: r.courseId ?? null,
    courseSubjectId: r.courseSubjectId ?? null,
    subjectName: r.subjectName ?? null,
    chapterCode: `CHP${String(r.id).padStart(4, "0")}`,
  })));
});

router.post("/admin/chapters", adminOnly, async (req, res) => {
  const { subjectId, grade, courseId, courseSubjectId, name, description, order, sequenceNo } =
    req.body as { subjectId?: number; grade?: number; courseId?: number; courseSubjectId?: number; name?: string; description?: string; order?: number; sequenceNo?: number };

  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  if (!courseSubjectId && !subjectId) { res.status(400).json({ error: "Either courseSubjectId or subjectId is required" }); return; }

  let resolvedGrade = grade;
  if (!resolvedGrade && courseId) {
    const [course] = await db.select({ grade: coursesTable.grade }).from(coursesTable).where(eq(coursesTable.id, courseId));
    if (course) resolvedGrade = course.grade;
  }
  if (!resolvedGrade) resolvedGrade = 1;

  const [row] = await db
    .insert(chaptersTable)
    .values({
      subjectId: subjectId ?? null,
      grade: resolvedGrade,
      courseId: courseId ?? null,
      courseSubjectId: courseSubjectId ?? null,
      name: name.trim(),
      description: description?.trim() ?? null,
      order: order ?? 0,
      sequenceNo: sequenceNo ?? null,
    })
    .returning();
  res.json({ ...row, chapterCode: `CHP${String(row.id).padStart(4, "0")}` });
});

router.put("/admin/chapters/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, order, sequenceNo } = req.body as { name?: string; description?: string; order?: number; sequenceNo?: number };
  const updates: Partial<typeof chaptersTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim() || null;
  if (order !== undefined) updates.order = order;
  if (sequenceNo !== undefined) updates.sequenceNo = sequenceNo;
  const [row] = await db.update(chaptersTable).set(updates).where(eq(chaptersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, chapterCode: `CHP${String(row.id).padStart(4, "0")}` });
});

router.delete("/admin/chapters/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(topicsTable).where(eq(topicsTable.chapterId, id));
  await db.delete(chaptersTable).where(eq(chaptersTable.id, id));
  res.json({ success: true });
});

// ── Topics ───────────────────────────────────────────────────────

router.get("/admin/topics", staffOnly, async (req, res) => {
  const chapterId = req.query.chapterId ? Number(req.query.chapterId) : undefined;
  const rows = await db
    .select()
    .from(topicsTable)
    .where(chapterId ? eq(topicsTable.chapterId, chapterId) : undefined)
    .orderBy(topicsTable.order, topicsTable.name);
  res.json(rows.map(r => ({
    ...r,
    description: r.description ?? null,
    learningObjective: r.learningObjective ?? null,
    topicCode: `TOP${String(r.id).padStart(4, "0")}`,
  })));
});

router.post("/admin/topics", adminOnly, async (req, res) => {
  const { chapterId, name, description, learningObjective, topicStatus, order, sequenceNo } =
    req.body as { chapterId?: number; name?: string; description?: string; learningObjective?: string; topicStatus?: string; order?: number; sequenceNo?: number };
  if (!chapterId || !name?.trim()) { res.status(400).json({ error: "chapterId and name are required" }); return; }
  const [row] = await db
    .insert(topicsTable)
    .values({
      chapterId,
      name: name.trim(),
      description: description?.trim() ?? null,
      learningObjective: learningObjective?.trim() ?? null,
      topicStatus: topicStatus ?? "active",
      order: order ?? 0,
      sequenceNo: sequenceNo ?? null,
    })
    .returning();
  res.json({ ...row, topicCode: `TOP${String(row.id).padStart(4, "0")}` });
});

router.put("/admin/topics/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, learningObjective, topicStatus, order, sequenceNo } =
    req.body as { name?: string; description?: string; learningObjective?: string; topicStatus?: string; order?: number; sequenceNo?: number };
  const updates: Partial<typeof topicsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim() || null;
  if (learningObjective !== undefined) updates.learningObjective = learningObjective.trim() || null;
  if (topicStatus !== undefined) updates.topicStatus = topicStatus;
  if (order !== undefined) updates.order = order;
  if (sequenceNo !== undefined) updates.sequenceNo = sequenceNo;
  const [row] = await db.update(topicsTable).set(updates).where(eq(topicsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, topicCode: `TOP${String(row.id).padStart(4, "0")}` });
});

router.delete("/admin/topics/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(topicsTable).where(eq(topicsTable.id, id));
  res.json({ success: true });
});

// ── Topic content summary ────────────────────────────────────────

router.get("/admin/topic-content/:topicId", adminOnly, async (req, res) => {
  const topicId = Number(req.params.topicId);
  if (!topicId) { res.status(400).json({ error: "Invalid topicId" }); return; }
  const [lcCount] = await db.select({ count: sql<number>`count(*)` }).from(liveClassesTable).where(eq(liveClassesTable.topicId, topicId));
  const [hwCount] = await db.select({ count: sql<number>`count(*)` }).from(homeworkTable).where(eq(homeworkTable.topicId, topicId));
  const [asgnCount] = await db.select({ count: sql<number>`count(*)` }).from(assignmentsTable).where(eq(assignmentsTable.topicId, topicId));
  const [testCount] = await db.select({ count: sql<number>`count(*)` }).from(testsTable).where(eq(testsTable.topicId, topicId));
  const [recCount] = await db.select({ count: sql<number>`count(*)` }).from(recordingsTable).where(eq(recordingsTable.topicId, topicId));
  res.json({
    liveClasses: Number(lcCount?.count ?? 0),
    homework: Number(hwCount?.count ?? 0),
    assignments: Number(asgnCount?.count ?? 0),
    tests: Number(testCount?.count ?? 0),
    recordings: Number(recCount?.count ?? 0),
  });
});

// ── Public read routes (student / teacher) ───────────────────────

router.get("/chapters", async (req, res) => {
  const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
  const courseSubjectId = req.query.courseSubjectId ? Number(req.query.courseSubjectId) : undefined;
  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
  const grade = req.query.grade ? Number(req.query.grade) : undefined;

  const rows = await db
    .select({
      id: chaptersTable.id,
      subjectId: chaptersTable.subjectId,
      subjectName: subjectsTable.name,
      grade: chaptersTable.grade,
      courseId: chaptersTable.courseId,
      courseSubjectId: chaptersTable.courseSubjectId,
      name: chaptersTable.name,
      description: chaptersTable.description,
      order: chaptersTable.order,
    })
    .from(chaptersTable)
    .leftJoin(subjectsTable, eq(chaptersTable.subjectId, subjectsTable.id))
    .where(and(
      courseId ? eq(chaptersTable.courseId, courseId) : undefined,
      courseSubjectId ? eq(chaptersTable.courseSubjectId, courseSubjectId) : undefined,
      subjectId ? eq(chaptersTable.subjectId, subjectId) : undefined,
      grade ? eq(chaptersTable.grade, grade) : undefined,
    ))
    .orderBy(chaptersTable.order);

  res.json(rows.map(r => ({
    ...r,
    description: r.description ?? null,
    courseId: r.courseId ?? null,
    courseSubjectId: r.courseSubjectId ?? null,
    subjectName: r.subjectName ?? null,
  })));
});

router.get("/course-subjects", async (req, res) => {
  const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
  if (!courseId) { res.status(400).json({ error: "courseId is required" }); return; }
  const rows = await db
    .select()
    .from(courseSubjectsTable)
    .where(eq(courseSubjectsTable.courseId, courseId))
    .orderBy(courseSubjectsTable.name);
  res.json(rows.map(r => ({
    ...r,
    description: r.description ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    subjectCode: `SUB${String(r.id).padStart(4, "0")}`,
  })));
});

router.get("/topics", async (req, res) => {
  const chapterId = req.query.chapterId ? Number(req.query.chapterId) : undefined;
  const rows = await db
    .select()
    .from(topicsTable)
    .where(chapterId ? eq(topicsTable.chapterId, chapterId) : undefined)
    .orderBy(topicsTable.order);
  res.json(rows.map(r => ({ ...r, description: r.description ?? null })));
});

export default router;
