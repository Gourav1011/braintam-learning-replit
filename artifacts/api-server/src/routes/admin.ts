import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, coursesTable, subjectsTable,
  teacherCoursesTable, enrollmentsTable,
  liveClassesTable, homeworkTable, assignmentsTable,
  recordingsTable, testsTable,
  homeworkSubmissionsTable, assignmentSubmissionsTable, testSubmissionsTable,
  auditLogsTable, courseSubjectsTable, chaptersTable, topicsTable,
  academicYearsTable, announcementsTable, bannersTable, pointsLedgerTable,
  mentorStudentAssignmentsTable, studentTimelineTable, mentorFollowUpsTable, mentorAttendanceTable,
} from "@workspace/db";
import { eq, and, desc, sql, gte, lt, isNull, inArray } from "drizzle-orm";

function computeCrmHealth(s: { lastLoginDate: Date | null; hwPct: number; testTotal: number }): { healthScore: number; riskLevel: "excellent" | "good" | "attention" | "at-risk"; daysSinceLogin: number } {
  const daysSinceLogin = s.lastLoginDate ? Math.floor((Date.now() - new Date(s.lastLoginDate).getTime()) / 86400000) : 999;
  const loginScore = daysSinceLogin <= 1 ? 100 : daysSinceLogin <= 3 ? 80 : daysSinceLogin <= 7 ? 60 : 30;
  const healthScore = Math.round((s.hwPct * 0.5) + (loginScore * 0.3) + (s.testTotal > 0 ? 20 : 0));
  const riskLevel: "excellent" | "good" | "attention" | "at-risk" = healthScore >= 90 ? "excellent" : healthScore >= 75 ? "good" : healthScore >= 50 ? "attention" : "at-risk";
  return { healthScore, riskLevel, daysSinceLogin };
}
function computeCrmFuStatus(nextFollowUpDate: string | null, callStatus: string | null): { fuStatus: "due_today" | "overdue" | "upcoming" | "completed"; daysOverdue: number } {
  if (callStatus === "completed") return { fuStatus: "completed", daysOverdue: 0 };
  if (!nextFollowUpDate) return { fuStatus: "upcoming", daysOverdue: 0 };
  const today = new Date().toISOString().slice(0, 10);
  if (nextFollowUpDate === today) return { fuStatus: "due_today", daysOverdue: 0 };
  if (nextFollowUpDate < today) return { fuStatus: "overdue", daysOverdue: Math.floor((new Date(today).getTime() - new Date(nextFollowUpDate).getTime()) / 86400000) };
  return { fuStatus: "upcoming", daysOverdue: 0 };
}
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
  const { role, accountType } = req.query;
  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    phone: usersTable.phone,
    role: usersTable.role,
    accountType: usersTable.accountType,
    grade: usersTable.grade,
    school: usersTable.school,
    isActive: usersTable.isActive,
    createdAt: usersTable.createdAt,
    points: usersTable.points,
    lastLoginAt: usersTable.lastLoginDate,
  })
    .from(usersTable)
    .where(
      role ? eq(usersTable.role, String(role)) :
      accountType ? eq(usersTable.accountType, String(accountType)) :
      undefined
    )
    .orderBy(desc(usersTable.createdAt));
  res.json(users);
});

