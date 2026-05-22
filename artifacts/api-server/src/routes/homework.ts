import { Router } from "express";
import { db } from "@workspace/db";
import { homeworkTable, homeworkSubmissionsTable, subjectsTable, enrollmentsTable } from "@workspace/db";
import { ListHomeworkQueryParams, GetHomeworkParams, SubmitHomeworkParams, SubmitHomeworkBody } from "@workspace/api-zod";
import { eq, and, inArray } from "drizzle-orm";
import { recomputeAndSavePoints } from "../points";
import { attachUser, requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/homework", attachUser, async (req, res) => {
  const parsed = ListHomeworkQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const user = req.authUser;

  let enrollmentFilter: ReturnType<typeof inArray> | undefined;
  if (user && user.role === "student") {
    const enrolled = await db
      .select({ courseId: enrollmentsTable.courseId })
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.studentId, user.id));
    const ids = enrolled.map(e => e.courseId);
    if (ids.length > 0) {
      enrollmentFilter = inArray(homeworkTable.courseId, ids);
    }
  }

  const hw = await db.select({
    id: homeworkTable.id,
    title: homeworkTable.title,
    subjectId: homeworkTable.subjectId,
    subjectName: subjectsTable.name,
    grade: homeworkTable.grade,
    courseId: homeworkTable.courseId,
    dueDate: homeworkTable.dueDate,
    description: homeworkTable.description,
    maxMarks: homeworkTable.maxMarks,
  })
    .from(homeworkTable)
    .innerJoin(subjectsTable, eq(homeworkTable.subjectId, subjectsTable.id))
    .where(and(
      enrollmentFilter,
      params.grade ? eq(homeworkTable.grade, params.grade) : undefined,
      params.subjectId ? eq(homeworkTable.subjectId, params.subjectId) : undefined,
    ));

  let submissionMap: Record<number, { status: string; marks: number | null; feedback: string | null }> = {};
  if (user) {
    const subs = await db
      .select({ homeworkId: homeworkSubmissionsTable.homeworkId, status: homeworkSubmissionsTable.status, marks: homeworkSubmissionsTable.marks, feedback: homeworkSubmissionsTable.feedback })
      .from(homeworkSubmissionsTable)
      .where(eq(homeworkSubmissionsTable.studentId, user.id));
    for (const s of subs) {
      submissionMap[s.homeworkId] = { status: s.status, marks: s.marks ?? null, feedback: s.feedback ?? null };
    }
  }

  res.json(hw.map(h => ({
    ...h,
    dueDate: h.dueDate.toISOString(),
    description: h.description ?? null,
    courseId: h.courseId ?? null,
    status: submissionMap[h.id]?.status ?? "pending",
    marks: submissionMap[h.id]?.marks ?? null,
    feedback: submissionMap[h.id]?.feedback ?? null,
    maxMarks: h.maxMarks,
  })));
});

router.get("/homework/:id", attachUser, async (req, res) => {
  const parsed = GetHomeworkParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [hw] = await db.select({
    id: homeworkTable.id,
    title: homeworkTable.title,
    subjectId: homeworkTable.subjectId,
    subjectName: subjectsTable.name,
    grade: homeworkTable.grade,
    courseId: homeworkTable.courseId,
    dueDate: homeworkTable.dueDate,
    description: homeworkTable.description,
    maxMarks: homeworkTable.maxMarks,
  })
    .from(homeworkTable)
    .innerJoin(subjectsTable, eq(homeworkTable.subjectId, subjectsTable.id))
    .where(eq(homeworkTable.id, parsed.data.id));

  if (!hw) { res.status(404).json({ error: "Not found" }); return; }

  let submission: { status: string; marks: number | null; feedback: string | null } = { status: "pending", marks: null, feedback: null };
  if (req.authUser) {
    const [sub] = await db.select({ status: homeworkSubmissionsTable.status, marks: homeworkSubmissionsTable.marks, feedback: homeworkSubmissionsTable.feedback })
      .from(homeworkSubmissionsTable)
      .where(and(eq(homeworkSubmissionsTable.homeworkId, parsed.data.id), eq(homeworkSubmissionsTable.studentId, req.authUser.id)));
    if (sub) submission = { status: sub.status, marks: sub.marks ?? null, feedback: sub.feedback ?? null };
  }

  res.json({ ...hw, dueDate: hw.dueDate.toISOString(), description: hw.description ?? null, courseId: hw.courseId ?? null, ...submission });
});

router.post("/homework/:id/submit", requireAuth, async (req, res) => {
  const idParsed = SubmitHomeworkParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = SubmitHomeworkBody.safeParse(req.body);
  if (!idParsed.success || !bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const studentId = req.authUser!.id;

  const [existing] = await db.select({ id: homeworkSubmissionsTable.id })
    .from(homeworkSubmissionsTable)
    .where(and(eq(homeworkSubmissionsTable.homeworkId, idParsed.data.id), eq(homeworkSubmissionsTable.studentId, studentId)));

  if (existing) {
    res.status(409).json({ error: "Already submitted" });
    return;
  }

  await db.insert(homeworkSubmissionsTable).values({
    homeworkId: idParsed.data.id,
    studentId,
    answer: bodyParsed.data.answer,
    attachmentUrl: bodyParsed.data.attachmentUrl ?? null,
    status: "submitted",
  });

  await recomputeAndSavePoints(studentId);

  res.json({ success: true, message: "Homework submitted successfully!" });
});

export default router;
