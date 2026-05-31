import { Router } from "express";
import { db } from "@workspace/db";
import { testsTable, questionsTable, testSubmissionsTable, subjectsTable, enrollmentsTable } from "@workspace/db";
import { ListTestsQueryParams, GetTestParams, SubmitTestParams, SubmitTestBody } from "@workspace/api-zod";
import { eq, and, inArray, or, isNull } from "drizzle-orm";
import { recomputeAndSavePoints } from "../points";
import { attachUser, requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/tests", attachUser, async (req, res) => {
  const parsed = ListTestsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const user = req.authUser;

  let studentFilter: ReturnType<typeof or> | ReturnType<typeof isNull> | undefined;
  if (user && user.role === "student") {
    const enrolled = await db.select({ courseId: enrollmentsTable.courseId })
      .from(enrollmentsTable).where(eq(enrollmentsTable.studentId, user.id));
    const enrolledIds = enrolled.map(e => e.courseId);
    if (enrolledIds.length > 0) {
      studentFilter = inArray(testsTable.courseId, enrolledIds);
    } else {
      res.json([]);
      return;
    }
  } else if (!user) {
    res.json([]);
    return;
  }

  const tests = await db.select({
    id: testsTable.id,
    title: testsTable.title,
    subjectId: testsTable.subjectId,
    subjectName: subjectsTable.name,
    grade: testsTable.grade,
    courseId: testsTable.courseId,
    testType: testsTable.testType,
    driveLink: testsTable.driveLink,
    scheduledAt: testsTable.scheduledAt,
    duration: testsTable.duration,
    totalQuestions: testsTable.totalQuestions,
    status: testsTable.status,
  })
    .from(testsTable)
    .innerJoin(subjectsTable, eq(testsTable.subjectId, subjectsTable.id))
    .where(
      and(
        studentFilter,
        params.grade ? eq(testsTable.grade, params.grade) : undefined,
        params.subjectId ? eq(testsTable.subjectId, params.subjectId) : undefined,
        params.status ? eq(testsTable.status, params.status) : undefined,
      )
    );

  res.json(tests.map(t => ({ ...t, scheduledAt: t.scheduledAt.toISOString(), courseId: t.courseId ?? null, testType: t.testType ?? "mcq", driveLink: t.driveLink ?? null, score: null, maxScore: null })));
});

router.get("/tests/:id", async (req, res) => {
  const parsed = GetTestParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [test] = await db.select().from(testsTable).where(eq(testsTable.id, parsed.data.id));
  if (!test) { res.status(404).json({ error: "Not found" }); return; }

  const questions = await db.select().from(questionsTable)
    .where(eq(questionsTable.testId, parsed.data.id))
    .orderBy(questionsTable.order);

  res.json({
    id: test.id,
    title: test.title,
    subjectId: test.subjectId,
    grade: test.grade,
    duration: test.duration,
    questions: questions.map(q => ({
      id: q.id,
      text: q.text,
      options: q.options,
      order: q.order,
      imageUrl: q.imageUrl ?? null,
    })),
  });
});

router.post("/tests/:id/submit", requireAuth, async (req, res) => {
  const idParsed = SubmitTestParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = SubmitTestBody.safeParse(req.body);
  if (!idParsed.success || !bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const studentId = req.authUser!.id;

  const questions = await db.select().from(questionsTable).where(eq(questionsTable.testId, idParsed.data.id));
  const maxScore = questions.length;
  let correct = 0;
  for (const ans of bodyParsed.data.answers) {
    const q = questions.find(q => q.id === ans.questionId);
    if (q && q.correctOption === ans.selectedOption) correct++;
  }
  const score = correct;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  await db.insert(testSubmissionsTable).values({
    testId: idParsed.data.id,
    studentId,
    answers: JSON.stringify(bodyParsed.data.answers),
    score,
    maxScore,
  });

  await recomputeAndSavePoints(studentId);

  res.json({
    score,
    maxScore,
    percentage,
    passed: percentage >= 50,
    correctAnswers: correct,
    wrongAnswers: maxScore - correct,
  });
});

export default router;
