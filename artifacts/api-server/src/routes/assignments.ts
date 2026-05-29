import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, assignmentSubmissionsTable, subjectsTable, enrollmentsTable } from "@workspace/db";
import { ListAssignmentsQueryParams, GetAssignmentParams, SubmitAssignmentParams, SubmitAssignmentBody } from "@workspace/api-zod";
import { eq, and, inArray, or, isNull } from "drizzle-orm";
import { recomputeAndSavePoints } from "../points";
import { attachUser, requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/assignments", attachUser, async (req, res) => {
  const parsed = ListAssignmentsQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const user = req.authUser;

  let studentFilter: ReturnType<typeof or> | ReturnType<typeof isNull> | undefined;
  if (user && user.role === "student") {
    const enrolled = await db.select({ courseId: enrollmentsTable.courseId })
      .from(enrollmentsTable).where(eq(enrollmentsTable.studentId, user.id));
    const enrolledIds = enrolled.map(e => e.courseId);
    if (enrolledIds.length > 0) {
      // Show assignments linked to enrolled courses OR grade-level assignments (no course)
      studentFilter = or(inArray(assignmentsTable.courseId, enrolledIds), isNull(assignmentsTable.courseId));
    } else {
      // Not enrolled in any course — show only grade-level assignments (no course assigned)
      studentFilter = isNull(assignmentsTable.courseId);
    }
  }

  const asgn = await db.select({
    id: assignmentsTable.id,
    title: assignmentsTable.title,
    subjectId: assignmentsTable.subjectId,
    subjectName: subjectsTable.name,
    grade: assignmentsTable.grade,
    courseId: assignmentsTable.courseId,
    dueDate: assignmentsTable.dueDate,
    description: assignmentsTable.description,
    maxMarks: assignmentsTable.maxMarks,
    attachmentUrl: assignmentsTable.attachmentUrl,
  })
    .from(assignmentsTable)
    .innerJoin(subjectsTable, eq(assignmentsTable.subjectId, subjectsTable.id))
    .where(and(
      studentFilter,
      params.grade ? eq(assignmentsTable.grade, params.grade) : undefined,
      params.subjectId ? eq(assignmentsTable.subjectId, params.subjectId) : undefined,
    ));

  let submissionMap: Record<number, { status: string; marks: number | null; feedback: string | null }> = {};
  if (user) {
    const subs = await db
      .select({ assignmentId: assignmentSubmissionsTable.assignmentId, status: assignmentSubmissionsTable.status, marks: assignmentSubmissionsTable.marks, feedback: assignmentSubmissionsTable.feedback })
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.studentId, user.id));
    for (const s of subs) {
      submissionMap[s.assignmentId] = { status: s.status, marks: s.marks ?? null, feedback: s.feedback ?? null };
    }
  }

  res.json(asgn.map(a => ({
    ...a,
    dueDate: a.dueDate.toISOString(),
    description: a.description ?? null,
    attachmentUrl: a.attachmentUrl ?? null,
    courseId: a.courseId ?? null,
    status: submissionMap[a.id]?.status ?? "pending",
    marks: submissionMap[a.id]?.marks ?? null,
    feedback: submissionMap[a.id]?.feedback ?? null,
  })));
});

router.get("/assignments/:id", attachUser, async (req, res) => {
  const parsed = GetAssignmentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [asgn] = await db.select({
    id: assignmentsTable.id,
    title: assignmentsTable.title,
    subjectId: assignmentsTable.subjectId,
    subjectName: subjectsTable.name,
    grade: assignmentsTable.grade,
    courseId: assignmentsTable.courseId,
    dueDate: assignmentsTable.dueDate,
    description: assignmentsTable.description,
    maxMarks: assignmentsTable.maxMarks,
    attachmentUrl: assignmentsTable.attachmentUrl,
  })
    .from(assignmentsTable)
    .innerJoin(subjectsTable, eq(assignmentsTable.subjectId, subjectsTable.id))
    .where(eq(assignmentsTable.id, parsed.data.id));

  if (!asgn) { res.status(404).json({ error: "Not found" }); return; }

  let submission: { status: string; marks: number | null; feedback: string | null } = { status: "pending", marks: null, feedback: null };
  if (req.authUser) {
    const [sub] = await db.select({ status: assignmentSubmissionsTable.status, marks: assignmentSubmissionsTable.marks, feedback: assignmentSubmissionsTable.feedback })
      .from(assignmentSubmissionsTable)
      .where(and(eq(assignmentSubmissionsTable.assignmentId, parsed.data.id), eq(assignmentSubmissionsTable.studentId, req.authUser.id)));
    if (sub) submission = { status: sub.status, marks: sub.marks ?? null, feedback: sub.feedback ?? null };
  }

  res.json({ ...asgn, dueDate: asgn.dueDate.toISOString(), description: asgn.description ?? null, attachmentUrl: asgn.attachmentUrl ?? null, courseId: asgn.courseId ?? null, ...submission });
});

router.post("/assignments/:id/submit", requireAuth, async (req, res) => {
  const idParsed = SubmitAssignmentParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = SubmitAssignmentBody.safeParse(req.body);
  if (!idParsed.success || !bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const studentId = req.authUser!.id;

  const [existing] = await db.select({ id: assignmentSubmissionsTable.id })
    .from(assignmentSubmissionsTable)
    .where(and(eq(assignmentSubmissionsTable.assignmentId, idParsed.data.id), eq(assignmentSubmissionsTable.studentId, studentId)));

  if (existing) {
    res.status(409).json({ error: "Already submitted" });
    return;
  }

  await db.insert(assignmentSubmissionsTable).values({
    assignmentId: idParsed.data.id,
    studentId,
    answer: bodyParsed.data.answer,
    attachmentUrl: bodyParsed.data.attachmentUrl ?? null,
    status: "submitted",
  });

  await recomputeAndSavePoints(studentId);

  res.json({ success: true, message: "Assignment submitted successfully!" });
});

export default router;
