import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, coursesTable, subjectsTable,
  teacherCoursesTable, enrollmentsTable,
  liveClassesTable, homeworkTable, assignmentsTable,
  recordingsTable, testsTable,
  homeworkSubmissionsTable, assignmentSubmissionsTable, testSubmissionsTable,
  auditLogsTable,
} from "@workspace/db";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";
import { logAction } from "../utils/audit.js";
import crypto from "crypto";

const router = Router();
const adminOnly = requireRole("admin");

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(pw + "braintam_salt").digest("hex");
}

function generateToken(userId: number): string {
  return Buffer.from(`${userId}:${Date.now()}:braintam`).toString("base64");
}

/** Positional shim so existing call sites in this file need no changes. */
async function logAudit(
  actorId: number,
  actorName: string,
  action: string,
  targetType: string,
  targetId: number,
  targetName: string,
  metadata?: string,
) {
  await logAction({ actorId, actorName, action, targetType, targetId, targetName, metadata });
}

// ── Analytics ────────────────────────────────────────────────────
router.get("/admin/analytics", adminOnly, async (req, res) => {
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [totalStudents] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "student"));
  const [totalTeachers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "teacher"));
  const [totalCourses] = await db.select({ count: sql<number>`count(*)` }).from(coursesTable);
  const [totalEnrollments] = await db.select({ count: sql<number>`count(*)` }).from(enrollmentsTable);
  const [totalHwSubs] = await db.select({ count: sql<number>`count(*)` }).from(homeworkSubmissionsTable);
  const [totalAsgnSubs] = await db.select({ count: sql<number>`count(*)` }).from(assignmentSubmissionsTable);
  const [totalTestSubs] = await db.select({ count: sql<number>`count(*)` }).from(testSubmissionsTable);
  const [gradedHw] = await db.select({ count: sql<number>`count(*)` }).from(homeworkSubmissionsTable).where(eq(homeworkSubmissionsTable.status, "graded"));
  const [upcomingClasses] = await db.select({ count: sql<number>`count(*)` }).from(liveClassesTable).where(eq(liveClassesTable.status, "upcoming"));
  const [liveClasses] = await db.select({ count: sql<number>`count(*)` }).from(liveClassesTable).where(eq(liveClassesTable.status, "live"));

  const topStudents = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    points: usersTable.points,
    grade: usersTable.grade,
    school: usersTable.school,
  }).from(usersTable)
    .where(eq(usersTable.role, "student"))
    .orderBy(desc(usersTable.points))
    .limit(5);

  const recentEnrollments = await db.select({
    studentName: usersTable.name,
    courseTitle: coursesTable.title,
    enrolledAt: enrollmentsTable.enrolledAt,
  }).from(enrollmentsTable)
    .innerJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
    .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
    .orderBy(desc(enrollmentsTable.enrolledAt))
    .limit(10);

  res.json({
    totals: {
      users: Number(totalUsers.count),
      students: Number(totalStudents.count),
      teachers: Number(totalTeachers.count),
      courses: Number(totalCourses.count),
      enrollments: Number(totalEnrollments.count),
    },
    submissions: {
      homework: Number(totalHwSubs.count),
      assignments: Number(totalAsgnSubs.count),
      tests: Number(totalTestSubs.count),
      gradedHomework: Number(gradedHw.count),
    },
    liveClasses: {
      upcoming: Number(upcomingClasses.count),
      live: Number(liveClasses.count),
    },
    topStudents,
    recentEnrollments,
  });
});

// ── Stats ────────────────────────────────────────────────────────
router.get("/admin/stats", adminOnly, async (req, res) => {
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [totalStudents] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "student"));
  const [totalTeachers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "teacher"));
  const [totalCourses] = await db.select({ count: sql<number>`count(*)` }).from(coursesTable);
  const [totalEnrollments] = await db.select({ count: sql<number>`count(*)` }).from(enrollmentsTable);
  const [totalAssignments] = await db.select({ count: sql<number>`count(*)` }).from(teacherCoursesTable);
  res.json({
    totalUsers: Number(totalUsers.count),
    totalStudents: Number(totalStudents.count),
    totalTeachers: Number(totalTeachers.count),
    totalCourses: Number(totalCourses.count),
    totalEnrollments: Number(totalEnrollments.count),
    totalTeacherAssignments: Number(totalAssignments.count),
  });
});

