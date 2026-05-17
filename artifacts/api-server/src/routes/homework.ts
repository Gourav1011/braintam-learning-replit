import { Router } from "express";
import { db } from "@workspace/db";
import { homeworkTable, homeworkSubmissionsTable, subjectsTable } from "@workspace/db";
import { ListHomeworkQueryParams, GetHomeworkParams, SubmitHomeworkParams, SubmitHomeworkBody } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/homework", async (req, res) => {
  const parsed = ListHomeworkQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const hw = await db.select({
    id: homeworkTable.id,
    title: homeworkTable.title,
    subjectId: homeworkTable.subjectId,
    subjectName: subjectsTable.name,
    grade: homeworkTable.grade,
    dueDate: homeworkTable.dueDate,
    description: homeworkTable.description,
    maxMarks: homeworkTable.maxMarks,
  })
    .from(homeworkTable)
    .innerJoin(subjectsTable, eq(homeworkTable.subjectId, subjectsTable.id))
    .where(
      and(
        params.grade ? eq(homeworkTable.grade, params.grade) : undefined,
        params.subjectId ? eq(homeworkTable.subjectId, params.subjectId) : undefined,
      )
    );

  res.json(hw.map(h => ({
    ...h,
    dueDate: h.dueDate.toISOString(),
    description: h.description ?? null,
    status: "pending" as const,
    marks: null,
    maxMarks: h.maxMarks,
  })));
});

router.get("/homework/:id", async (req, res) => {
  const parsed = GetHomeworkParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [hw] = await db.select({
    id: homeworkTable.id,
    title: homeworkTable.title,
    subjectId: homeworkTable.subjectId,
    subjectName: subjectsTable.name,
    grade: homeworkTable.grade,
    dueDate: homeworkTable.dueDate,
    description: homeworkTable.description,
    maxMarks: homeworkTable.maxMarks,
  })
    .from(homeworkTable)
    .innerJoin(subjectsTable, eq(homeworkTable.subjectId, subjectsTable.id))
    .where(eq(homeworkTable.id, parsed.data.id));

  if (!hw) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...hw, dueDate: hw.dueDate.toISOString(), description: hw.description ?? null, status: "pending", marks: null });
});

router.post("/homework/:id/submit", async (req, res) => {
  const idParsed = SubmitHomeworkParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = SubmitHomeworkBody.safeParse(req.body);
  if (!idParsed.success || !bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  await db.insert(homeworkSubmissionsTable).values({
    homeworkId: idParsed.data.id,
    studentId: 1,
    answer: bodyParsed.data.answer,
    attachmentUrl: bodyParsed.data.attachmentUrl ?? null,
    status: "submitted",
  });

  res.json({ success: true, message: "Homework submitted successfully!" });
});

export default router;