router.post("/admin/users/:id/convert-to-paid", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db.update(usersTable)
    .set({ accountType: "paid_student", updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  await logAction({ actorId: req.authUser!.id, actorName: req.authUser!.name, action: "convert_to_paid", targetType: "user", targetId: id, targetName: updated.name });
  res.json(updated);
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
  const { name, role, grade, school, isActive, password, email } = req.body;
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email || null;
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
  const { status, joinUrl, title, teacher, grade, scheduledAt, duration } = req.body;
  const updates: Partial<typeof liveClassesTable.$inferInsert> = {};
  if (status !== undefined) updates.status = status;
  if (joinUrl !== undefined) updates.joinUrl = joinUrl;
  if (title !== undefined) updates.title = title;
  if (teacher !== undefined) updates.teacher = teacher;
  if (grade !== undefined) updates.grade = Number(grade);
  if (scheduledAt !== undefined) updates.scheduledAt = new Date(scheduledAt);
  if (duration !== undefined) updates.duration = Number(duration);
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

// ── Academic Years ────────────────────────────────────────────────
router.get("/admin/academic-years", adminOnly, async (req, res) => {
  const rows = await db.select().from(academicYearsTable).orderBy(desc(academicYearsTable.createdAt));
  res.json(rows);
});

router.post("/admin/academic-years", adminOnly, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  const [yr] = await db.insert(academicYearsTable).values({ name: name.trim() }).returning();
  res.status(201).json(yr);
});

router.put("/admin/academic-years/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { isActive } = req.body;
  const [yr] = await db.update(academicYearsTable).set({ isActive }).where(eq(academicYearsTable.id, id)).returning();
  if (!yr) { res.status(404).json({ error: "Not found" }); return; }
  res.json(yr);
});

router.delete("/admin/academic-years/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(academicYearsTable).where(eq(academicYearsTable.id, id));
  res.json({ success: true });
});

// ── Announcements ─────────────────────────────────────────────────
router.get("/admin/announcements", adminOnly, async (req, res) => {
  const rows = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt)).limit(100);
  res.json(rows);
});

router.post("/admin/announcements", adminOnly, async (req, res) => {
  const { title, body, grade, targetRole } = req.body;
  if (!title?.trim() || !body?.trim()) { res.status(400).json({ error: "title and body are required" }); return; }
  const [ann] = await db.insert(announcementsTable).values({
    title: title.trim(), body: body.trim(),
    grade: grade ? Number(grade) : null,
    targetRole: targetRole ?? "all",
    createdBy: req.authUser!.id,
  }).returning();
  res.status(201).json(ann);
});

router.patch("/admin/announcements/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { isActive } = req.body;
  const [ann] = await db.update(announcementsTable).set({ isActive }).where(eq(announcementsTable.id, id)).returning();
  if (!ann) { res.status(404).json({ error: "Not found" }); return; }
  res.json(ann);
});

router.delete("/admin/announcements/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.json({ success: true });
});

// ── Banners ───────────────────────────────────────────────────────
router.get("/admin/banners", adminOnly, async (req, res) => {
  const rows = await db.select().from(bannersTable).orderBy(bannersTable.displayOrder);
  res.json(rows);
});

router.post("/admin/banners", adminOnly, async (req, res) => {
  const { title, imageUrl, link, displayOrder } = req.body;
  if (!title?.trim() || !imageUrl?.trim()) { res.status(400).json({ error: "title and imageUrl are required" }); return; }
  const [banner] = await db.insert(bannersTable).values({
    title: title.trim(), imageUrl: imageUrl.trim(),
    link: link ?? null,
    displayOrder: displayOrder ? Number(displayOrder) : 0,
  }).returning();
  res.status(201).json(banner);
});

router.patch("/admin/banners/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { isActive, displayOrder } = req.body;
  const updates: Partial<typeof bannersTable.$inferInsert> = {};
  if (isActive !== undefined) updates.isActive = isActive;
  if (displayOrder !== undefined) updates.displayOrder = Number(displayOrder);
  const [banner] = await db.update(bannersTable).set(updates).where(eq(bannersTable.id, id)).returning();
  if (!banner) { res.status(404).json({ error: "Not found" }); return; }
  res.json(banner);
});

router.delete("/admin/banners/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(bannersTable).where(eq(bannersTable.id, id));
  res.json({ success: true });
});

// ── Course Subjects / Chapters / Topics (for live-class scheduling) ──
router.get("/admin/course-subjects", adminOnly, async (req, res) => {
  const courseId = Number(req.query.courseId);
  if (!courseId) { res.status(400).json({ error: "courseId required" }); return; }
  const rows = await db.select().from(courseSubjectsTable)
    .where(eq(courseSubjectsTable.courseId, courseId))
    .orderBy(courseSubjectsTable.name);
  res.json(rows);
});