// ── User Management ──────────────────────────────────────────────
router.get("/admin/users", adminOnly, async (req, res) => {
  const { role } = req.query;
  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    phone: usersTable.phone,
    role: usersTable.role,
    grade: usersTable.grade,
    school: usersTable.school,
    isActive: usersTable.isActive,
    createdAt: usersTable.createdAt,
    points: usersTable.points,
  })
    .from(usersTable)
    .where(role ? eq(usersTable.role, String(role)) : undefined)
    .orderBy(desc(usersTable.createdAt));
  res.json(users);
});

router.post("/admin/users", adminOnly, async (req, res) => {
  const { name, email, phone, password, role, grade, school } = req.body;
  if (!name || !role) {
    res.status(400).json({ error: "name and role are required" });
    return;
  }
  if (!["admin", "teacher", "student"].includes(role)) {
    res.status(400).json({ error: "role must be admin, teacher, or student" });
    return;
  }
  if (!email && !phone) {
    res.status(400).json({ error: "email or phone required" });
    return;
  }
  if (email) {
    const existingEmail = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existingEmail.length > 0) { res.status(400).json({ error: "Email already in use" }); return; }
  }
  if (phone) {
    const existingPhone = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (existingPhone.length > 0) { res.status(400).json({ error: "Phone already in use" }); return; }
  }
  const [user] = await db.insert(usersTable).values({
    name,
    email: email ?? null,
    phone: phone ?? null,
    passwordHash: password ? hashPassword(password) : null,
    role,
    grade: grade ?? 0,
    school: school ?? null,
    points: 0,
    streakDays: 0,
  }).returning();

  await logAudit(
    req.authUser!.id, req.authUser!.name,
    "user_created", "user", user.id, user.name,
    JSON.stringify({ role: user.role }),
  );

  res.status(201).json({ ...user, token: generateToken(user.id) });
});

router.patch("/admin/users/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { name, role, grade, school, isActive, password } = req.body;
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (role !== undefined) updates.role = role;
  if (grade !== undefined) updates.grade = grade;
  if (school !== undefined) updates.school = school;
  if (isActive !== undefined) updates.isActive = isActive;
  if (password !== undefined) updates.passwordHash = hashPassword(password);

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  const changedFields = Object.keys(updates).filter(k => k !== "passwordHash");
  const action = isActive === false
    ? "user_deactivated"
    : isActive === true
    ? "user_reactivated"
    : password !== undefined
    ? "password_reset"
    : "user_updated";

  await logAudit(
    req.authUser!.id, req.authUser!.name,
    action, "user", updated.id, updated.name,
    changedFields.length ? JSON.stringify({ fields: changedFields }) : undefined,
  );

  res.json(updated);
});

// ── Password Reset (dedicated endpoint) ──────────────────────────
router.post("/admin/users/:id/reset-password", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { password } = req.body;
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!password || String(password).length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  const [updated] = await db.update(usersTable)
    .set({ passwordHash: hashPassword(String(password)) })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, name: usersTable.name });
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  await logAudit(
    req.authUser!.id, req.authUser!.name,
    "password_reset", "user", updated.id, updated.name,
  );

  res.json({ ok: true });
});

router.delete("/admin/users/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [user] = await db.select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable).where(eq(usersTable.id, id)).limit(1);
  await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, id));
  if (user) {
    await logAudit(
      req.authUser!.id, req.authUser!.name,
      "user_deactivated", "user", user.id, user.name,
    );
  }
  res.json({ success: true });
});

