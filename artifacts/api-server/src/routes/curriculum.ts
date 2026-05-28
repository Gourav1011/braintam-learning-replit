import { Router } from "express";
import { db } from "@workspace/db";
import {
  academicYearsTable,
  chaptersTable,
  topicsTable,
  subjectsTable,
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

// ── Academic Years ───────────────────────────────────────────────

router.get("/admin/academic-years", adminOnly, async (_req, res) => {
  const rows = await db
    .select()
    .from(academicYearsTable)
    .orderBy(academicYearsTable.name);
  res.json(rows);
});

router.post("/admin/academic-years", adminOnly, async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [row] = await db
    .insert(academicYearsTable)
    .values({ name: name.trim() })
    .returning();
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

// ── Chapters ─────────────────────────────────────────────────────

router.get("/admin/chapters", adminOnly, async (req, res) => {
  const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;
  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
  const grade = req.query.grade ? Number(req.query.grade) : undefined;

  const rows = await db
    .select({
      id: chaptersTable.id,
      subjectId: chaptersTable.subjectId,
      subjectName: subjectsTable.name,
      grade: chaptersTable.grade,
      courseId: chaptersTable.courseId,
      name: chaptersTable.name,
      description: chaptersTable.description,
      order: chaptersTable.order,
      createdAt: chaptersTable.createdAt,
    })
    .from(chaptersTable)
    .innerJoin(subjectsTable, eq(chaptersTable.subjectId, subjectsTable.id))
    .where(
      and(
        courseId ? eq(chaptersTable.courseId, courseId) : undefined,
        subjectId ? eq(chaptersTable.subjectId, subjectId) : undefined,
        grade ? eq(chaptersTable.grade, grade) : undefined,
      )
    )
    .orderBy(chaptersTable.order, chaptersTable.name);

  res.json(rows.map(r => ({ ...r, description: r.description ?? null, courseId: r.courseId ?? null })));
});

router.post("/admin/chapters", adminOnly, async (req, res) => {
  const { subjectId, grade, courseId, name, description, order } =
    req.body as { subjectId?: number; grade?: number; courseId?: number; name?: string; description?: string; order?: number };
  if (!subjectId || !grade || !name?.trim()) {
    res.status(400).json({ error: "subjectId, grade, name are required" });
    return;
  }
  const [row] = await db
    .insert(chaptersTable)
    .values({
      subjectId,
      grade,
      courseId: courseId ?? null,
      name: name.trim(),
      description: description?.trim() ?? null,
      order: order ?? 0,
    })
    .returning();
  res.json(row);
});

router.put("/admin/chapters/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, order } = req.body as { name?: string; description?: string; order?: number };
  const updates: Partial<typeof chaptersTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim() || null;
  if (order !== undefined) updates.order = order;
  const [row] = await db.update(chaptersTable).set(updates).where(eq(chaptersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/admin/chapters/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(topicsTable).where(eq(topicsTable.chapterId, id));
  await db.delete(chaptersTable).where(eq(chaptersTable.id, id));
  res.json({ success: true });
});

// ── Topics ───────────────────────────────────────────────────────

router.get("/admin/topics", adminOnly, async (req, res) => {
  const chapterId = req.query.chapterId ? Number(req.query.chapterId) : undefined;
  const rows = await db
    .select()
    .from(topicsTable)
    .where(chapterId ? eq(topicsTable.chapterId, chapterId) : undefined)
    .orderBy(topicsTable.order, topicsTable.name);
  res.json(rows.map(r => ({ ...r, description: r.description ?? null })));
});

router.post("/admin/topics", adminOnly, async (req, res) => {
  const { chapterId, name, description, order } =
    req.body as { chapterId?: number; name?: string; description?: string; order?: number };
  if (!chapterId || !name?.trim()) {
    res.status(400).json({ error: "chapterId and name are required" });
    return;
  }
  const [row] = await db
    .insert(topicsTable)
    .values({
      chapterId,
      name: name.trim(),
      description: description?.trim() ?? null,
      order: order ?? 0,
    })
    .returning();
  res.json(row);
});

router.put("/admin/topics/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, order } = req.body as { name?: string; description?: string; order?: number };
  const updates: Partial<typeof topicsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim() || null;
  if (order !== undefined) updates.order = order;
  const [row] = await db.update(topicsTable).set(updates).where(eq(topicsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
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
  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
  const grade = req.query.grade ? Number(req.query.grade) : undefined;

  const rows = await db
    .select({
      id: chaptersTable.id,
      subjectId: chaptersTable.subjectId,
      subjectName: subjectsTable.name,
      grade: chaptersTable.grade,
      courseId: chaptersTable.courseId,
      name: chaptersTable.name,
      description: chaptersTable.description,
      order: chaptersTable.order,
    })
    .from(chaptersTable)
    .innerJoin(subjectsTable, eq(chaptersTable.subjectId, subjectsTable.id))
    .where(
      and(
        courseId ? eq(chaptersTable.courseId, courseId) : undefined,
        subjectId ? eq(chaptersTable.subjectId, subjectId) : undefined,
        grade ? eq(chaptersTable.grade, grade) : undefined,
      )
    )
    .orderBy(chaptersTable.order);

  res.json(rows.map(r => ({ ...r, description: r.description ?? null, courseId: r.courseId ?? null })));
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