router.get("/admin/chapters", adminOnly, async (req, res) => {
  const courseSubjectId = Number(req.query.courseSubjectId);
  if (!courseSubjectId) { res.status(400).json({ error: "courseSubjectId required" }); return; }
  const rows = await db.select().from(chaptersTable)
    .where(eq(chaptersTable.courseSubjectId, courseSubjectId))
    .orderBy(chaptersTable.order, chaptersTable.name);
  res.json(rows);
});

router.get("/admin/topics", adminOnly, async (req, res) => {
  const chapterId = Number(req.query.chapterId);
  if (!chapterId) { res.status(400).json({ error: "chapterId required" }); return; }
  const rows = await db.select().from(topicsTable)
    .where(eq(topicsTable.chapterId, chapterId))
    .orderBy(topicsTable.order, topicsTable.name);
  res.json(rows);
});

router.post("/admin/course-subjects", adminOnly, async (req, res) => {
  const { courseId, name, description, thumbnailUrl } = req.body;
  if (!courseId || !name?.trim()) { res.status(400).json({ error: "courseId and name are required" }); return; }
  const [sub] = await db.insert(courseSubjectsTable).values({
    courseId: Number(courseId), name: name.trim(),
    description: description ?? null, thumbnailUrl: thumbnailUrl ?? null,
  }).returning();
  res.status(201).json(sub);
});

router.put("/admin/course-subjects/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, thumbnailUrl } = req.body;
  const [sub] = await db.update(courseSubjectsTable).set({
    name: name?.trim(), description: description ?? null, thumbnailUrl: thumbnailUrl ?? null,
  }).where(eq(courseSubjectsTable.id, id)).returning();
  if (!sub) { res.status(404).json({ error: "Not found" }); return; }
  res.json(sub);
});

router.delete("/admin/course-subjects/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(topicsTable).where(
    sql`${topicsTable.chapterId} IN (SELECT id FROM chapters WHERE course_subject_id = ${id})`
  );
  await db.delete(chaptersTable).where(eq(chaptersTable.courseSubjectId, id));
  await db.delete(courseSubjectsTable).where(eq(courseSubjectsTable.id, id));
  res.json({ success: true });
});

router.post("/admin/chapters", adminOnly, async (req, res) => {
  const { courseSubjectId, courseId, name, description, sequenceNo, order } = req.body;
  if (!courseSubjectId || !name?.trim()) { res.status(400).json({ error: "courseSubjectId and name are required" }); return; }
  const [course] = courseId
    ? await db.select({ grade: coursesTable.grade }).from(coursesTable).where(eq(coursesTable.id, Number(courseId)))
    : [];
  const grade = course?.grade ?? 1;
  const [ch] = await db.insert(chaptersTable).values({
    courseSubjectId: Number(courseSubjectId), courseId: courseId ? Number(courseId) : null,
    name: name.trim(), description: description ?? null,
    sequenceNo: sequenceNo ? Number(sequenceNo) : null,
    order: order ?? 0, grade,
  }).returning();
  res.status(201).json(ch);
});

router.delete("/admin/chapters/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(topicsTable).where(eq(topicsTable.chapterId, id));
  await db.delete(chaptersTable).where(eq(chaptersTable.id, id));
  res.json({ success: true });
});

router.post("/admin/topics", adminOnly, async (req, res) => {
  const { chapterId, name, description, learningObjective, topicStatus, order } = req.body;
  if (!chapterId || !name?.trim()) { res.status(400).json({ error: "chapterId and name are required" }); return; }
  const [tp] = await db.insert(topicsTable).values({
    chapterId: Number(chapterId), name: name.trim(),
    description: description ?? null, learningObjective: learningObjective ?? null,
    topicStatus: topicStatus ?? "active", order: order ?? 0,
  }).returning();
  res.status(201).json(tp);
});

router.delete("/admin/topics/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(topicsTable).where(eq(topicsTable.id, id));
  res.json({ success: true });
});