// ── Teacher–Course Assignments ───────────────────────────────────
router.get("/admin/teacher-courses", adminOnly, async (req, res) => {
  const rows = await db.select({
    id: teacherCoursesTable.id,
    teacherId: teacherCoursesTable.teacherId,
    teacherName: usersTable.name,
    courseId: teacherCoursesTable.courseId,
    courseTitle: coursesTable.title,
    assignedAt: teacherCoursesTable.assignedAt,
  })
    .from(teacherCoursesTable)
    .innerJoin(usersTable, eq(teacherCoursesTable.teacherId, usersTable.id))
    .innerJoin(coursesTable, eq(teacherCoursesTable.courseId, coursesTable.id))
    .orderBy(desc(teacherCoursesTable.assignedAt));
  res.json(rows);
});

router.post("/admin/teacher-courses", adminOnly, async (req, res) => {
  const { teacherId, courseId } = req.body;
  if (!teacherId || !courseId) {
    res.status(400).json({ error: "teacherId and courseId are required" });
    return;
  }
  const teacher = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, teacherId), eq(usersTable.role, "teacher"))).limit(1);
  if (!teacher.length) {
    res.status(400).json({ error: "Teacher not found" });
    return;
  }
  const [row] = await db.insert(teacherCoursesTable).values({ teacherId, courseId })
    .onConflictDoNothing().returning();

  if (row) {
    const [course] = await db.select({ title: coursesTable.title })
      .from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    await logAudit(
      req.authUser!.id, req.authUser!.name,
      "teacher_assigned", "course", courseId, course?.title ?? String(courseId),
      JSON.stringify({ teacherId, teacherName: teacher[0].name }),
    );
  }

  res.status(201).json(row ?? { message: "Already assigned" });
});

router.delete("/admin/teacher-courses/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select({
    teacherId: teacherCoursesTable.teacherId,
    courseId: teacherCoursesTable.courseId,
  }).from(teacherCoursesTable).where(eq(teacherCoursesTable.id, id)).limit(1);
  await db.delete(teacherCoursesTable).where(eq(teacherCoursesTable.id, id));
  if (row) {
    const [course] = await db.select({ title: coursesTable.title })
      .from(coursesTable).where(eq(coursesTable.id, row.courseId)).limit(1);
    await logAudit(
      req.authUser!.id, req.authUser!.name,
      "teacher_unassigned", "course", row.courseId, course?.title ?? String(row.courseId),
      JSON.stringify({ teacherId: row.teacherId }),
    );
  }
  res.json({ success: true });
});

