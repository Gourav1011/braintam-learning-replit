import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, coursesTable, subjectsTable,
  teacherCoursesTable, enrollmentsTable,
  liveClassesTable, homeworkTable, assignmentsTable,
  recordingsTable, testsTable, questionsTable, attendanceTable,
  homeworkSubmissionsTable, assignmentSubmissionsTable,
  testSubmissionsTable,
  auditLogsTable, topicNotesTable,
} from "@workspace/db";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
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

async function logAudit(
  actorId: number,
  actorName: string,
  action: string,
  targetType: string,
  targetId: number,
  targetName: string,
  metadata?: string,
) {
  try {
    await db.insert(auditLogsTable).values({
      actorId, actorName, action, targetType, targetId, targetName,
      metadata: metadata ?? null,
    });
  } catch {
    // non-fatal
  }
}

// ── Dashboard ────────────────────────────────────────────────────
router.get("/teacher/dashboard", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const courseIds = await getTeacherCourseIds(teacherId);

  const courses = courseIds.length
    ? await db.select({
        id: coursesTable.id,
        title: coursesTable.title,
        subjectName: subjectsTable.name,
        grade: coursesTable.grade,
        totalLessons: coursesTable.totalLessons,
      })
        .from(coursesTable)
        .innerJoin(subjectsTable, eq(coursesTable.subjectId, subjectsTable.id))
        .where(inArray(coursesTable.id, courseIds))
    : [];

  const upcomingClasses = courseIds.length
    ? await db.select().from(liveClassesTable)
        .where(and(
          inArray(liveClassesTable.courseId, courseIds),
          eq(liveClassesTable.status, "upcoming"),
        )).limit(5)
    : [];

  const pendingHw = courseIds.length
    ? await db.select({ count: sql<number>`count(*)` })
        .from(homeworkTable)
        .where(inArray(homeworkTable.courseId, courseIds))
    : [{ count: 0 }];

  const [studentCount] = await db.select({ count: sql<number>`count(distinct ${enrollmentsTable.studentId})` })
    .from(enrollmentsTable)
    .where(courseIds.length ? inArray(enrollmentsTable.courseId, courseIds) : sql`false`);

  res.json({
    teacherName: req.authUser!.name,
    totalCourses: courses.length,
    totalStudents: Number(studentCount?.count ?? 0),
    upcomingLiveClasses: upcomingClasses.length,
    pendingHomework: Number(pendingHw[0]?.count ?? 0),
    courses,
    upcomingClasses: upcomingClasses.map(c => ({
      ...c,
      scheduledAt: c.scheduledAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
    })),
  });
});

// ── My Courses ───────────────────────────────────────────────────
router.get("/teacher/courses", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const courseIds = await getTeacherCourseIds(teacherId);
  if (!courseIds.length) { res.json([]); return; }

  const courses = await db.select({
    id: coursesTable.id,
    title: coursesTable.title,
    subjectId: coursesTable.subjectId,
    subjectName: subjectsTable.name,
    grade: coursesTable.grade,
    totalLessons: coursesTable.totalLessons,
    thumbnailUrl: coursesTable.thumbnailUrl,
    description: coursesTable.description,
    teacher: coursesTable.teacher,
    rating: coursesTable.rating,
  })
    .from(coursesTable)
    .innerJoin(subjectsTable, eq(coursesTable.subjectId, subjectsTable.id))
    .where(inArray(coursesTable.id, courseIds));

  const enrollmentCounts = await db.select({
    courseId: enrollmentsTable.courseId,
    count: sql<number>`count(*)`,
  })
    .from(enrollmentsTable)
    .where(inArray(enrollmentsTable.courseId, courseIds))
    .groupBy(enrollmentsTable.courseId);

  const countMap = Object.fromEntries(enrollmentCounts.map(e => [e.courseId, Number(e.count)]));

  res.json(courses.map(c => ({
    ...c,
    description: c.description ?? null,
    teacher: c.teacher ?? null,
    rating: c.rating ?? null,
    enrolledStudents: countMap[c.id] ?? 0,
  })));
});

// ── Live Classes ─────────────────────────────────────────────────
router.get("/teacher/live-classes", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const isAdmin = req.authUser!.role === "admin";
  const classes = await db.select().from(liveClassesTable)
    .where(isAdmin ? undefined : eq(liveClassesTable.teacherId, teacherId))
    .orderBy(desc(liveClassesTable.scheduledAt));
  res.json(classes.map(c => ({ ...c, scheduledAt: c.scheduledAt.toISOString(), createdAt: c.createdAt.toISOString() })));
});