router.get("/admin/topic-content/:id", adminOnly, async (req, res) => {
  const topicId = Number(req.params.id);
  if (!topicId) { res.status(400).json({ error: "Invalid id" }); return; }
  const [lcCount, hwCount, asnCount, tstCount, recCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(liveClassesTable).where(eq(liveClassesTable.topicId, topicId)),
    db.select({ count: sql<number>`count(*)` }).from(homeworkTable).where(eq(homeworkTable.topicId, topicId)),
    db.select({ count: sql<number>`count(*)` }).from(assignmentsTable).where(eq(assignmentsTable.topicId, topicId)),
    db.select({ count: sql<number>`count(*)` }).from(testsTable).where(eq(testsTable.topicId, topicId)),
    db.select({ count: sql<number>`count(*)` }).from(recordingsTable).where(eq(recordingsTable.topicId, topicId)),
  ]);
  res.json({
    liveClasses: Number(lcCount[0]?.count ?? 0),
    homework: Number(hwCount[0]?.count ?? 0),
    assignments: Number(asnCount[0]?.count ?? 0),
    tests: Number(tstCount[0]?.count ?? 0),
    recordings: Number(recCount[0]?.count ?? 0),
  });
});

// ── In-memory Gamification Settings ──────────────────────────
const gamificationSettings = {
  xpEnabled: true,
  leaderboardEnabled: true,
  dailyMissionsEnabled: true,
  spaceJourneyEnabled: true,
  xpValues: { login: 10, homework: 15, test: 20, recording: 5, liveClass: 10, competition: 50, referral: 25 },
};

router.get("/admin/gamification/settings", adminOnly, (_req, res) => {
  res.json(gamificationSettings);
});

router.put("/admin/gamification/settings", adminOnly, (req, res) => {
  const { xpEnabled, leaderboardEnabled, dailyMissionsEnabled, spaceJourneyEnabled, xpValues } = req.body;
  if (xpEnabled !== undefined) gamificationSettings.xpEnabled = Boolean(xpEnabled);
  if (leaderboardEnabled !== undefined) gamificationSettings.leaderboardEnabled = Boolean(leaderboardEnabled);
  if (dailyMissionsEnabled !== undefined) gamificationSettings.dailyMissionsEnabled = Boolean(dailyMissionsEnabled);
  if (spaceJourneyEnabled !== undefined) gamificationSettings.spaceJourneyEnabled = Boolean(spaceJourneyEnabled);
  if (xpValues && typeof xpValues === "object") {
    gamificationSettings.xpValues = { ...gamificationSettings.xpValues, ...xpValues };
  }
  res.json(gamificationSettings);
});

// ── Premium Dashboard KPIs ────────────────────────────────────
router.get("/admin/dashboard", adminOnly, async (_req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    [students], [teachers], [mentors_], [admins_],
    [courses_], [lcWeek],
    [hwWeek], [testWeek], [activeToday], [xpToday], [enrolls],
    gradeRows, teacherRows, mentorRows,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true))),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.role, "teacher"), eq(usersTable.isActive, true))),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.role, "mentor"), eq(usersTable.isActive, true))),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.role, "admin"), eq(usersTable.isActive, true))),
    db.select({ count: sql<number>`count(*)` }).from(coursesTable),
    db.select({ count: sql<number>`count(*)` }).from(liveClassesTable).where(gte(liveClassesTable.scheduledAt, thisWeek)),
    db.select({ count: sql<number>`count(*)` }).from(homeworkSubmissionsTable).where(gte(homeworkSubmissionsTable.submittedAt, thisWeek)),
    db.select({ count: sql<number>`count(*)` }).from(testSubmissionsTable).where(gte(testSubmissionsTable.submittedAt, thisWeek)),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.role, "student"), gte(usersTable.lastLoginDate, today))),
    db.select({ count: sql<number>`count(distinct user_id)` }).from(pointsLedgerTable).where(gte(pointsLedgerTable.createdAt, today)),
    db.select({ count: sql<number>`count(*)` }).from(enrollmentsTable),
    // Grade-wise student breakdown
    db.select({ grade: usersTable.grade, count: sql<number>`count(*)` })
      .from(usersTable).where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true)))
      .groupBy(usersTable.grade).orderBy(usersTable.grade),
    // Teacher-wise: name + course count (via teacher_courses) + live class count
    db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      isActive: usersTable.isActive,
      courseCount: sql<number>`(select count(*) from teacher_courses where teacher_id = users.id)`,
      lcCount: sql<number>`(select count(*) from live_classes where teacher_id = users.id)`,
    }).from(usersTable).where(eq(usersTable.role, "teacher")).orderBy(usersTable.name),
    // Mentor-wise: name + student count
    db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      isActive: usersTable.isActive,
      studentCount: sql<number>`(select count(*) from mentor_student_assignments where mentor_id = users.id and is_active = true)`,
    }).from(usersTable).where(eq(usersTable.role, "mentor")).orderBy(usersTable.name),
  ]);

  res.json({
    totalStudents: Number(students.count),
    totalTeachers: Number(teachers.count),
    totalMentors: Number(mentors_.count),
    totalAdmins: Number(admins_.count),
    activeCourses: Number(courses_.count),
    liveClassesThisWeek: Number(lcWeek.count),
    hwSubmittedThisWeek: Number(hwWeek.count),
    testsCompletedThisWeek: Number(testWeek.count),
    activeStudentsToday: Number(activeToday.count),
    studentsEarningXPToday: Number(xpToday.count),
    totalEnrollments: Number(enrolls.count),
    gradeBreakdown: gradeRows.map(r => ({ grade: r.grade, count: Number(r.count) })),
    teacherBreakdown: teacherRows.map(r => ({ id: r.id, name: r.name, email: r.email, isActive: r.isActive, courseCount: Number(r.courseCount), lcCount: Number(r.lcCount) })),
    mentorBreakdown: mentorRows.map(r => ({ id: r.id, name: r.name, email: r.email, isActive: r.isActive, studentCount: Number(r.studentCount) })),
  });
});