// ── User course access (all courses + enrolled status for one student) ──
router.get("/admin/users/:id/courses", adminOnly, async (req, res) => {
  const studentId = parseInt(String(req.params.id), 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const allCourses = await db.select({
    id: coursesTable.id,
    title: coursesTable.title,
    grade: coursesTable.grade,
  }).from(coursesTable)
    .orderBy(coursesTable.grade, coursesTable.title);

  const enrollments = await db.select({
    id: enrollmentsTable.id,
    courseId: enrollmentsTable.courseId,
  }).from(enrollmentsTable).where(eq(enrollmentsTable.studentId, studentId));

  const enrollmentMap = new Map(enrollments.map(e => [e.courseId, e.id]));
  res.json(allCourses.map(c => ({
    ...c,
    enrolled: enrollmentMap.has(c.id),
    enrollmentId: enrollmentMap.get(c.id) ?? null,
  })));
});

// ── Enrollments ──────────────────────────────────────────────────
router.get("/admin/enrollments", adminOnly, async (req, res) => {
  const { courseId } = req.query;

  const rows = await db.select({
    id: enrollmentsTable.id,
    studentId: enrollmentsTable.studentId,
    studentName: usersTable.name,
    courseId: enrollmentsTable.courseId,
    courseTitle: coursesTable.title,
    enrolledAt: enrollmentsTable.enrolledAt,
  })
    .from(enrollmentsTable)
    .innerJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
    .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
    .where(courseId ? eq(enrollmentsTable.courseId, Number(courseId)) : undefined)
    .orderBy(desc(enrollmentsTable.enrolledAt));
  res.json(rows);
});

router.post("/admin/enrollments", adminOnly, async (req, res) => {
  const { studentId, courseId } = req.body;
  if (!studentId || !courseId) {
    res.status(400).json({ error: "studentId and courseId are required" });
    return;
  }
  const [row] = await db.insert(enrollmentsTable)
    .values({ studentId, courseId, enrolledBy: req.authUser!.id })
    .onConflictDoNothing().returning();

  if (row) {
    const [student] = await db.select({ name: usersTable.name })
      .from(usersTable).where(eq(usersTable.id, studentId)).limit(1);
    const [course] = await db.select({ title: coursesTable.title })
      .from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    await logAudit(
      req.authUser!.id, req.authUser!.name,
      "student_enrolled", "course", courseId, course?.title ?? String(courseId),
      JSON.stringify({ studentId, studentName: student?.name }),
    );
  }

  res.status(201).json(row ?? { message: "Already enrolled" });
});

router.delete("/admin/enrollments/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select({
    studentId: enrollmentsTable.studentId,
    courseId: enrollmentsTable.courseId,
  }).from(enrollmentsTable).where(eq(enrollmentsTable.id, id)).limit(1);
  await db.delete(enrollmentsTable).where(eq(enrollmentsTable.id, id));
  if (row) {
    const [course] = await db.select({ title: coursesTable.title })
      .from(coursesTable).where(eq(coursesTable.id, row.courseId)).limit(1);
    await logAudit(
      req.authUser!.id, req.authUser!.name,
      "student_unenrolled", "course", row.courseId, course?.title ?? String(row.courseId),
      JSON.stringify({ studentId: row.studentId }),
    );
  }
  res.json({ success: true });
});

// ── Course Management ────────────────────────────────────────────
router.get("/admin/courses", adminOnly, async (req, res) => {
  const courses = await db.select({
    id: coursesTable.id,
    title: coursesTable.title,
    subjectId: coursesTable.subjectId,
    grade: coursesTable.grade,
    board: coursesTable.board,
    academicYearId: coursesTable.academicYearId,
    isPublished: coursesTable.isPublished,
    status: coursesTable.status,
    totalLessons: coursesTable.totalLessons,
    thumbnailUrl: coursesTable.thumbnailUrl,
    description: coursesTable.description,
    teacher: coursesTable.teacher,
    rating: coursesTable.rating,
  })
    .from(coursesTable)
    .orderBy(desc(coursesTable.createdAt));
  res.json(courses.map(c => ({
    ...c,
    subjectName: null,
    courseCode: `CRS${String(c.id).padStart(4, "0")}`,
  })));
});