router.post("/teacher/live-classes", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const { title, subjectId, grade, courseId, scheduledAt, duration, joinUrl } = req.body;
  if (!title || !subjectId || !grade || !scheduledAt) {
    res.status(400).json({ error: "title, subjectId, grade, scheduledAt are required" });
    return;
  }
  if (courseId) {
    const courseIds = await getTeacherCourseIds(teacherId);
    if (!courseIds.includes(courseId)) {
      res.status(403).json({ error: "Not assigned to this course" });
      return;
    }
  }
  const [lc] = await db.insert(liveClassesTable).values({
    title, subjectId: Number(subjectId), grade: Number(grade),
    courseId: courseId ? Number(courseId) : null,
    teacherId,
    scheduledAt: new Date(scheduledAt),
    duration: duration ?? 60,
    teacher: req.authUser!.name,
    joinUrl: joinUrl ?? null,
    status: "upcoming",
  }).returning();

  await logAudit(teacherId, req.authUser!.name, "live_class_created", "live_class", lc.id, lc.title);

  res.status(201).json({ ...lc, scheduledAt: lc.scheduledAt.toISOString(), createdAt: lc.createdAt.toISOString() });
});

// ── Homework ─────────────────────────────────────────────────────
router.get("/teacher/homework", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const isAdmin = req.authUser!.role === "admin";
  const hw = await db.select({
    id: homeworkTable.id,
    title: homeworkTable.title,
    subjectId: homeworkTable.subjectId,
    subjectName: subjectsTable.name,
    grade: homeworkTable.grade,
    courseId: homeworkTable.courseId,
    liveClassId: homeworkTable.liveClassId,
    chapterId: homeworkTable.chapterId,
    topicId: homeworkTable.topicId,
    homeworkType: homeworkTable.homeworkType,
    driveLink: homeworkTable.driveLink,
    dueDate: homeworkTable.dueDate,
    description: homeworkTable.description,
    maxMarks: homeworkTable.maxMarks,
    questionsJson: homeworkTable.questionsJson,
  })
    .from(homeworkTable)
    .innerJoin(subjectsTable, eq(homeworkTable.subjectId, subjectsTable.id))
    .where(isAdmin ? undefined : eq(homeworkTable.teacherId, teacherId))
    .orderBy(desc(homeworkTable.dueDate));
  res.json(hw.map(h => ({ ...h, dueDate: h.dueDate.toISOString(), description: h.description ?? null, questionsJson: h.questionsJson ?? null, driveLink: h.driveLink ?? null })));
});

router.post("/teacher/homework", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const { title, subjectId, grade, courseId, liveClassId, homeworkType, driveLink, dueDate, description, maxMarks, questionsJson } = req.body;
  if (!title || !subjectId || !grade || !dueDate) {
    res.status(400).json({ error: "title, subjectId, grade, dueDate are required" });
    return;
  }
  if (courseId) {
    const courseIds = await getTeacherCourseIds(teacherId);
    if (!courseIds.includes(courseId)) {
      res.status(403).json({ error: "Not assigned to this course" });
      return;
    }
  }
  const [hw] = await db.insert(homeworkTable).values({
    title, subjectId: Number(subjectId), grade: Number(grade),
    courseId: courseId ? Number(courseId) : null,
    liveClassId: liveClassId ? Number(liveClassId) : null,
    homeworkType: homeworkType ?? "writing",
    driveLink: driveLink ?? null,
    teacherId,
    dueDate: new Date(dueDate),
    description: description ?? null,
    maxMarks: maxMarks ?? 10,
    questionsJson: questionsJson ? JSON.stringify(questionsJson) : null,
  }).returning();

  await logAudit(teacherId, req.authUser!.name, "homework_created", "homework", hw.id, hw.title,
    JSON.stringify({ grade, subject: subjectId }),
  );

  res.status(201).json({ ...hw, dueDate: hw.dueDate.toISOString(), createdAt: hw.createdAt.toISOString() });
});