// ── Student 360 Profile ───────────────────────────────────────
router.get("/admin/students/:id/360", adminOnly, async (req, res) => {
  const studentId = parseInt(String(req.params.id), 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [profile] = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email,
    phone: usersTable.phone, grade: usersTable.grade, school: usersTable.school,
    board: usersTable.board, state: usersTable.state, city: usersTable.city,
    points: usersTable.points, rank: usersTable.rank, streakDays: usersTable.streakDays,
    isActive: usersTable.isActive, createdAt: usersTable.createdAt,
    lastLoginAt: usersTable.lastLoginDate,
  }).from(usersTable).where(eq(usersTable.id, studentId)).limit(1);

  if (!profile) { res.status(404).json({ error: "Student not found" }); return; }

  const [enrolledCourses, recentHw, recentTests, recentAssignments, xpHistory] = await Promise.all([
    db.select({
      courseId: coursesTable.id, title: coursesTable.title,
      grade: coursesTable.grade, teacher: coursesTable.teacher,
      enrolledAt: enrollmentsTable.enrolledAt,
    }).from(enrollmentsTable)
      .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
      .where(eq(enrollmentsTable.studentId, studentId))
      .orderBy(desc(enrollmentsTable.enrolledAt)),

    db.select({
      id: homeworkSubmissionsTable.id, title: homeworkTable.title,
      status: homeworkSubmissionsTable.status, marks: homeworkSubmissionsTable.marks,
      submittedAt: homeworkSubmissionsTable.submittedAt,
    }).from(homeworkSubmissionsTable)
      .innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
      .where(eq(homeworkSubmissionsTable.studentId, studentId))
      .orderBy(desc(homeworkSubmissionsTable.submittedAt)).limit(8),

    db.select({
      id: testSubmissionsTable.id, title: testsTable.title,
      score: testSubmissionsTable.score, maxScore: testSubmissionsTable.maxScore,
      submittedAt: testSubmissionsTable.submittedAt,
    }).from(testSubmissionsTable)
      .innerJoin(testsTable, eq(testSubmissionsTable.testId, testsTable.id))
      .where(eq(testSubmissionsTable.studentId, studentId))
      .orderBy(desc(testSubmissionsTable.submittedAt)).limit(8),

    db.select({
      id: assignmentSubmissionsTable.id, title: assignmentsTable.title,
      status: assignmentSubmissionsTable.status, marks: assignmentSubmissionsTable.marks,
      submittedAt: assignmentSubmissionsTable.submittedAt,
    }).from(assignmentSubmissionsTable)
      .innerJoin(assignmentsTable, eq(assignmentSubmissionsTable.assignmentId, assignmentsTable.id))
      .where(eq(assignmentSubmissionsTable.studentId, studentId))
      .orderBy(desc(assignmentSubmissionsTable.submittedAt)).limit(8),

    db.select({
      amount: pointsLedgerTable.amount, actionType: pointsLedgerTable.actionType,
      note: pointsLedgerTable.note, createdAt: pointsLedgerTable.createdAt,
    }).from(pointsLedgerTable)
      .where(eq(pointsLedgerTable.userId, studentId))
      .orderBy(desc(pointsLedgerTable.createdAt)).limit(12),
  ]);

  const pts = profile.points ?? 0;
  const spaceLevel = pts >= 5000 ? "Universe Champion"
    : pts >= 2500 ? "Galaxy Master"
    : pts >= 1000 ? "Saturn Explorer"
    : pts >= 500 ? "Mars Explorer"
    : pts >= 100 ? "Moon Explorer"
    : "Earth Explorer";

  res.json({ profile, enrolledCourses, recentHw, recentTests, recentAssignments, xpHistory, spaceLevel });
});

