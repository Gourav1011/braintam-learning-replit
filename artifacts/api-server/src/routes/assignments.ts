import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, assignmentSubmissionsTable, subjectsTable } from "@workspace/db";
import { ListAssignmentsQueryParams, GetAssignmentParams, SubmitAssignmentParams, SubmitAssignmentBody } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/assignments", async (req, res) => {
  const parsed = ListAssignmentsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const asgn = await db.select({
    id: assignmentsTable.id,
    title: assignmentsTable.title,
    subjectId: assignmentsTable.subjectId,
    subjectName: subjectsTable.name,
    grade: assignmentsTable.grade,
    dueDate: assignmentsTable.dueDate,
    description: assignmentsTable.description,
    maxMarks: assignmentsTable.maxMarks,
    attachmentUrl: assignmentsTable.attachmentUrl,
  })
    .from(assignmentsTable)
    .innerJoin(subjectsTable, eq(assignmentsTable.subjectId, subjectsTable.id))
    .where(
      and(
        params.grade ? eq(assignmentsTable.grade, params.grade) : undefined,
        params.subjectId ? eq(assignmentsTable.subjectId, params.subjectId) : undefined,
      )
    );

  res.json(asgn.map(a => ({
    ...a,
    dueDate: a.dueDate.toISOString(),
    description: a.description ?? null,
    attachmentUrl: a.attachmentUrl ?? null,
    status: "pending" as const,
    marks: null,
  })));
});

router.get("/assignments/:id", async (req, res) => {
  const parsed = GetAssignmentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [asgn] = await db.select({
    id: assignmentsTable.id,
    title: assignmentsTable.title,
    subjectId: assignmentsTable.subjectId,
    subjectName: subjectsTable.name,
    grade: assignmentsTable.grade,
    dueDate: assignmentsTable.dueDate,
    description: assignmentsTable.description,
    maxMarks: assignmentsTable.maxMarks,
    attachmentUrl: assignmentsTable.attachmentUrl,
  })
    .from(assignmentsTable)
    .innerJoin(subjectsTable, eq(assignmentsTable.subjectId, subjectsTable.id))
    .where(eq(assignmentsTable.id, parsed.data.id));

  if (!asgn) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...asgn, dueDate: asgn.dueDate.toISOString(), description: asgn.description ?? null, attachmentUrl: asgn.attachmentUrl ?? null, status: "pending", marks: null });
});

router.post("/assignments/:id/submit", async (req, res) => {
  const idParsed = SubmitAssignmentParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = SubmitAssignmentBody.safeParse(req.body);
  if (!idParsed.success || !bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  await db.insert(assignmentSubmissionsTable).values({
    assignmentId: idParsed.data.id,
    studentId: 1,
    answer: bodyParsed.data.answer,
    attachmentUrl: bodyParsed.data.attachmentUrl ?? null,
    status: "submitted",
  });

  res.json({ success: true, message: "Assignment submitted successfully!" });
});

export default router;