router.patch("/teacher/homework/:id", teacherOrAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const teacherId = req.authUser!.id;
  const isAdmin = req.authUser!.role === "admin";
  const { title, dueDate, description, maxMarks, homeworkType, driveLink, questionsJson } = req.body;
  const condition = isAdmin
    ? eq(homeworkTable.id, id)
    : and(eq(homeworkTable.id, id), eq(homeworkTable.teacherId, teacherId));
  const [hw] = await db.update(homeworkTable).set({
    ...(title        ? { title }                              : {}),
    ...(dueDate      ? { dueDate: new Date(dueDate) }         : {}),
    ...(description !== undefined ? { description }           : {}),
    ...(maxMarks    !== undefined ? { maxMarks: Number(maxMarks) } : {}),
    ...(homeworkType !== undefined ? { homeworkType }          : {}),
    ...(driveLink   !== undefined ? { driveLink }             : {}),
    ...(questionsJson !== undefined ? { questionsJson: questionsJson ? JSON.stringify(questionsJson) : null } : {}),
  })
    .where(condition)
    .returning();
  if (!hw) { res.status(404).json({ error: "Not found or access denied" }); return; }
  res.json({ ...hw, dueDate: hw.dueDate.toISOString() });
});

router.delete("/teacher/homework/:id", teacherOrAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const isAdmin = req.authUser!.role === "admin";
  const teacherId = req.authUser!.id;
  const condition = isAdmin
    ? eq(homeworkTable.id, id)
    : and(eq(homeworkTable.id, id), eq(homeworkTable.teacherId, teacherId));
  const [hw] = await db.select({ id: homeworkTable.id }).from(homeworkTable).where(condition);
  if (!hw) { res.status(404).json({ error: "Homework not found or access denied" }); return; }
  await db.delete(homeworkTable).where(condition);
  res.json({ ok: true });
});

// ── Assignments ──────────────────────────────────────────────────
router.get("/teacher/assignments", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const isAdmin = req.authUser!.role === "admin";
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
    .where(isAdmin ? undefined : eq(assignmentsTable.teacherId, teacherId))
    .orderBy(desc(assignmentsTable.dueDate));
  res.json(asgn.map(a => ({
    ...a,
    dueDate: a.dueDate.toISOString(),
    description: a.description ?? null,
    attachmentUrl: a.attachmentUrl ?? null,
  })));
});

router.post("/teacher/assignments", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const { title, subjectId, grade, courseId, dueDate, description, maxMarks, attachmentUrl } = req.body;
  if (!title || !subjectId || !grade || !dueDate) {
    res.status(400).json({ error: "title, subjectId, grade, dueDate are required" });
    return;
  }
  if (courseId) {
    const courseIds = await getTeacherCourseIds(teacherId);
    if (!courseIds.includes(courseId)) {
      res.status(403).json({ error: "Not assigned to this course" });
      return;
    }
  }
  const [asgn] = await db.insert(assignmentsTable).values({
    title, subjectId: Number(subjectId), grade: Number(grade),
    courseId: courseId ? Number(courseId) : null,
    teacherId,
    dueDate: new Date(dueDate),
    description: description ?? null,
    maxMarks: maxMarks ?? 20,
    attachmentUrl: attachmentUrl ?? null,
  }).returning();

  await logAudit(teacherId, req.authUser!.name, "assignment_created", "assignment", asgn.id, asgn.title);

  res.status(201).json({ ...asgn, dueDate: asgn.dueDate.toISOString(), createdAt: asgn.createdAt.toISOString() });
});

// ── Recordings ───────────────────────────────────────────────────
router.get("/teacher/recordings", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const isAdmin = req.authUser!.role === "admin";
  const recs = await db.select().from(recordingsTable)
    .where(isAdmin ? undefined : eq(recordingsTable.teacherId, teacherId))
    .orderBy(desc(recordingsTable.recordedAt));
  res.json(recs.map(r => ({ ...r, recordedAt: r.recordedAt.toISOString(), createdAt: r.createdAt.toISOString() })));
});

router.post("/teacher/recordings", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const { title, subjectId, grade, courseId, recordedAt, videoUrl, duration, thumbnailUrl } = req.body;
  if (!title || !subjectId || !grade || !videoUrl || !duration || !recordedAt) {
    res.status(400).json({ error: "title, subjectId, grade, videoUrl, duration, recordedAt are required" });
    return;
  }
  if (courseId) {
    const courseIds = await getTeacherCourseIds(teacherId);
    if (!courseIds.includes(courseId)) {
      res.status(403).json({ error: "Not assigned to this course" });
      return;
    }
  }
  const [rec] = await db.insert(recordingsTable).values({
    title, subjectId: Number(subjectId), grade: Number(grade),
    courseId: courseId ? Number(courseId) : null,
    teacherId,
    recordedAt: new Date(recordedAt),
    teacher: req.authUser!.name,
    videoUrl, duration,
    thumbnailUrl: thumbnailUrl ?? null,
  }).returning();

  await logAudit(teacherId, req.authUser!.name, "recording_created", "recording", rec.id, rec.title);

  res.status(201).json({ ...rec, recordedAt: rec.recordedAt.toISOString(), createdAt: rec.createdAt.toISOString() });
});