// ── Course Analytics ──────────────────────────────────────────
router.get("/admin/analytics/courses", adminOnly, async (_req, res) => {
  const courses = await db.select({
    id: coursesTable.id, title: coursesTable.title,
    grade: coursesTable.grade, teacher: coursesTable.teacher,
  }).from(coursesTable).orderBy(coursesTable.grade, coursesTable.title);

  if (courses.length === 0) { res.json([]); return; }

  const [enrollRows, testRows, hwRows] = await Promise.all([
    db.select({ courseId: enrollmentsTable.courseId, count: sql<number>`count(*)` })
      .from(enrollmentsTable).groupBy(enrollmentsTable.courseId),

    db.select({
      courseId: sql<number>`${testsTable.courseId}`,
      total: sql<number>`count(distinct ${testsTable.id})`,
      submitted: sql<number>`count(distinct ${testSubmissionsTable.id})`,
      avgScore: sql<number | null>`round(avg(${testSubmissionsTable.score})::numeric, 1)`,
    }).from(testsTable)
      .leftJoin(testSubmissionsTable, eq(testSubmissionsTable.testId, testsTable.id))
      .where(sql`${testsTable.courseId} IS NOT NULL`)
      .groupBy(sql`${testsTable.courseId}`),

    db.select({
      courseId: sql<number>`${homeworkTable.courseId}`,
      total: sql<number>`count(distinct ${homeworkTable.id})`,
      submitted: sql<number>`count(distinct ${homeworkSubmissionsTable.id})`,
    }).from(homeworkTable)
      .leftJoin(homeworkSubmissionsTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
      .where(sql`${homeworkTable.courseId} IS NOT NULL`)
      .groupBy(sql`${homeworkTable.courseId}`),
  ]);

  const enrollMap = Object.fromEntries(enrollRows.map(r => [r.courseId, Number(r.count)]));
  const testMap = Object.fromEntries(testRows.map(r => [r.courseId, {
    total: Number(r.total), submitted: Number(r.submitted),
    avgScore: r.avgScore != null ? Number(r.avgScore) : null,
  }]));
  const hwMap = Object.fromEntries(hwRows.map(r => [r.courseId, {
    total: Number(r.total), submitted: Number(r.submitted),
  }]));

  res.json(courses.map(c => {
    const hw = hwMap[c.id] ?? { total: 0, submitted: 0 };
    const ts = testMap[c.id] ?? { total: 0, submitted: 0, avgScore: null };
    return {
      ...c,
      enrolled: enrollMap[c.id] ?? 0,
      hwTotal: hw.total, hwSubmitted: hw.submitted,
      hwRate: hw.total ? Math.round((hw.submitted / hw.total) * 100) : 0,
      testTotal: ts.total, testSubmitted: ts.submitted,
      testRate: ts.total ? Math.round((ts.submitted / ts.total) * 100) : 0,
      avgScore: ts.avgScore,
    };
  }));
});

// ── Teacher Analytics ─────────────────────────────────────────
router.get("/admin/analytics/teachers", adminOnly, async (_req, res) => {
  const teachers = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email,
  }).from(usersTable).where(eq(usersTable.role, "teacher")).orderBy(usersTable.name);

  if (teachers.length === 0) { res.json([]); return; }
  const teacherIds = teachers.map(t => t.id);

  const [courseRows, lcRows, hwRows] = await Promise.all([
    db.select({ teacherId: teacherCoursesTable.teacherId, count: sql<number>`count(*)` })
      .from(teacherCoursesTable).where(inArray(teacherCoursesTable.teacherId, teacherIds))
      .groupBy(teacherCoursesTable.teacherId),

    db.select({ teacherId: sql<number>`teacher_id`, count: sql<number>`count(*)` })
      .from(liveClassesTable)
      .where(sql`teacher_id IS NOT NULL AND teacher_id = ANY(ARRAY[${sql.raw(teacherIds.join(","))}]::int[])`)
      .groupBy(sql`teacher_id`),

    db.select({ teacherId: sql<number>`${homeworkTable.teacherId}`, count: sql<number>`count(*)` })
      .from(homeworkSubmissionsTable)
      .innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
      .where(and(
        eq(homeworkSubmissionsTable.status, "graded"),
        sql`${homeworkTable.teacherId} = ANY(ARRAY[${sql.raw(teacherIds.join(","))}]::int[])`,
      ))
      .groupBy(sql`${homeworkTable.teacherId}`),
  ]);

  const cMap = Object.fromEntries(courseRows.map(r => [r.teacherId, Number(r.count)]));
  const lcMap = Object.fromEntries(lcRows.map(r => [r.teacherId, Number(r.count)]));
  const hwMap = Object.fromEntries(hwRows.map(r => [r.teacherId, Number(r.count)]));

  res.json(teachers.map(t => ({
    ...t,
    coursesAssigned: cMap[t.id] ?? 0,
    classesTotal: lcMap[t.id] ?? 0,
    hwGraded: hwMap[t.id] ?? 0,
  })));
});

