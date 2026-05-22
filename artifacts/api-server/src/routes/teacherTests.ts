import { Router } from "express";
import { db } from "@workspace/db";
import { testsTable, questionsTable, subjectsTable, teacherCoursesTable } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const teacherOrAdmin = requireRole("teacher", "admin");

async function getTeacherCourseIds(teacherId: number): Promise<number[]> {
  const rows = await db
    .select({ courseId: teacherCoursesTable.courseId })
    .from(teacherCoursesTable)
    .where(eq(teacherCoursesTable.teacherId, teacherId));
  return rows.map(r => r.courseId);
}

// ── List tests the teacher owns ───────────────────────────────
router.get("/teacher/tests", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const tests = await db.select({
    id: testsTable.id,
    title: testsTable.title,
    subjectId: testsTable.subjectId,
    subjectName: subjectsTable.name,
    grade: testsTable.grade,
    courseId: testsTable.courseId,
    scheduledAt: testsTable.scheduledAt,
    duration: testsTable.duration,
    totalQuestions: testsTable.totalQuestions,
    status: testsTable.status,
  })
    .from(testsTable)
    .innerJoin(subjectsTable, eq(testsTable.subjectId, subjectsTable.id))
    .where(eq(testsTable.teacherId, teacherId))
    .orderBy(desc(testsTable.scheduledAt));
  res.json(tests.map(t => ({ ...t, scheduledAt: t.scheduledAt.toISOString(), courseId: t.courseId ?? null })));
});

// ── Create a test with questions ──────────────────────────────
router.post("/teacher/tests", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const { title, subjectId, grade, courseId, scheduledAt, duration, questions } = req.body;

  if (!title || !subjectId || !grade || !scheduledAt) {
    res.status(400).json({ error: "title, subjectId, grade, scheduledAt required" });
    return;
  }
  if (courseId) {
    const courseIds = await getTeacherCourseIds(teacherId);
    if (!courseIds.includes(courseId)) {
      res.status(403).json({ error: "Not assigned to this course" });
      return;
    }
  }

  const [test] = await db.insert(testsTable).values({
    title,
    subjectId,
    grade,
    courseId: courseId ?? null,
    teacherId,
    scheduledAt: new Date(scheduledAt),
    duration: duration ?? 30,
    totalQuestions: Array.isArray(questions) ? questions.length : 0,
    status: "upcoming",
  }).returning();

  if (Array.isArray(questions) && questions.length > 0) {
    await db.insert(questionsTable).values(
      questions.map((q: { text: string; options: string[]; correctOption: number; imageUrl?: string }, i: number) => ({
        testId: test.id,
        text: q.text,
        options: q.options,
        correctOption: q.correctOption,
        order: i + 1,
        imageUrl: q.imageUrl ?? null,
      }))
    );
  }

  res.status(201).json({ ...test, scheduledAt: test.scheduledAt.toISOString(), createdAt: test.createdAt.toISOString() });
});

// ── Get a specific test with questions (teacher can see answers) ──
router.get("/teacher/tests/:id", teacherOrAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [test] = await db.select().from(testsTable).where(eq(testsTable.id, id));
  if (!test) { res.status(404).json({ error: "Not found" }); return; }

  if (test.teacherId !== req.authUser!.id && req.authUser!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const questions = await db.select().from(questionsTable)
    .where(eq(questionsTable.testId, id))
    .orderBy(questionsTable.order);

  res.json({
    ...test,
    scheduledAt: test.scheduledAt.toISOString(),
    createdAt: test.createdAt.toISOString(),
    questions,
  });
});

// ── Update test status ─────────────────────────────────────────
router.patch("/teacher/tests/:id/status", teacherOrAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body;
  if (!["upcoming", "active", "completed"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const [updated] = await db.update(testsTable).set({ status }).where(eq(testsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, scheduledAt: updated.scheduledAt.toISOString(), createdAt: updated.createdAt.toISOString() });
});

// ── Delete a test ──────────────────────────────────────────────
router.delete("/teacher/tests/:id", teacherOrAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(questionsTable).where(eq(questionsTable.testId, id));
  await db.delete(testsTable).where(eq(testsTable.id, id));
  res.json({ success: true });
});

export default router;