// ── Students in my courses ────────────────────────────────────────
router.get("/teacher/students", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const courseIds = await getTeacherCourseIds(teacherId);
  if (!courseIds.length) { res.json([]); return; }

  const students = await db.select({
    studentId: enrollmentsTable.studentId,
    studentName: usersTable.name,
    grade: usersTable.grade,
    school: usersTable.school,
    email: usersTable.email,
    phone: usersTable.phone,
    points: usersTable.points,
    courseId: enrollmentsTable.courseId,
    courseTitle: coursesTable.title,
    enrolledAt: enrollmentsTable.enrolledAt,
  })
    .from(enrollmentsTable)
    .innerJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
    .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
    .where(inArray(enrollmentsTable.courseId, courseIds));
  res.json(students);
});

// ── Submissions ──────────────────────────────────────────────────
router.get("/teacher/submissions/homework", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const isAdmin = req.authUser!.role === "admin";
  const rows = await db.select({
    id: homeworkSubmissionsTable.id,
    homeworkId: homeworkSubmissionsTable.homeworkId,
    homeworkTitle: homeworkTable.title,
    homeworkType: homeworkTable.homeworkType,
    maxMarks: homeworkTable.maxMarks,
    questionsJson: homeworkTable.questionsJson,
    studentId: homeworkSubmissionsTable.studentId,
    studentName: usersTable.name,
    answer: homeworkSubmissionsTable.answer,
    status: homeworkSubmissionsTable.status,
    marks: homeworkSubmissionsTable.marks,
    feedback: homeworkSubmissionsTable.feedback,
    submittedAt: homeworkSubmissionsTable.submittedAt,
  })
    .from(homeworkSubmissionsTable)
    .innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
    .innerJoin(usersTable, eq(homeworkSubmissionsTable.studentId, usersTable.id))
    .where(isAdmin ? undefined : eq(homeworkTable.teacherId, teacherId))
    .orderBy(desc(homeworkSubmissionsTable.submittedAt));
  res.json(rows.map(r => ({ ...r, homeworkType: r.homeworkType ?? "writing" })));
});

router.get("/teacher/submissions/assignments", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const isAdmin = req.authUser!.role === "admin";
  const rows = await db.select({
    id: assignmentSubmissionsTable.id,
    assignmentId: assignmentSubmissionsTable.assignmentId,
    assignmentTitle: assignmentsTable.title,
    maxMarks: assignmentsTable.maxMarks,
    studentId: assignmentSubmissionsTable.studentId,
    studentName: usersTable.name,
    answer: assignmentSubmissionsTable.answer,
    status: assignmentSubmissionsTable.status,
    marks: assignmentSubmissionsTable.marks,
    feedback: assignmentSubmissionsTable.feedback,
    submittedAt: assignmentSubmissionsTable.submittedAt,
  })
    .from(assignmentSubmissionsTable)
    .innerJoin(assignmentsTable, eq(assignmentSubmissionsTable.assignmentId, assignmentsTable.id))
    .innerJoin(usersTable, eq(assignmentSubmissionsTable.studentId, usersTable.id))
    .where(isAdmin ? undefined : eq(assignmentsTable.teacherId, teacherId))
    .orderBy(desc(assignmentSubmissionsTable.submittedAt));
  res.json(rows);
});

router.get("/teacher/submissions/tests", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const isAdmin = req.authUser!.role === "admin";
  const rows = await db.select({
    id: testSubmissionsTable.id,
    testId: testSubmissionsTable.testId,
    testTitle: testsTable.title,
    subjectName: subjectsTable.name,
    grade: testsTable.grade,
    totalQuestions: testsTable.totalQuestions,
    studentId: testSubmissionsTable.studentId,
    studentName: usersTable.name,
    answers: testSubmissionsTable.answers,
    score: testSubmissionsTable.score,
    maxScore: testSubmissionsTable.maxScore,
    submittedAt: testSubmissionsTable.submittedAt,
  })
    .from(testSubmissionsTable)
    .innerJoin(testsTable, eq(testSubmissionsTable.testId, testsTable.id))
    .innerJoin(subjectsTable, eq(testsTable.subjectId, subjectsTable.id))
    .innerJoin(usersTable, eq(testSubmissionsTable.studentId, usersTable.id))
    .where(isAdmin ? undefined : eq(testsTable.teacherId, teacherId))
    .orderBy(desc(testSubmissionsTable.submittedAt));
  res.json(rows.map(r => ({
    ...r,
    submittedAt: r.submittedAt.toISOString(),
    score: r.score ?? null,
    maxScore: r.maxScore ?? null,
  })));
});