// ── Learning Health ───────────────────────────────────────────
router.get("/admin/health", adminOnly, async (_req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const baseWhere = and(eq(usersTable.role, "student"), eq(usersTable.isActive, true));

  const [neverLoggedIn, inactiveStudents, noTestStudents] = await Promise.all([
    db.select({
      id: usersTable.id, name: usersTable.name,
      email: usersTable.email, phone: usersTable.phone,
      grade: usersTable.grade, createdAt: usersTable.createdAt,
    }).from(usersTable)
      .where(and(baseWhere!, isNull(usersTable.lastLoginDate)))
      .orderBy(desc(usersTable.createdAt)).limit(25),

    db.select({
      id: usersTable.id, name: usersTable.name,
      email: usersTable.email, phone: usersTable.phone,
      grade: usersTable.grade, lastLoginAt: usersTable.lastLoginDate,
    }).from(usersTable)
      .where(and(baseWhere!, sql`${usersTable.lastLoginDate} IS NOT NULL`, lt(usersTable.lastLoginDate, sevenDaysAgo)))
      .orderBy(usersTable.lastLoginDate).limit(25),

    db.select({
      id: usersTable.id, name: usersTable.name,
      email: usersTable.email, grade: usersTable.grade,
    }).from(usersTable)
      .where(and(
        baseWhere!,
        sql`${usersTable.id} NOT IN (SELECT DISTINCT student_id FROM test_submissions)`,
      ))
      .limit(25),
  ]);

  res.json({
    neverLoggedIn,
    inactiveStudents,
    noTestStudents,
    counts: {
      neverLoggedIn: neverLoggedIn.length,
      inactiveStudents: inactiveStudents.length,
      noTestStudents: noTestStudents.length,
    },
  });
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

// ── Student CRM Profile (BTL CRM data for any student) ────────────────────
router.get("/admin/students/:id/crm", adminOnly, async (req, res) => {
  const studentId = parseInt(String(req.params.id), 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [student] = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email,
    phone: usersTable.phone, grade: usersTable.grade, school: usersTable.school,
    lastLoginDate: usersTable.lastLoginDate, isActive: usersTable.isActive,
    leadStage: usersTable.leadStage, parentName: usersTable.parentName, parentPhone: usersTable.parentPhone,
  }).from(usersTable).where(eq(usersTable.id, studentId)).limit(1);

  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const [hwCounts, testCounts, attCounts, mentorRows, timeline, followUps] = await Promise.all([
    db.select({ total: sql<number>`count(*)`, done: sql<number>`count(*) filter (where status != 'pending')` })
      .from(homeworkSubmissionsTable).where(eq(homeworkSubmissionsTable.studentId, studentId)),
    db.select({ total: sql<number>`count(*)` })
      .from(testSubmissionsTable).where(eq(testSubmissionsTable.studentId, studentId)),
    db.select({ total: sql<number>`count(*)`, present: sql<number>`count(*) filter (where status = 'present')` })
      .from(mentorAttendanceTable).where(eq(mentorAttendanceTable.studentId, studentId)),
    db.select({ mentorId: mentorStudentAssignmentsTable.mentorId, mentorName: usersTable.name, mentorEmail: usersTable.email })
      .from(mentorStudentAssignmentsTable)
      .leftJoin(usersTable, eq(usersTable.id, mentorStudentAssignmentsTable.mentorId))
      .where(and(eq(mentorStudentAssignmentsTable.studentId, studentId), eq(mentorStudentAssignmentsTable.isActive, true)))
      .limit(1),
    db.select({
      id: studentTimelineTable.id, noteType: studentTimelineTable.noteType,
      remark: studentTimelineTable.remark, followUpDate: studentTimelineTable.followUpDate,
      actionTaken: studentTimelineTable.actionTaken, createdAt: studentTimelineTable.createdAt,
      createdByName: studentTimelineTable.createdByName, createdByRole: studentTimelineTable.createdByRole,
    }).from(studentTimelineTable).where(eq(studentTimelineTable.studentId, studentId))
      .orderBy(desc(studentTimelineTable.createdAt)).limit(50),
    db.select({
      id: mentorFollowUpsTable.id, noteType: mentorFollowUpsTable.noteType,
      note: mentorFollowUpsTable.note, callStatus: mentorFollowUpsTable.callStatus,
      nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate, createdAt: mentorFollowUpsTable.createdAt,
      leadStatus: mentorFollowUpsTable.leadStatus,
    }).from(mentorFollowUpsTable).where(eq(mentorFollowUpsTable.studentId, studentId))
      .orderBy(desc(mentorFollowUpsTable.createdAt)).limit(50),
  ]);

  const hwTotal = Number(hwCounts[0]?.total ?? 0);
  const hwDone = Number(hwCounts[0]?.done ?? 0);
  const hwPct = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : 100;
  const { healthScore, riskLevel, daysSinceLogin } = computeCrmHealth({ lastLoginDate: student.lastLoginDate, hwPct, testTotal: Number(testCounts[0]?.total ?? 0) });
  const attTotal = Number(attCounts[0]?.total ?? 0);
  const attendancePct = attTotal > 0 ? Math.round((Number(attCounts[0]?.present ?? 0) / attTotal) * 100) : null;

  res.json({
    student: { ...student, healthScore, riskLevel, daysSinceLogin, hwCompletion: hwPct, attendancePct },
    assignedMentor: mentorRows[0] ?? null,
    timeline,
    followUps: followUps.map(f => ({ ...f, ...computeCrmFuStatus(f.nextFollowUpDate, f.callStatus) })),
  });
});

router.patch("/admin/students/:id/crm", adminOnly, async (req, res) => {
  const studentId = parseInt(String(req.params.id), 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { leadStage, parentName, parentPhone } = req.body;
  const updates: Record<string, unknown> = {};
  if (leadStage !== undefined) updates.leadStage = leadStage || null;
  if (parentName !== undefined) updates.parentName = parentName || null;
  if (parentPhone !== undefined) updates.parentPhone = parentPhone || null;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [row] = await db.update(usersTable).set(updates).where(eq(usersTable.id, studentId)).returning({ id: usersTable.id });
  if (!row) { res.status(404).json({ error: "Student not found" }); return; }
  res.json({ ok: true });
});

export default router;