router.post("/admin/courses", adminOnly, async (req, res) => {
  const { title, subjectId, grade, totalLessons, thumbnailUrl, description, teacher, rating, board, academicYearId, isPublished, status } = req.body;
  if (!title || grade === undefined || grade === null || grade === "") {
    res.status(400).json({ error: "title and grade are required" });
    return;
  }
  try {
    const [course] = await db.insert(coursesTable).values({
      title, subjectId: subjectId ? Number(subjectId) : null, grade: Number(grade),
      totalLessons: totalLessons ?? 0,
      thumbnailUrl: thumbnailUrl || "https://placehold.co/400x240?text=Course",
      description: description ?? null,
      teacher: teacher ?? null,
      rating: rating ?? null,
      board: board ?? null,
      academicYearId: academicYearId ? Number(academicYearId) : null,
      isPublished: isPublished !== false,
      status: status ?? "active",
    }).returning();

    await logAudit(
      req.authUser!.id, req.authUser!.name,
      "course_created", "course", course.id, course.title,
    );

    res.status(201).json({ ...course, courseCode: `CRS${String(course.id).padStart(4, "0")}` });
  } catch (err) {
    req.log.error({ err }, "Failed to create course");
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Database error: ${msg}` });
  }
});

router.put("/admin/courses/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { title, description, teacher, board, academicYearId, isPublished, thumbnailUrl, status, grade } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (teacher !== undefined) updates.teacher = teacher;
  if (board !== undefined) updates.board = board;
  if (academicYearId !== undefined) updates.academicYearId = academicYearId ? Number(academicYearId) : null;
  if (isPublished !== undefined) updates.isPublished = Boolean(isPublished);
  if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl;
  if (status !== undefined) updates.status = status;
  if (grade !== undefined) updates.grade = Number(grade);
  const [course] = await db.update(coursesTable).set(updates as never).where(eq(coursesTable.id, id)).returning();
  if (!course) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...course, courseCode: `CRS${String(course.id).padStart(4, "0")}` });
});

router.delete("/admin/courses/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, id));
  await db.delete(coursesTable).where(eq(coursesTable.id, id));
  await logAudit(
    req.authUser!.id, req.authUser!.name,
    "course_deleted", "course", id, course?.title ?? String(id),
  );
  res.json({ success: true });
});

// ── Live Classes ──────────────────────────────────────────────────
router.get("/admin/live-classes", adminOnly, async (req, res) => {
  const rows = await db
    .select({
      id: liveClassesTable.id,
      title: liveClassesTable.title,
      subjectId: liveClassesTable.subjectId,
      subjectName: subjectsTable.name,
      grade: liveClassesTable.grade,
      teacher: liveClassesTable.teacher,
      teacherId: liveClassesTable.teacherId,
      scheduledAt: liveClassesTable.scheduledAt,
      duration: liveClassesTable.duration,
      status: liveClassesTable.status,
      joinUrl: liveClassesTable.joinUrl,
      studentsJoined: liveClassesTable.studentsJoined,
      courseId: liveClassesTable.courseId,
      courseSubjectId: liveClassesTable.courseSubjectId,
      chapterId: liveClassesTable.chapterId,
      topicId: liveClassesTable.topicId,
      isPublished: liveClassesTable.isPublished,
      createdAt: liveClassesTable.createdAt,
    })
    .from(liveClassesTable)
    .leftJoin(subjectsTable, eq(liveClassesTable.subjectId, subjectsTable.id))
    .orderBy(desc(liveClassesTable.scheduledAt));

  res.json(rows.map(r => ({
    ...r,
    subjectName: r.subjectName ?? null,
    scheduledAt: r.scheduledAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    studentsJoined: r.studentsJoined ?? 0,
  })));
});

router.patch("/admin/live-classes/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, joinUrl } = req.body;
  const updates: Partial<typeof liveClassesTable.$inferInsert> = {};
  if (status !== undefined) updates.status = status;
  if (joinUrl !== undefined) updates.joinUrl = joinUrl;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [lc] = await db.update(liveClassesTable).set(updates).where(eq(liveClassesTable.id, id)).returning();
  if (!lc) { res.status(404).json({ error: "Not found" }); return; }
  res.json(lc);
});

router.delete("/admin/live-classes/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(liveClassesTable).where(eq(liveClassesTable.id, id));
  await logAudit(req.authUser!.id, req.authUser!.name, "live_class_deleted", "live_class", id, String(id));
  res.json({ success: true });
});

// ── Content Creation ─────────────────────────────────────────────
router.post("/admin/live-classes", adminOnly, async (req, res) => {
  const { title, subjectId, grade, courseId, courseSubjectId, chapterId, topicId, teacherId, scheduledAt, duration, teacher, joinUrl, isPublished } = req.body;
  if (!title || !scheduledAt || !teacher) {
    res.status(400).json({ error: "title, scheduledAt, teacher are required" });
    return;
  }

  let resolvedGrade = grade ? Number(grade) : null;
  if (!resolvedGrade && courseId) {
    const [course] = await db.select({ grade: coursesTable.grade }).from(coursesTable).where(eq(coursesTable.id, Number(courseId)));
    if (course) resolvedGrade = course.grade;
  }
  if (!resolvedGrade) {
    res.status(400).json({ error: "grade is required (or select a course)" });
    return;
  }

  const [lc] = await db.insert(liveClassesTable).values({
    title,
    subjectId: subjectId ? Number(subjectId) : null,
    grade: resolvedGrade,
    courseId: courseId ? Number(courseId) : null,
    courseSubjectId: courseSubjectId ? Number(courseSubjectId) : null,
    chapterId: chapterId ? Number(chapterId) : null,
    topicId: topicId ? Number(topicId) : null,
    teacherId: teacherId ?? null,
    scheduledAt: new Date(scheduledAt),
    duration: duration ?? 60,
    teacher,
    joinUrl: joinUrl ?? null,
    status: "upcoming",
    isPublished: isPublished !== false,
  }).returning();

  await logAudit(
    req.authUser!.id, req.authUser!.name,
    "live_class_created", "live_class", lc.id, lc.title,
  );

  res.status(201).json(lc);
});

router.post("/admin/homework", adminOnly, async (req, res) => {
  const { title, subjectId, grade, courseId, topicId, teacherId, dueDate, description, maxMarks, isPublished } = req.body;
  if (!title || !subjectId || !grade || !dueDate) {
    res.status(400).json({ error: "title, subjectId, grade, dueDate are required" });
    return;
  }
  const [hw] = await db.insert(homeworkTable).values({
    title, subjectId, grade,
    courseId: courseId ?? null,
    topicId: topicId ?? null,
    teacherId: teacherId ?? null,
    dueDate: new Date(dueDate),
    description: description ?? null,
    maxMarks: maxMarks ?? 10,
    isPublished: isPublished !== false,
  }).returning();

  await logAudit(
    req.authUser!.id, req.authUser!.name,
    "homework_created", "homework", hw.id, hw.title,
  );

  res.status(201).json(hw);
});

router.post("/admin/assignments", adminOnly, async (req, res) => {
  const { title, subjectId, grade, courseId, topicId, teacherId, dueDate, description, maxMarks, attachmentUrl, isPublished } = req.body;
  if (!title || !subjectId || !grade || !dueDate) {
    res.status(400).json({ error: "title, subjectId, grade, dueDate are required" });
    return;
  }
  const [asgn] = await db.insert(assignmentsTable).values({
    title, subjectId, grade,
    courseId: courseId ?? null,
    topicId: topicId ?? null,
    teacherId: teacherId ?? null,
    dueDate: new Date(dueDate),
    description: description ?? null,
    maxMarks: maxMarks ?? 20,
    attachmentUrl: attachmentUrl ?? null,
    isPublished: isPublished !== false,
  }).returning();

  await logAudit(
    req.authUser!.id, req.authUser!.name,
    "assignment_created", "assignment", asgn.id, asgn.title,
  );

  res.status(201).json(asgn);
});

router.post("/admin/recordings", adminOnly, async (req, res) => {
  const { title, subjectId, grade, courseId, topicId, teacherId, recordedAt, teacher, videoUrl, duration, thumbnailUrl, isPublished } = req.body;
  if (!title || !subjectId || !grade || !videoUrl || !teacher || !duration || !recordedAt) {
    res.status(400).json({ error: "title, subjectId, grade, videoUrl, teacher, duration, recordedAt are required" });
    return;
  }
  const [rec] = await db.insert(recordingsTable).values({
    title, subjectId, grade,
    courseId: courseId ?? null,
    topicId: topicId ?? null,
    teacherId: teacherId ?? null,
    recordedAt: new Date(recordedAt),
    teacher, videoUrl,
    duration,
    thumbnailUrl: thumbnailUrl ?? null,
    isPublished: isPublished !== false,
  }).returning();

  await logAudit(
    req.authUser!.id, req.authUser!.name,
    "recording_created", "recording", rec.id, rec.title,
  );

  res.status(201).json(rec);
});

router.post("/admin/tests", adminOnly, async (req, res) => {
  const { title, subjectId, grade, courseId, topicId, teacherId, scheduledAt, duration, totalQuestions, isPublished } = req.body;
  if (!title || !subjectId || !grade || !scheduledAt) {
    res.status(400).json({ error: "title, subjectId, grade, scheduledAt are required" });
    return;
  }
  const [test] = await db.insert(testsTable).values({
    title, subjectId, grade,
    courseId: courseId ?? null,
    topicId: topicId ?? null,
    teacherId: teacherId ?? null,
    scheduledAt: new Date(scheduledAt),
    duration: duration ?? 30,
    totalQuestions: totalQuestions ?? 10,
    status: "upcoming",
    isPublished: isPublished !== false,
  }).returning();

  await logAudit(
    req.authUser!.id, req.authUser!.name,
    "test_created", "test", test.id, test.title,
  );

  res.status(201).json(test);
});

// ── Submission Overview ──────────────────────────────────────────
router.get("/admin/submissions/homework", adminOnly, async (req, res) => {
  const rows = await db.select({
    id: homeworkSubmissionsTable.id,
    homeworkId: homeworkSubmissionsTable.homeworkId,
    homeworkTitle: homeworkTable.title,
    studentId: homeworkSubmissionsTable.studentId,
    studentName: usersTable.name,
    answer: homeworkSubmissionsTable.answer,
    status: homeworkSubmissionsTable.status,
    marks: homeworkSubmissionsTable.marks,
    submittedAt: homeworkSubmissionsTable.submittedAt,
  })
    .from(homeworkSubmissionsTable)
    .innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
    .innerJoin(usersTable, eq(homeworkSubmissionsTable.studentId, usersTable.id))
    .orderBy(desc(homeworkSubmissionsTable.submittedAt))
    .limit(100);
  res.json(rows);
});

router.get("/admin/submissions/assignments", adminOnly, async (req, res) => {
  const rows = await db.select({
    id: assignmentSubmissionsTable.id,
    assignmentId: assignmentSubmissionsTable.assignmentId,
    assignmentTitle: assignmentsTable.title,
    studentId: assignmentSubmissionsTable.studentId,
    studentName: usersTable.name,
    answer: assignmentSubmissionsTable.answer,
    status: assignmentSubmissionsTable.status,
    marks: assignmentSubmissionsTable.marks,
    submittedAt: assignmentSubmissionsTable.submittedAt,
  })
    .from(assignmentSubmissionsTable)
    .innerJoin(assignmentsTable, eq(assignmentSubmissionsTable.assignmentId, assignmentsTable.id))
    .innerJoin(usersTable, eq(assignmentSubmissionsTable.studentId, usersTable.id))
    .orderBy(desc(assignmentSubmissionsTable.submittedAt))
    .limit(100);
  res.json(rows);
});

// ── Change Own Password ───────────────────────────────────────
router.patch("/admin/me/password", adminOnly, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) { res.status(400).json({ error: "Both passwords required" }); return; }
  const adminId = req.authUser!.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, adminId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.passwordHash && user.passwordHash !== hashPassword(currentPassword)) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  await db.update(usersTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(usersTable.id, adminId));

  await logAudit(
    adminId, user.name,
    "password_changed", "user", adminId, user.name,
    JSON.stringify({ self: true }),
  );

  res.json({ ok: true });
});

// ── Audit Logs ─────────────────────────────────────────────────
router.get("/admin/audit-logs", adminOnly, async (req, res) => {
  const { start, end } = req.query;
  const startDate = start ? new Date(String(start)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = end ? new Date(String(end)) : new Date();

  const logs = await db.select()
    .from(auditLogsTable)
    .where(gte(auditLogsTable.createdAt, startDate))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(200);

  res.json(logs);
});

export default router;