router.patch("/teacher/submissions/homework/:id/grade", teacherOrAdmin, async (req, res) => {
  const subId = parseInt(String(req.params.id), 10);
  const { marks, feedback } = req.body;
  if (isNaN(subId) || marks === undefined) {
    res.status(400).json({ error: "marks required" });
    return;
  }
  const [updated] = await db.update(homeworkSubmissionsTable)
    .set({ marks: Number(marks), status: "graded", feedback: feedback ?? null })
    .where(eq(homeworkSubmissionsTable.id, subId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Submission not found" }); return; }

  await logAudit(req.authUser!.id, req.authUser!.name, "homework_graded", "submission", subId, `Submission #${subId}`,
    JSON.stringify({ marks }),
  );

  res.json(updated);
});

router.patch("/teacher/submissions/assignments/:id/grade", teacherOrAdmin, async (req, res) => {
  const subId = parseInt(String(req.params.id), 10);
  const { marks, feedback } = req.body;
  if (isNaN(subId) || marks === undefined) {
    res.status(400).json({ error: "marks required" });
    return;
  }
  const [updated] = await db.update(assignmentSubmissionsTable)
    .set({ marks: Number(marks), status: "graded", feedback: feedback ?? null })
    .where(eq(assignmentSubmissionsTable.id, subId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Submission not found" }); return; }

  await logAudit(req.authUser!.id, req.authUser!.name, "assignment_graded", "submission", subId, `Submission #${subId}`,
    JSON.stringify({ marks }),
  );

  res.json(updated);
});

// ── Tests ─────────────────────────────────────────────────────────
router.get("/teacher/tests", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const isAdmin = req.authUser!.role === "admin";
  const rows = await db.select({
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
    testType: testsTable.testType,
    driveLink: testsTable.driveLink,
  })
  .from(testsTable)
  .leftJoin(subjectsTable, eq(testsTable.subjectId, subjectsTable.id))
  .where(isAdmin ? undefined : eq(testsTable.teacherId, teacherId))
  .orderBy(desc(testsTable.scheduledAt));
  res.json(rows);
});

router.post("/teacher/tests", teacherOrAdmin, async (req, res) => {
  const { title, subjectId, grade, courseId, scheduledAt, duration, testType, driveLink, questions } = req.body;
  if (!title || !subjectId || !grade || !scheduledAt) {
    res.status(400).json({ error: "title, subjectId, grade, scheduledAt required" });
    return;
  }
  const validQuestions = Array.isArray(questions) ? questions.filter((q: any) => q.text?.trim()) : [];
  const [test] = await db.insert(testsTable).values({
    title,
    subjectId: Number(subjectId),
    grade: Number(grade),
    courseId: courseId ? Number(courseId) : null,
    scheduledAt: new Date(scheduledAt),
    duration: Number(duration) || 30,
    testType: testType ?? "mcq",
    driveLink: driveLink ?? null,
    teacherId: req.authUser!.id,
    totalQuestions: validQuestions.length,
    status: "upcoming",
  }).returning();
  if (validQuestions.length > 0) {
    await db.insert(questionsTable).values(
      validQuestions.map((q: any, i: number) => ({
        testId: test.id,
        text: q.text,
        options: q.options,
        correctOption: q.correctOption,
        order: i,
      }))
    );
  }
  await logAudit(req.authUser!.id, req.authUser!.name, "test_created", "test", test.id, title);
  res.status(201).json(test);
});

router.delete("/teacher/tests/:id", teacherOrAdmin, async (req, res) => {
  const testId = parseInt(String(req.params.id), 10);
  if (isNaN(testId)) { res.status(400).json({ error: "invalid id" }); return; }
  const isAdmin = req.authUser!.role === "admin";
  const condition = isAdmin
    ? eq(testsTable.id, testId)
    : and(eq(testsTable.id, testId), eq(testsTable.teacherId, req.authUser!.id));
  const [test] = await db.select().from(testsTable).where(condition);
  if (!test) { res.status(404).json({ error: "Test not found or access denied" }); return; }
  await db.delete(questionsTable).where(eq(questionsTable.testId, testId));
  await db.delete(testsTable).where(eq(testsTable.id, testId));
  await logAudit(req.authUser!.id, req.authUser!.name, "test_deleted", "test", testId, test.title);
  res.json({ ok: true });
});

// ── Test detail & status ──────────────────────────────────────────
router.get("/teacher/tests/:id", teacherOrAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [test] = await db.select().from(testsTable).where(eq(testsTable.id, id));
  if (!test) { res.status(404).json({ error: "Not found" }); return; }
  if (test.teacherId !== req.authUser!.id && req.authUser!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const questions = await db.select().from(questionsTable)
    .where(eq(questionsTable.testId, id))
    .orderBy(questionsTable.order);
  res.json({ ...test, scheduledAt: test.scheduledAt.toISOString(), createdAt: test.createdAt.toISOString(), questions });
});

router.patch("/teacher/tests/:id/status", teacherOrAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body;
  if (!["upcoming", "active", "completed"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  const [updated] = await db.update(testsTable).set({ status }).where(eq(testsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, scheduledAt: updated.scheduledAt.toISOString(), createdAt: updated.createdAt.toISOString() });
});

// ── Live class status & attendance ────────────────────────────────
router.patch("/teacher/live-classes/:id/status", teacherOrAdmin, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  const { status } = req.body;
  if (isNaN(classId) || !status) { res.status(400).json({ error: "status required" }); return; }
  const [updated] = await db.update(liveClassesTable)
    .set({ status })
    .where(eq(liveClassesTable.id, classId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Class not found" }); return; }
  res.json(updated);
});

router.get("/teacher/live-classes/:id/attendance", teacherOrAdmin, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  if (isNaN(classId)) { res.status(400).json({ error: "invalid id" }); return; }
  const records = await db.select({
    studentId: attendanceTable.studentId,
    present: attendanceTable.present,
    studentName: usersTable.name,
  })
  .from(attendanceTable)
  .leftJoin(usersTable, eq(attendanceTable.studentId, usersTable.id))
  .where(eq(attendanceTable.liveClassId, classId));
  res.json(records);
});

router.post("/teacher/live-classes/:id/attendance", teacherOrAdmin, async (req, res) => {
  const classId = parseInt(String(req.params.id), 10);
  const { records } = req.body;
  if (isNaN(classId) || !Array.isArray(records)) {
    res.status(400).json({ error: "records array required" });
    return;
  }
  await db.delete(attendanceTable).where(eq(attendanceTable.liveClassId, classId));
  if (records.length > 0) {
    await db.insert(attendanceTable).values(
      records.map((r: any) => ({ liveClassId: classId, studentId: r.studentId, present: Boolean(r.present) }))
    );
  }
  res.json({ ok: true });
});

// ── Notes / Resources ──────────────────────────────────────────────
router.get("/teacher/notes", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const isAdmin = req.authUser!.role === "admin";
  const notes = await db.select().from(topicNotesTable)
    .where(isAdmin ? undefined : eq(topicNotesTable.teacherId, teacherId))
    .orderBy(desc(topicNotesTable.createdAt));
  res.json(notes);
});

router.post("/teacher/notes", teacherOrAdmin, async (req, res) => {
  const teacherId = req.authUser!.id;
  const { title, resourceType, url, description, topicId, chapterId, courseId, grade } = req.body;
  if (!title || !url) { res.status(400).json({ error: "title and url are required" }); return; }
  const [note] = await db.insert(topicNotesTable).values({
    title,
    resourceType: resourceType ?? "pdf",
    url,
    description: description ?? null,
    topicId:   topicId   ? Number(topicId)   : null,
    chapterId: chapterId ? Number(chapterId) : null,
    courseId:  courseId  ? Number(courseId)  : null,
    grade:     grade     ? Number(grade)     : null,
    teacherId,
  }).returning();
  res.json(note);
});

router.delete("/teacher/notes/:id", teacherOrAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const teacherId = req.authUser!.id;
  await db.delete(topicNotesTable).where(and(eq(topicNotesTable.id, id), eq(topicNotesTable.teacherId, teacherId)));
  res.json({ ok: true });
});

export default router;
