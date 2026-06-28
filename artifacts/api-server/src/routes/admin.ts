import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, coursesTable, subjectsTable,
  teacherCoursesTable, enrollmentsTable,
  liveClassesTable, homeworkTable, assignmentsTable,
  recordingsTable, testsTable,
  homeworkSubmissionsTable, assignmentSubmissionsTable, testSubmissionsTable,
  auditLogsTable, courseSubjectsTable, chaptersTable, topicsTable, masteryStudentsTable,
  academicYearsTable, announcementsTable, bannersTable, pointsLedgerTable,
  mentorStudentAssignmentsTable, studentTimelineTable, mentorFollowUpsTable, mentorAttendanceTable,
  attendanceTable,
} from "@workspace/db";
import { eq, and, desc, sql, gte, lt, isNull, inArray, ilike, or } from "drizzle-orm";

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
import { logAction, logFromReq } from "../utils/audit.js";
import crypto from "crypto";

const router = Router();
const adminOnly = requireRole("admin");
const allStaffAuth = requireRole("admin", "teacher", "mentor", "sales_mentor", "academic_mentor");

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
  const { role, accountType, search } = req.query;
  const conditions = [eq(usersTable.isArchived, false)];
  if (role) conditions.push(eq(usersTable.role, String(role)));
  if (accountType) conditions.push(eq(usersTable.accountType, String(accountType)));
  if (search) {
    const q = `%${String(search)}%`;
    conditions.push(or(
      ilike(usersTable.name, q),
      ilike(usersTable.email, q),
      ilike(usersTable.phone, q),
    )!);
  }
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
    .where(and(...conditions))
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
  const {
    name,
    email,
    phone,
    password,
    role,
    grade,
    school,
    accountType,
    leadStage,
    parentName,
    parentPhone,
    city,
    state,
  } = req.body;
  if (!name || !role) {
    res.status(400).json({ error: "name and role are required" });
    return;
  }
  if (!["admin", "teacher", "student", "mentor"].includes(role)) {
    res.status(400).json({ error: "role must be admin, teacher, student, or mentor" });
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
  const defaultAccountType =
    role === "teacher" ? "teacher" :
    role === "admin" ? "admin" :
    role === "student" ? "lead" :
    "lead";

  const [user] = await db.insert(usersTable).values({
    name,
    email: email ?? null,
    phone: phone ?? null,
    passwordHash: password ? hashPassword(password) : null,

    role,

    accountType: accountType ?? defaultAccountType,
    leadStage: leadStage ?? null,

    parentName: parentName ?? null,
    parentPhone: parentPhone ?? null,

    city: city ?? null,
    state: state ?? null,

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
  await db.update(usersTable).set({
    isActive: false,
    isArchived: true,
    archivedAt: new Date(),
    archivedBy: req.authUser!.id,
  }).where(eq(usersTable.id, id));
  if (user) {
    await logAudit(
      req.authUser!.id, req.authUser!.name,
      "user_deleted", "user", user.id, user.name,
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
    courseType: coursesTable.courseType,
    totalLessons: coursesTable.totalLessons,
    thumbnailUrl: coursesTable.thumbnailUrl,
    description: coursesTable.description,
    teacher: coursesTable.teacher,
    rating: coursesTable.rating,
    duration: coursesTable.duration,
    originalPrice: coursesTable.originalPrice,
    scholarshipPrice: coursesTable.scholarshipPrice,
    registrationFee: coursesTable.registrationFee,
    paymentPlansJson: coursesTable.paymentPlansJson,
    studentCapacity: coursesTable.studentCapacity,
    bannerUrl: coursesTable.bannerUrl,
    brochureUrl: coursesTable.brochureUrl,
    mentorIdsJson: coursesTable.mentorIdsJson,
    instanceName: coursesTable.instanceName,
    admissionStatus: coursesTable.admissionStatus,
    startDate: coursesTable.startDate,
    endDate: coursesTable.endDate,
    enrolledCount: sql<number>`(SELECT COUNT(*)::int FROM mastery_students WHERE assigned_course_id = ${coursesTable.id})`,
    subjectsCount: sql<number>`(SELECT COUNT(*)::int FROM course_subjects WHERE course_id = ${coursesTable.id})`,
    topicsCount: sql<number>`(SELECT COUNT(*)::int FROM topics JOIN chapters ON topics.chapter_id = chapters.id WHERE chapters.course_id = ${coursesTable.id})`,
    teachersCount: sql<number>`(SELECT COUNT(*)::int FROM teacher_courses WHERE course_id = ${coursesTable.id})`,
  })
    .from(coursesTable)
    .where(eq(coursesTable.isArchived, false))
    .orderBy(coursesTable.grade, coursesTable.courseType, desc(coursesTable.createdAt));
  res.json(courses.map(c => ({
    ...c,
    subjectName: null,
    courseCode: `CRS${String(c.id).padStart(4, "0")}`,
  })));
});

router.post("/admin/courses", adminOnly, async (req, res) => {
  const { title, subjectId, grade, totalLessons, thumbnailUrl, description, teacher, rating, board, academicYearId, isPublished, status, duration, originalPrice, scholarshipPrice, registrationFee, paymentPlansJson, studentCapacity, bannerUrl, brochureUrl, mentorIdsJson, instanceName, admissionStatus, courseType, startDate, endDate } = req.body;
  if (!title || grade === undefined || grade === null || grade === "") {
    res.status(400).json({ error: "title and grade are required" });
    return;
  }
  try {
    // Auto-generate instanceName if not provided (Course A, B, C, ...)
    let resolvedInstanceName: string | null = instanceName ?? null;
    if (!resolvedInstanceName) {
      const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const existing = await db
        .select({ id: coursesTable.id })
        .from(coursesTable)
        .where(and(
          eq(coursesTable.grade, Number(grade)),
          eq(coursesTable.courseType, courseType ?? "mastery"),
          eq(coursesTable.isArchived, false),
        ));
      resolvedInstanceName = `Course ${LETTERS[existing.length] ?? String(existing.length + 1)}`;
    }

    const [course] = await db.insert(coursesTable).values({
      title, subjectId: subjectId ? Number(subjectId) : null, grade: Number(grade),
      courseType: courseType ?? "mastery",
      totalLessons: totalLessons ?? 0,
      thumbnailUrl: thumbnailUrl || bannerUrl || "",
      description: description ?? null,
      teacher: teacher ?? null,
      rating: rating ?? null,
      board: board ?? null,
      academicYearId: academicYearId ? Number(academicYearId) : null,
      isPublished: isPublished !== false,
      status: status ?? "active",
      duration: duration ?? null,
      originalPrice: originalPrice ? Number(originalPrice) : null,
      scholarshipPrice: scholarshipPrice ? Number(scholarshipPrice) : null,
      registrationFee: registrationFee ? Number(registrationFee) : null,
      paymentPlansJson: paymentPlansJson ?? null,
      studentCapacity: studentCapacity ? Number(studentCapacity) : null,
      bannerUrl: bannerUrl ?? null,
      brochureUrl: brochureUrl ?? null,
      mentorIdsJson: mentorIdsJson ?? null,
      instanceName: resolvedInstanceName,
      admissionStatus: admissionStatus ?? "active",
      startDate: startDate ?? null,
      endDate: endDate ?? null,
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
  const { title, description, teacher, board, academicYearId, isPublished, thumbnailUrl, status, grade, duration, originalPrice, scholarshipPrice, registrationFee, paymentPlansJson, studentCapacity, bannerUrl, brochureUrl, mentorIdsJson, instanceName, admissionStatus, startDate, endDate } = req.body;
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
  if (duration !== undefined) updates.duration = duration || null;
  if (originalPrice !== undefined) updates.originalPrice = originalPrice ? Number(originalPrice) : null;
  if (scholarshipPrice !== undefined) updates.scholarshipPrice = scholarshipPrice ? Number(scholarshipPrice) : null;
  if (registrationFee !== undefined) updates.registrationFee = registrationFee ? Number(registrationFee) : null;
  if (paymentPlansJson !== undefined) updates.paymentPlansJson = paymentPlansJson || null;
  if (studentCapacity !== undefined) updates.studentCapacity = studentCapacity ? Number(studentCapacity) : null;
  if (bannerUrl !== undefined) { updates.bannerUrl = bannerUrl || null; if (bannerUrl) updates.thumbnailUrl = bannerUrl; }
  if (brochureUrl !== undefined) updates.brochureUrl = brochureUrl || null;
  if (mentorIdsJson !== undefined) updates.mentorIdsJson = mentorIdsJson || null;
  if (instanceName !== undefined) updates.instanceName = instanceName || null;
  if (admissionStatus !== undefined) updates.admissionStatus = admissionStatus;
  if (startDate !== undefined) updates.startDate = startDate || null;
  if (endDate !== undefined) updates.endDate = endDate || null;
  const [course] = await db.update(coursesTable).set(updates as never).where(eq(coursesTable.id, id)).returning();
  if (!course) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...course, courseCode: `CRS${String(course.id).padStart(4, "0")}` });
});

router.delete("/admin/courses/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, id));
  await db.update(coursesTable).set({
    isArchived: true,
    archivedAt: new Date(),
    archivedBy: req.authUser!.id,
  }).where(eq(coursesTable.id, id));
  await logAudit(
    req.authUser!.id, req.authUser!.name,
    "course_deleted", "course", id, course?.title ?? String(id),
  );
  res.json({ success: true });
});

// ── GET /admin/courses/:id/stats ──────────────────────────────────────────────
router.get("/admin/courses/:id/stats", adminOnly, async (req, res) => {
  const courseId = Number(req.params.id);
  if (!courseId) { res.status(400).json({ error: "Invalid id" }); return; }

  const [course] = await db.select({ status: coursesTable.status })
    .from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
  if (!course) { res.status(404).json({ error: "Not found" }); return; }

  const [studentsRow, teachersRow, subjectsRow, liveClassesRow] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(masteryStudentsTable)
      .where(eq(masteryStudentsTable.assignedCourseId, courseId)),
    db.select({ count: sql<number>`count(*)::int` }).from(teacherCoursesTable)
      .where(eq(teacherCoursesTable.courseId, courseId)),
    db.select({ count: sql<number>`count(*)::int` }).from(courseSubjectsTable)
      .where(eq(courseSubjectsTable.courseId, courseId)),
    db.select({ count: sql<number>`count(*)::int` }).from(liveClassesTable)
      .where(eq(liveClassesTable.courseId, courseId)),
  ]);

  const subjectIds = await db.select({ id: courseSubjectsTable.id })
    .from(courseSubjectsTable).where(eq(courseSubjectsTable.courseId, courseId));

  let topics = 0;
  if (subjectIds.length > 0) {
    const chapterRows = await db.select({ id: chaptersTable.id })
      .from(chaptersTable)
      .where(inArray(chaptersTable.courseSubjectId, subjectIds.map(s => s.id)));
    if (chapterRows.length > 0) {
      const [tRow] = await db.select({ count: sql<number>`count(*)::int` })
        .from(topicsTable)
        .where(inArray(topicsTable.chapterId, chapterRows.map(c => c.id)));
      topics = tRow?.count ?? 0;
    }
  }

  res.json({
    studentsEnrolled: studentsRow[0]?.count ?? 0,
    teachersAssigned: teachersRow[0]?.count ?? 0,
    subjects: subjectsRow[0]?.count ?? 0,
    topics,
    liveClasses: liveClassesRow[0]?.count ?? 0,
    status: course.status,
  });
});

// ── PATCH /admin/courses/:id/activate-admissions ──────────────────────────────
// Atomic swap: closes all other mastery courses for the same grade, then opens
// this one.  Existing students are NEVER moved — only new admissions are affected.
router.patch("/admin/courses/:id/activate-admissions", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [target] = await db
    .select({ id: coursesTable.id, grade: coursesTable.grade, courseType: coursesTable.courseType, title: coursesTable.title })
    .from(coursesTable)
    .where(eq(coursesTable.id, id));

  if (!target) { res.status(404).json({ error: "Course not found" }); return; }
  if (target.courseType !== "mastery") {
    res.status(400).json({ error: "Admission activation only applies to mastery courses" });
    return;
  }

  // Step 1: Close all mastery courses for this grade
  await db.update(coursesTable)
    .set({ admissionStatus: "closed" })
    .where(and(
      eq(coursesTable.grade, target.grade),
      eq(coursesTable.courseType, "mastery"),
      eq(coursesTable.isArchived, false),
    ));

  // Step 2: Activate this course
  const [updated] = await db.update(coursesTable)
    .set({ admissionStatus: "active" })
    .where(eq(coursesTable.id, id))
    .returning({ id: coursesTable.id, admissionStatus: coursesTable.admissionStatus, title: coursesTable.title });

  await logAudit(
    req.authUser!.id, req.authUser!.name,
    "course_admissions_activated", "course", id, target.title,
  );

  res.json({ success: true, id: updated.id, admissionStatus: updated.admissionStatus });
});

// ── Syllabus CSV Import ───────────────────────────────────────────
// POST /admin/courses/:courseId/syllabus-import
// Body: { courseSubjectId?: number, replaceExisting: boolean, rows: [{date?,chapter,topic,description?}] }
router.post("/admin/courses/:courseId/syllabus-import", adminOnly, async (req, res) => {
  const courseId = Number(req.params.courseId);
  if (!courseId) { res.status(400).json({ error: "Invalid courseId" }); return; }

  const { courseSubjectId, replaceExisting, rows } = req.body as {
    courseSubjectId?: number;
    replaceExisting?: boolean;
    rows: Array<{ date?: string; chapter: string; topic: string; description?: string }>;
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows array is required and must not be empty" });
    return;
  }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  // If replacing, delete all existing chapters+topics+live-classes for this course (filtered by courseSubjectId if given)
  if (replaceExisting) {
    const whereClause = courseSubjectId
      ? and(eq(chaptersTable.courseId, courseId), eq(chaptersTable.courseSubjectId, courseSubjectId))
      : eq(chaptersTable.courseId, courseId);
    const existingChapters = await db.select({ id: chaptersTable.id }).from(chaptersTable).where(whereClause);
    if (existingChapters.length > 0) {
      const chapterIds = existingChapters.map(c => c.id);
      const existingTopics = await db.select({ id: topicsTable.id }).from(topicsTable).where(inArray(topicsTable.chapterId, chapterIds));
      if (existingTopics.length > 0) {
        const topicIds = existingTopics.map(t => t.id);
        // Remove live classes linked to these topics
        await db.delete(liveClassesTable).where(inArray(liveClassesTable.topicId, topicIds));
        await db.delete(topicsTable).where(inArray(topicsTable.id, topicIds));
      }
      await db.delete(chaptersTable).where(inArray(chaptersTable.id, chapterIds));
    }
  }

  // Process rows
  const chapterMap: Record<string, number> = {}; // chapterName → chapterId
  let chapterOrder = 0;
  let topicOrder = 0;
  let createdChapters = 0;
  let createdTopics = 0;
  let createdClasses = 0;
  // Default start date: 1 week from now at 10am IST
  let lastDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  for (const row of rows) {
    const chapterName = (row.chapter ?? "").trim();
    const topicName = (row.topic ?? "").trim();
    if (!chapterName || !topicName) continue;

    // Parse date DD/MM/YYYY → Date (10am IST)
    if (row.date) {
      const parts = row.date.trim().split("/");
      if (parts.length === 3) {
        const [d, m, y] = parts.map(Number);
        if (d && m && y) {
          const utcMs = Date.UTC(y, m - 1, d, 4, 30); // 10:00 IST = 04:30 UTC
          lastDate = new Date(utcMs);
        }
      }
    }

    // Find or create chapter
    if (chapterMap[chapterName] === undefined) {
      let chapterId: number;
      if (!replaceExisting) {
        // Check if exists
        const whereClause = courseSubjectId
          ? and(eq(chaptersTable.courseId, courseId), eq(chaptersTable.name, chapterName), eq(chaptersTable.courseSubjectId, courseSubjectId))
          : and(eq(chaptersTable.courseId, courseId), eq(chaptersTable.name, chapterName));
        const [existing] = await db.select({ id: chaptersTable.id }).from(chaptersTable).where(whereClause);
        if (existing) {
          chapterId = existing.id;
        } else {
          const [ch] = await db.insert(chaptersTable).values({
            name: chapterName, courseId, grade: course.grade,
            courseSubjectId: courseSubjectId ?? null,
            order: chapterOrder, sequenceNo: chapterOrder + 1,
          }).returning({ id: chaptersTable.id });
          chapterId = ch.id;
          createdChapters++;
          chapterOrder++;
        }
      } else {
        const [ch] = await db.insert(chaptersTable).values({
          name: chapterName, courseId, grade: course.grade,
          courseSubjectId: courseSubjectId ?? null,
          order: chapterOrder, sequenceNo: chapterOrder + 1,
        }).returning({ id: chaptersTable.id });
        chapterId = ch.id;
        createdChapters++;
        chapterOrder++;
      }
      chapterMap[chapterName] = chapterId;
    }

    const chapterId = chapterMap[chapterName];

    // Find or create topic
    if (!replaceExisting) {
      const [existing] = await db.select({ id: topicsTable.id }).from(topicsTable)
        .where(and(eq(topicsTable.chapterId, chapterId), eq(topicsTable.name, topicName)));
      if (existing) continue; // skip duplicate topic
    }

    const [tp] = await db.insert(topicsTable).values({
      name: topicName, chapterId,
      description: (row.description ?? "").trim() || null,
      order: topicOrder, topicStatus: "active",
    }).returning({ id: topicsTable.id });
    topicOrder++;
    createdTopics++;

    // Auto-create a scheduled live class for this topic
    await db.insert(liveClassesTable).values({
      title: topicName,
      grade: course.grade,
      courseId,
      chapterId,
      topicId: tp.id,
      courseSubjectId: courseSubjectId ?? null,
      scheduledAt: lastDate,
      duration: 60,
      teacher: course.teacher || "Braintam Faculty",
      status: "upcoming",
      isPublished: true,
    });
    createdClasses++;
    // Advance default date by 7 days for next un-dated row
    lastDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  await logAudit(req.authUser!.id, req.authUser!.name,
    "syllabus_imported", "course", courseId, course.title,
    JSON.stringify({ createdChapters, createdTopics, createdClasses, replaceExisting }));

  res.json({ success: true, createdChapters, createdTopics, createdClasses });
});

// ── Seed 20 permanent courses ──────────────────────────────────────
// Idempotent: skips any course that already exists (same courseType + grade).
router.post("/admin/courses/seed-permanent", adminOnly, async (req, res) => {
  const existing = await db
    .select({ courseType: coursesTable.courseType, grade: coursesTable.grade })
    .from(coursesTable)
    .where(eq(coursesTable.isArchived, false));

  const existingSet = new Set(existing.map((r) => `${r.courseType}-${r.grade}`));

  const IGNITE_THUMBNAIL = "https://placehold.co/400x240/0B2B6B/FFFFFF?text=Ignite";
  const MASTERY_THUMBNAIL = "https://placehold.co/400x240/FF6B1A/FFFFFF?text=Mastery";

  const toCreate: Array<{
    title: string; grade: number; courseType: string;
    thumbnailUrl: string; description: string; teacher: string;
    totalLessons: number; isPublished: boolean; status: string;
    instanceName: string; admissionStatus: string;
  }> = [];

  for (let g = 1; g <= 10; g++) {
    if (!existingSet.has(`ignite-${g}`)) {
      toCreate.push({
        title: `Braintam Ignite — Grade ${g}`,
        grade: g,
        courseType: "ignite",
        thumbnailUrl: IGNITE_THUMBNAIL,
        description: `5-day live demo program for Grade ${g} students. Experience Braintam's teaching method before joining Mastery.`,
        teacher: "Braintam Faculty",
        totalLessons: 5,
        isPublished: true,
        status: "active",
        instanceName: "Course A",
        admissionStatus: "active",
      });
    }
    if (!existingSet.has(`mastery-${g}`)) {
      toCreate.push({
        title: `Braintam Mastery — Grade ${g}`,
        grade: g,
        courseType: "mastery",
        thumbnailUrl: MASTERY_THUMBNAIL,
        description: `Full academic year program for Grade ${g}. Complete syllabus coverage with live classes, homework, tests, and mentor support.`,
        teacher: "Braintam Faculty",
        totalLessons: 120,
        isPublished: true,
        status: "active",
        instanceName: "Course A",
        admissionStatus: "active",
      });
    }
  }

  if (toCreate.length === 0) {
    res.json({ created: 0, message: "All 20 permanent courses already exist." });
    return;
  }

  const created = await db.insert(coursesTable).values(toCreate).returning({ id: coursesTable.id, title: coursesTable.title, courseType: coursesTable.courseType, grade: coursesTable.grade });

  res.json({ created: created.length, courses: created });
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
  const { status, joinUrl, title, teacher, teacherId, grade, scheduledAt, duration, courseId, subjectId, isPublished } = req.body;
  const updates: Partial<typeof liveClassesTable.$inferInsert> = {};
  if (status !== undefined) updates.status = status;
  if (joinUrl !== undefined) updates.joinUrl = joinUrl;
  if (title !== undefined) updates.title = title;
  if (teacher !== undefined) updates.teacher = teacher;
  if (teacherId !== undefined) updates.teacherId = Number(teacherId);
  if (grade !== undefined) updates.grade = Number(grade);
  if (scheduledAt !== undefined) updates.scheduledAt = new Date(scheduledAt);
  if (duration !== undefined) updates.duration = Number(duration);
  if (courseId !== undefined) updates.courseId = courseId ? Number(courseId) : null;
  if (subjectId !== undefined) updates.subjectId = subjectId ? Number(subjectId) : null;
  if (isPublished !== undefined) updates.isPublished = Boolean(isPublished);
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
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(and(inArray(usersTable.role, ["mentor", "sales_mentor", "academic_mentor"]), eq(usersTable.isActive, true))),
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
    }).from(usersTable).where(inArray(usersTable.role, ["mentor", "sales_mentor", "academic_mentor"])).orderBy(usersTable.name),
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
router.get("/admin/students/:id/360", allStaffAuth, async (req, res) => {
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
// ── Audit Log Stats (summary cards) ──────────────────────────────────────────
const HIGH_RISK_KW = ["role_change", "change_role", "disable", "deactivate", "permission_change", "archive", "delete_user", "settings_change", "bulk_disable"];

router.get("/admin/audit-logs/stats", adminOnly, async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  const [todayLogs, [{ yesterdayTotal }]] = await Promise.all([
    db.select().from(auditLogsTable).where(gte(auditLogsTable.createdAt, todayStart)).orderBy(desc(auditLogsTable.createdAt)).limit(1000),
    db.select({ yesterdayTotal: sql<number>`count(*)` }).from(auditLogsTable)
      .where(and(gte(auditLogsTable.createdAt, yesterdayStart), lt(auditLogsTable.createdAt, todayStart))),
  ]);

  const todayTotal = todayLogs.length;
  const usersModified = todayLogs.filter(l => ["user", "student"].includes(l.targetType ?? "")).length;
  const studentsUpdated = todayLogs.filter(l => l.targetType === "student").length;
  const leadsConverted = todayLogs.filter(l => l.action.toLowerCase().includes("convert")).length;
  const highRiskCount = todayLogs.filter(l => HIGH_RISK_KW.some(k => l.action.toLowerCase().includes(k))).length;

  res.json({ todayTotal, yesterdayTotal: Number(yesterdayTotal), usersModified, studentsUpdated, leadsConverted, highRiskCount });
});

// ── Audit Logs (full filter + pagination) ────────────────────────────────────
router.get("/admin/audit-logs", adminOnly, async (req, res) => {
  const {
    search, module: mod, action, role,
    dateFrom, dateTo, highRisk,
    page = "1", limit: lim = "50",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(lim, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const defaultStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  conditions.push(gte(auditLogsTable.createdAt, dateFrom ? new Date(dateFrom) : defaultStart));
  if (dateTo) {
    const to = new Date(dateTo);
    to.setDate(to.getDate() + 1);
    conditions.push(lt(auditLogsTable.createdAt, to));
  }

  if (search) {
    conditions.push(or(
      ilike(auditLogsTable.actorName, `%${search}%`),
      ilike(auditLogsTable.actorEmail, `%${search}%`),
      ilike(auditLogsTable.action, `%${search}%`),
      ilike(auditLogsTable.targetName, `%${search}%`),
    )!);
  }

  if (mod) {
    const moduleToTargetTypes: Record<string, string[]> = {
      "Users": ["user"], "Students": ["student"], "CRM": ["follow_up", "lead"],
      "Demo Batches": ["demo_batch", "demo_session"], "Courses": ["course"],
      "Attendance": ["attendance"], "Homework": ["homework"], "Assignments": ["assignment"],
      "Tests": ["test"], "Teachers": ["teacher_course", "teacher"],
      "Mentors": ["mentor", "mentor_assignment"], "Settings": ["settings"], "Permissions": ["permission"],
    };
    const tts = moduleToTargetTypes[mod];
    if (tts?.length) {
      conditions.push(or(eq(auditLogsTable.module, mod), inArray(auditLogsTable.targetType, tts))!);
    } else {
      conditions.push(eq(auditLogsTable.module, mod));
    }
  }

  if (action) conditions.push(ilike(auditLogsTable.action, `%${action}%`));

  if (role) {
    const actors = (await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, role))).map(u => u.id);
    if (actors.length > 0) {
      conditions.push(or(eq(auditLogsTable.actorRole, role), inArray(auditLogsTable.actorId, actors))!);
    } else {
      conditions.push(eq(auditLogsTable.actorRole, role));
    }
  }

  if (highRisk === "true") {
    conditions.push(or(...HIGH_RISK_KW.map(k => ilike(auditLogsTable.action, `%${k}%`)))!);
  }

  const where = and(...conditions);
  const [logs, [{ total }]] = await Promise.all([
    db.select().from(auditLogsTable).where(where).orderBy(desc(auditLogsTable.createdAt)).limit(limitNum).offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(auditLogsTable).where(where),
  ]);

  res.json({ logs, total: Number(total), page: pageNum, limit: limitNum, pages: Math.ceil(Number(total) / limitNum) });
});

// ── Student CRM Profile (BTL CRM data for any student) ────────────────────
router.get("/admin/students/:id/crm", allStaffAuth, async (req, res) => {
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
      leadStatus: mentorFollowUpsTable.leadStatus, calledByName: mentorFollowUpsTable.calledByName,
      mentorName: usersTable.name,
    }).from(mentorFollowUpsTable)
      .leftJoin(usersTable, eq(usersTable.id, mentorFollowUpsTable.mentorId))
      .where(eq(mentorFollowUpsTable.studentId, studentId))
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

router.patch("/admin/students/:id/crm", allStaffAuth, async (req, res) => {
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

// ── Student Attendance ────────────────────────────────────────────
router.get("/admin/students/:id/attendance", allStaffAuth, async (req, res) => {
  const studentId = parseInt(String(req.params.id), 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const records = await db.select({
    id: mentorAttendanceTable.id,
    attendanceDate: mentorAttendanceTable.attendanceDate,
    status: mentorAttendanceTable.status,
    remark: mentorAttendanceTable.remark,
    calledByName: mentorAttendanceTable.calledByName,
    createdAt: mentorAttendanceTable.createdAt,
  }).from(mentorAttendanceTable)
    .where(eq(mentorAttendanceTable.studentId, studentId))
    .orderBy(desc(mentorAttendanceTable.createdAt))
    .limit(90);

  const total = records.length;
  const present = records.filter(r => r.status === "present").length;
  const absent = records.filter(r => r.status === "absent").length;
  const late = records.filter(r => r.status === "late").length;
  const leave = records.filter(r => r.status === "leave").length;
  const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;

  res.json({ records, summary: { total, present, absent, late, leave, presentPct } });
});

// ── Teachers: Summary Stats ───────────────────────────────────────
router.get("/admin/teachers/summary-stats", adminOnly, async (_req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  const [tot, act, todayCls] = await Promise.all([
    db.select({ c: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "teacher")),
    db.select({ c: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.role, "teacher"), eq(usersTable.isActive, true))),
    db.select({ c: sql<number>`count(*)` }).from(liveClassesTable).where(and(gte(liveClassesTable.scheduledAt, today), lt(liveClassesTable.scheduledAt, tomorrow))),
  ]);
  res.json({ totalTeachers: Number(tot[0]?.c ?? 0), activeTeachers: Number(act[0]?.c ?? 0), liveClassesToday: Number(todayCls[0]?.c ?? 0) });
});

// ── Teachers: Enriched List ───────────────────────────────────────
router.get("/admin/teachers/enriched", adminOnly, async (_req, res) => {
  const teachers = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, isActive: usersTable.isActive, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.role, "teacher")).orderBy(usersTable.name);
  if (teachers.length === 0) { res.json([]); return; }
  const tIds = teachers.map(t => t.id);
  const idArr = sql.raw(tIds.join(","));

  const [courseRows, classRows, enrollRows, attendRows, hwGradedRows, hwTotalRows] = await Promise.all([
    db.select({ teacherId: teacherCoursesTable.teacherId, courseId: teacherCoursesTable.courseId, title: coursesTable.title, grade: coursesTable.grade })
      .from(teacherCoursesTable).innerJoin(coursesTable, eq(teacherCoursesTable.courseId, coursesTable.id))
      .where(inArray(teacherCoursesTable.teacherId, tIds)),

    db.select({ id: liveClassesTable.id, teacherId: liveClassesTable.teacherId, status: liveClassesTable.status })
      .from(liveClassesTable).where(sql`teacher_id = ANY(ARRAY[${idArr}]::int[])`),

    db.select({ teacherId: teacherCoursesTable.teacherId, studentId: enrollmentsTable.studentId })
      .from(teacherCoursesTable).innerJoin(enrollmentsTable, eq(enrollmentsTable.courseId, teacherCoursesTable.courseId))
      .where(inArray(teacherCoursesTable.teacherId, tIds)),

    db.select({ liveClassId: attendanceTable.liveClassId, present: attendanceTable.present })
      .from(attendanceTable).innerJoin(liveClassesTable, eq(attendanceTable.liveClassId, liveClassesTable.id))
      .where(sql`${liveClassesTable.teacherId} = ANY(ARRAY[${idArr}]::int[])`),

    db.select({ teacherId: homeworkTable.teacherId })
      .from(homeworkSubmissionsTable).innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
      .where(and(eq(homeworkSubmissionsTable.status, "graded"), sql`${homeworkTable.teacherId} = ANY(ARRAY[${idArr}]::int[])`)),

    db.select({ teacherId: homeworkTable.teacherId })
      .from(homeworkSubmissionsTable).innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
      .where(sql`${homeworkTable.teacherId} = ANY(ARRAY[${idArr}]::int[])`),
  ]);

  const classToTeacher: Record<number, number> = {};
  for (const c of classRows) { if (c.teacherId) classToTeacher[c.id] = c.teacherId; }

  const attendByTeacher: Record<number, { total: number; present: number }> = {};
  for (const a of attendRows) {
    const tid = classToTeacher[a.liveClassId];
    if (tid) { if (!attendByTeacher[tid]) attendByTeacher[tid] = { total: 0, present: 0 }; attendByTeacher[tid].total++; if (a.present) attendByTeacher[tid].present++; }
  }

  const hwGraded: Record<number, number> = {};
  for (const h of hwGradedRows) { if (h.teacherId) hwGraded[h.teacherId] = (hwGraded[h.teacherId] ?? 0) + 1; }
  const hwTotal: Record<number, number> = {};
  for (const h of hwTotalRows) { if (h.teacherId) hwTotal[h.teacherId] = (hwTotal[h.teacherId] ?? 0) + 1; }

  res.json(teachers.map(t => {
    const courses = courseRows.filter(c => c.teacherId === t.id);
    const classes = classRows.filter(c => c.teacherId === t.id);
    const students = new Set(enrollRows.filter(e => e.teacherId === t.id).map(e => e.studentId)).size;
    const done = classes.filter(c => c.status === "completed").length;
    const att = attendByTeacher[t.id];
    const attPct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
    const graded = hwGraded[t.id] ?? 0;
    const total = hwTotal[t.id] ?? 0;
    const hwPct = total > 0 ? Math.round((graded / total) * 100) : 0;
    const score = Math.round(
      (done > 0 ? Math.min(done / 30, 1) : 0) * 35 +
      (attPct / 100) * 30 +
      (hwPct / 100) * 25 +
      (t.isActive ? 10 : 0)
    );
    return { id: t.id, name: t.name, email: t.email, phone: t.phone, isActive: t.isActive, createdAt: t.createdAt, coursesAssigned: courses.length, coursesList: courses.map(c => ({ id: c.courseId, title: c.title, grade: c.grade })), studentsTotal: students, classesTotal: classes.length, classesDone: done, attendancePct: attPct, hwGraded: graded, hwTotal: total, hwCompletionPct: hwPct, performanceScore: score };
  }));
});

// ── Teacher 360 Detail ────────────────────────────────────────────
router.get("/admin/teachers/:id/detail", adminOnly, async (req, res) => {
  const teacherId = parseInt(String(req.params.id), 10);
  if (isNaN(teacherId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [teacher] = await db.select().from(usersTable).where(and(eq(usersTable.id, teacherId), eq(usersTable.role, "teacher"))).limit(1);
  if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }

  const [courses, classes, notes] = await Promise.all([
    db.select({ id: teacherCoursesTable.courseId, title: coursesTable.title, grade: coursesTable.grade, assignedAt: teacherCoursesTable.assignedAt })
      .from(teacherCoursesTable).innerJoin(coursesTable, eq(teacherCoursesTable.courseId, coursesTable.id))
      .where(eq(teacherCoursesTable.teacherId, teacherId)),
    db.select().from(liveClassesTable).where(eq(liveClassesTable.teacherId, teacherId)).orderBy(desc(liveClassesTable.scheduledAt)).limit(60),
    db.select().from(auditLogsTable).where(and(eq(auditLogsTable.targetId, teacherId), eq(auditLogsTable.action, "teacher_note"))).orderBy(desc(auditLogsTable.createdAt)).limit(50),
  ]);

  const courseIds = courses.map(c => c.id);
  const [students, attendance] = await Promise.all([
    courseIds.length > 0
      ? db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, grade: usersTable.grade, school: usersTable.school, courseId: enrollmentsTable.courseId })
          .from(enrollmentsTable).innerJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
          .where(inArray(enrollmentsTable.courseId, courseIds))
      : Promise.resolve([]),
    db.select({ liveClassId: attendanceTable.liveClassId, present: attendanceTable.present })
      .from(attendanceTable).innerJoin(liveClassesTable, eq(attendanceTable.liveClassId, liveClassesTable.id))
      .where(eq(liveClassesTable.teacherId, teacherId)),
  ]);

  const attPct = attendance.length > 0 ? Math.round((attendance.filter(a => a.present).length / attendance.length) * 100) : 0;
  res.json({
    teacher: { id: teacher.id, name: teacher.name, email: teacher.email, phone: teacher.phone, isActive: teacher.isActive, createdAt: teacher.createdAt, lastLoginDate: teacher.lastLoginDate },
    courses,
    classes: classes.map(c => ({ id: c.id, title: c.title, grade: c.grade, status: c.status, scheduledAt: c.scheduledAt, duration: c.duration, studentsJoined: c.studentsJoined })),
    students,
    attendancePct: attPct,
    notes: notes.map(n => ({ id: n.id, note: n.metadata, addedBy: n.actorName, createdAt: n.createdAt })),
  });
});

// ── Assessments Module ────────────────────────────────────────────

router.get("/admin/assessments/summary", allStaffAuth, async (_req, res) => {
  const [hwTotal, asgnTotal, testTotal, hwPending, asgnPending] = await Promise.all([
    db.select({ c: sql<number>`count(*)` }).from(homeworkSubmissionsTable),
    db.select({ c: sql<number>`count(*)` }).from(assignmentSubmissionsTable),
    db.select({ c: sql<number>`count(*)` }).from(testSubmissionsTable),
    db.select({ c: sql<number>`count(*)` }).from(homeworkSubmissionsTable).where(eq(homeworkSubmissionsTable.status, "submitted")),
    db.select({ c: sql<number>`count(*)` }).from(assignmentSubmissionsTable).where(eq(assignmentSubmissionsTable.status, "submitted")),
  ]);

  const totalAssessments = Number(hwTotal[0]?.c ?? 0) + Number(asgnTotal[0]?.c ?? 0) + Number(testTotal[0]?.c ?? 0);
  const pendingEvaluations = Number(hwPending[0]?.c ?? 0) + Number(asgnPending[0]?.c ?? 0);

  const [hwAvg, asgnAvg, testAvg] = await Promise.all([
    db.select({ v: sql<string>`COALESCE(ROUND(AVG(${homeworkSubmissionsTable.marks} / NULLIF(${homeworkTable.maxMarks}, 0) * 100)), 0)` })
      .from(homeworkSubmissionsTable)
      .innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
      .where(sql`${homeworkSubmissionsTable.marks} IS NOT NULL`),
    db.select({ v: sql<string>`COALESCE(ROUND(AVG(${assignmentSubmissionsTable.marks} / NULLIF(${assignmentsTable.maxMarks}, 0) * 100)), 0)` })
      .from(assignmentSubmissionsTable)
      .innerJoin(assignmentsTable, eq(assignmentSubmissionsTable.assignmentId, assignmentsTable.id))
      .where(sql`${assignmentSubmissionsTable.marks} IS NOT NULL`),
    db.select({ v: sql<string>`COALESCE(ROUND(AVG(${testSubmissionsTable.score} / NULLIF(${testSubmissionsTable.maxScore}, 0) * 100)), 0)` })
      .from(testSubmissionsTable)
      .where(sql`${testSubmissionsTable.score} IS NOT NULL AND ${testSubmissionsTable.maxScore} IS NOT NULL`),
  ]);

  const allAvgs = [Number(hwAvg[0]?.v ?? 0), Number(asgnAvg[0]?.v ?? 0), Number(testAvg[0]?.v ?? 0)].filter(s => s > 0);
  const avgScore = allAvgs.length > 0 ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) : 0;

  const submissionRate = totalAssessments > 0 ? Math.round(((totalAssessments - pendingEvaluations) / totalAssessments) * 100) : 0;

  const topPerformRows = await db.execute<{ c: string }>(sql`
    SELECT COUNT(DISTINCT student_id)::text AS c FROM (
      SELECT student_id, AVG(score_pct) AS avg_pct FROM (
        SELECT hs.student_id, (hs.marks / NULLIF(h.max_marks, 0) * 100) AS score_pct
        FROM homework_submissions hs JOIN homework h ON hs.homework_id = h.id WHERE hs.marks IS NOT NULL
        UNION ALL
        SELECT asub.student_id, (asub.marks / NULLIF(a.max_marks, 0) * 100) AS score_pct
        FROM assignment_submissions asub JOIN assignments a ON asub.assignment_id = a.id WHERE asub.marks IS NOT NULL
        UNION ALL
        SELECT ts.student_id, (ts.score / NULLIF(ts.max_score, 0) * 100) AS score_pct
        FROM test_submissions ts WHERE ts.score IS NOT NULL AND ts.max_score IS NOT NULL
      ) all_scores GROUP BY student_id
    ) student_avgs WHERE avg_pct >= 90
  `);
  const topPerformers = Number((topPerformRows.rows?.[0] as { c?: string } | undefined)?.c ?? 0);

  const typeDist = {
    homework: Number(hwTotal[0]?.c ?? 0),
    assignments: Number(asgnTotal[0]?.c ?? 0),
    tests: Number(testTotal[0]?.c ?? 0),
  };

  res.json({ totalAssessments, pendingEvaluations, avgScore, submissionRate, topPerformers, typeDist });
});

router.get("/admin/assessments/submissions", allStaffAuth, async (req, res) => {
  const typeFilter = (req.query.type as string) || "all";
  const gradeFilter = req.query.grade ? Number(req.query.grade) : null;
  const statusFilter = (req.query.status as string) || "all";
  const q = (req.query.q as string || "").toLowerCase().trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;

  const [hwRows, asgnRows, testRows] = await Promise.all([
    (typeFilter === "all" || typeFilter === "homework") ? db.select({
      subId: homeworkSubmissionsTable.id,
      studentId: homeworkSubmissionsTable.studentId,
      studentName: usersTable.name,
      grade: homeworkTable.grade,
      courseId: homeworkTable.courseId,
      assessmentTitle: homeworkTable.title,
      maxMarks: homeworkTable.maxMarks,
      marks: homeworkSubmissionsTable.marks,
      status: homeworkSubmissionsTable.status,
      submittedAt: homeworkSubmissionsTable.submittedAt,
      chapterId: homeworkTable.chapterId,
      topicId: homeworkTable.topicId,
      liveClassId: homeworkTable.liveClassId,
      teacherId: homeworkTable.teacherId,
    }).from(homeworkSubmissionsTable)
      .innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
      .innerJoin(usersTable, eq(homeworkSubmissionsTable.studentId, usersTable.id))
      .orderBy(desc(homeworkSubmissionsTable.submittedAt))
      .limit(300) : Promise.resolve([]),

    (typeFilter === "all" || typeFilter === "assignment") ? db.select({
      subId: assignmentSubmissionsTable.id,
      studentId: assignmentSubmissionsTable.studentId,
      studentName: usersTable.name,
      grade: assignmentsTable.grade,
      courseId: assignmentsTable.courseId,
      assessmentTitle: assignmentsTable.title,
      maxMarks: assignmentsTable.maxMarks,
      marks: assignmentSubmissionsTable.marks,
      status: assignmentSubmissionsTable.status,
      submittedAt: assignmentSubmissionsTable.submittedAt,
    }).from(assignmentSubmissionsTable)
      .innerJoin(assignmentsTable, eq(assignmentSubmissionsTable.assignmentId, assignmentsTable.id))
      .innerJoin(usersTable, eq(assignmentSubmissionsTable.studentId, usersTable.id))
      .orderBy(desc(assignmentSubmissionsTable.submittedAt))
      .limit(300) : Promise.resolve([]),

    (typeFilter === "all" || typeFilter === "test" || typeFilter === "quiz") ? db.select({
      subId: testSubmissionsTable.id,
      studentId: testSubmissionsTable.studentId,
      studentName: usersTable.name,
      grade: testsTable.grade,
      courseId: testsTable.courseId,
      assessmentTitle: testsTable.title,
      maxMarks: testsTable.totalQuestions,
      marks: testSubmissionsTable.score,
      status: sql<string>`'completed'`,
      submittedAt: testSubmissionsTable.submittedAt,
      testType: testsTable.testType,
    }).from(testSubmissionsTable)
      .innerJoin(testsTable, eq(testSubmissionsTable.testId, testsTable.id))
      .innerJoin(usersTable, eq(testSubmissionsTable.studentId, usersTable.id))
      .orderBy(desc(testSubmissionsTable.submittedAt))
      .limit(300) : Promise.resolve([]),
  ]);

  const courseIds = [...new Set([
    ...hwRows.map(r => r.courseId), ...asgnRows.map(r => r.courseId), ...testRows.map(r => r.courseId),
  ].filter(Boolean) as number[])];

  const courseTitles: Record<number, string> = {};
  if (courseIds.length > 0) {
    const crows = await db.select({ id: coursesTable.id, title: coursesTable.title }).from(coursesTable).where(inArray(coursesTable.id, courseIds));
    crows.forEach(c => { courseTitles[c.id] = c.title; });
  }

  type Row = {
    id: string; type: string; studentId: number; studentName: string;
    grade: number; courseTitle: string | null; assessmentTitle: string;
    maxMarks: number; marks: number | null; scorePct: number | null;
    status: string; submittedAt: Date | string;
    chapterId?: number | null; topicId?: number | null; liveClassId?: number | null; teacherId?: number | null;
  };

  const combined: Row[] = [
    ...hwRows.map(r => ({
      id: `hw-${r.subId}`, type: "Homework", studentId: r.studentId, studentName: r.studentName,
      grade: r.grade, courseTitle: r.courseId ? (courseTitles[r.courseId] ?? null) : null,
      assessmentTitle: r.assessmentTitle, maxMarks: r.maxMarks,
      marks: r.marks ?? null,
      scorePct: r.marks != null && r.maxMarks > 0 ? Math.round((r.marks / r.maxMarks) * 100) : null,
      status: r.status === "graded" ? "Graded" : "Submitted",
      submittedAt: r.submittedAt,
      chapterId: r.chapterId, topicId: r.topicId, liveClassId: r.liveClassId, teacherId: r.teacherId,
    })),
    ...asgnRows.map(r => ({
      id: `asgn-${r.subId}`, type: "Assignment", studentId: r.studentId, studentName: r.studentName,
      grade: r.grade, courseTitle: r.courseId ? (courseTitles[r.courseId] ?? null) : null,
      assessmentTitle: r.assessmentTitle, maxMarks: r.maxMarks,
      marks: r.marks ?? null,
      scorePct: r.marks != null && r.maxMarks > 0 ? Math.round((r.marks / r.maxMarks) * 100) : null,
      status: r.status === "graded" ? "Graded" : "Submitted",
      submittedAt: r.submittedAt,
    })),
    ...testRows.map(r => ({
      id: `test-${r.subId}`, type: (r as typeof r & { testType?: string | null }).testType === "quiz" ? "Quiz" : "Test",
      studentId: r.studentId, studentName: r.studentName,
      grade: r.grade, courseTitle: r.courseId ? (courseTitles[r.courseId] ?? null) : null,
      assessmentTitle: r.assessmentTitle, maxMarks: Number(r.maxMarks),
      marks: r.marks ?? null,
      scorePct: r.marks != null && Number(r.maxMarks) > 0 ? Math.round((Number(r.marks) / Number(r.maxMarks)) * 100) : null,
      status: "Completed",
      submittedAt: r.submittedAt,
    })),
  ];

  let filtered = combined;
  if (typeFilter === "quiz") filtered = combined.filter(r => r.type === "Quiz");
  if (gradeFilter) filtered = filtered.filter(r => r.grade === gradeFilter);
  if (statusFilter !== "all") filtered = filtered.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase());
  if (q) filtered = filtered.filter(r => r.studentName.toLowerCase().includes(q) || r.assessmentTitle.toLowerCase().includes(q) || (r.courseTitle ?? "").toLowerCase().includes(q));

  filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const total = filtered.length;
  const rows = filtered.slice((page - 1) * limit, page * limit);
  res.json({ rows, total, page, limit, pages: Math.ceil(total / limit) });
});

router.get("/admin/assessments/top-performers", allStaffAuth, async (_req, res) => {
  const rows = await db.execute<{ student_id: number; student_name: string; avg_pct: string; total_subs: string }>(sql`
    SELECT student_id, student_name, ROUND(AVG(score_pct))::int AS avg_pct, COUNT(*)::int AS total_subs FROM (
      SELECT hs.student_id, u.name AS student_name, (hs.marks / NULLIF(h.max_marks, 0) * 100) AS score_pct
      FROM homework_submissions hs JOIN homework h ON hs.homework_id = h.id JOIN users u ON hs.student_id = u.id WHERE hs.marks IS NOT NULL
      UNION ALL
      SELECT asub.student_id, u.name AS student_name, (asub.marks / NULLIF(a.max_marks, 0) * 100) AS score_pct
      FROM assignment_submissions asub JOIN assignments a ON asub.assignment_id = a.id JOIN users u ON asub.student_id = u.id WHERE asub.marks IS NOT NULL
      UNION ALL
      SELECT ts.student_id, u.name AS student_name, (ts.score / NULLIF(ts.max_score, 0) * 100) AS score_pct
      FROM test_submissions ts JOIN users u ON ts.student_id = u.id WHERE ts.score IS NOT NULL AND ts.max_score IS NOT NULL
    ) all_scores
    GROUP BY student_id, student_name
    ORDER BY avg_pct DESC
    LIMIT 20
  `);
  res.json((rows.rows ?? []).map((r, i) => ({ rank: i + 1, studentId: r.student_id, studentName: r.student_name, avgScore: Number(r.avg_pct), totalSubmissions: Number(r.total_subs) })));
});

router.get("/admin/students/:id/assessments", allStaffAuth, async (req, res) => {
  const studentId = parseInt(String(req.params.id), 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [hwSubs, asgnSubs, testSubs] = await Promise.all([
    db.select({
      id: homeworkSubmissionsTable.id, title: homeworkTable.title, grade: homeworkTable.grade,
      maxMarks: homeworkTable.maxMarks, marks: homeworkSubmissionsTable.marks,
      status: homeworkSubmissionsTable.status, submittedAt: homeworkSubmissionsTable.submittedAt,
      chapterId: homeworkTable.chapterId, topicId: homeworkTable.topicId, liveClassId: homeworkTable.liveClassId,
      courseId: homeworkTable.courseId,
    }).from(homeworkSubmissionsTable)
      .innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
      .where(eq(homeworkSubmissionsTable.studentId, studentId))
      .orderBy(desc(homeworkSubmissionsTable.submittedAt)).limit(50),

    db.select({
      id: assignmentSubmissionsTable.id, title: assignmentsTable.title, grade: assignmentsTable.grade,
      maxMarks: assignmentsTable.maxMarks, marks: assignmentSubmissionsTable.marks,
      status: assignmentSubmissionsTable.status, submittedAt: assignmentSubmissionsTable.submittedAt,
      courseId: assignmentsTable.courseId,
    }).from(assignmentSubmissionsTable)
      .innerJoin(assignmentsTable, eq(assignmentSubmissionsTable.assignmentId, assignmentsTable.id))
      .where(eq(assignmentSubmissionsTable.studentId, studentId))
      .orderBy(desc(assignmentSubmissionsTable.submittedAt)).limit(50),

    db.select({
      id: testSubmissionsTable.id, title: testsTable.title, grade: testsTable.grade,
      totalQuestions: testsTable.totalQuestions, score: testSubmissionsTable.score,
      maxScore: testSubmissionsTable.maxScore, submittedAt: testSubmissionsTable.submittedAt,
      courseId: testsTable.courseId, testType: testsTable.testType,
    }).from(testSubmissionsTable)
      .innerJoin(testsTable, eq(testSubmissionsTable.testId, testsTable.id))
      .where(eq(testSubmissionsTable.studentId, studentId))
      .orderBy(desc(testSubmissionsTable.submittedAt)).limit(50),
  ]);

  const allScores: number[] = [
    ...hwSubs.filter(h => h.marks != null && h.maxMarks > 0).map(h => (h.marks! / h.maxMarks) * 100),
    ...asgnSubs.filter(a => a.marks != null && a.maxMarks > 0).map(a => (a.marks! / a.maxMarks) * 100),
    ...testSubs.filter(t => t.score != null && t.maxScore && t.maxScore > 0).map(t => (t.score! / t.maxScore!) * 100),
  ];
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const pendingCount = hwSubs.filter(h => h.status === "submitted").length + asgnSubs.filter(a => a.status === "submitted").length;

  // Rankings: get student's rank among all students
  const rankRow = await db.execute<{ rank: string }>(sql`
    SELECT rank FROM (
      SELECT student_id, RANK() OVER (ORDER BY avg_pct DESC) AS rank FROM (
        SELECT student_id, AVG(score_pct) AS avg_pct FROM (
          SELECT student_id, marks / NULLIF(max_marks, 0) * 100 AS score_pct FROM homework_submissions hs JOIN homework h ON hs.homework_id = h.id WHERE hs.marks IS NOT NULL
          UNION ALL
          SELECT student_id, marks / NULLIF(max_marks, 0) * 100 AS score_pct FROM assignment_submissions asub JOIN assignments a ON asub.assignment_id = a.id WHERE asub.marks IS NOT NULL
          UNION ALL
          SELECT student_id, score / NULLIF(max_score, 0) * 100 AS score_pct FROM test_submissions WHERE score IS NOT NULL AND max_score IS NOT NULL
        ) sc GROUP BY student_id
      ) sq
    ) ranked WHERE student_id = ${studentId}
  `);
  const rank = Number((rankRow.rows?.[0] as { rank?: string } | undefined)?.rank ?? 0);

  res.json({
    homework: hwSubs.map(h => ({ id: h.id, title: h.title, grade: h.grade, maxMarks: h.maxMarks, marks: h.marks, scorePct: h.marks != null && h.maxMarks > 0 ? Math.round((h.marks / h.maxMarks) * 100) : null, status: h.status, submittedAt: h.submittedAt, chapterId: h.chapterId, topicId: h.topicId, liveClassId: h.liveClassId })),
    assignments: asgnSubs.map(a => ({ id: a.id, title: a.title, grade: a.grade, maxMarks: a.maxMarks, marks: a.marks, scorePct: a.marks != null && a.maxMarks > 0 ? Math.round((a.marks / a.maxMarks) * 100) : null, status: a.status, submittedAt: a.submittedAt })),
    tests: testSubs.map(t => ({ id: t.id, title: t.title, grade: t.grade, maxMarks: t.totalQuestions, score: t.score, maxScore: t.maxScore, scorePct: t.score != null && t.maxScore && t.maxScore > 0 ? Math.round((t.score / t.maxScore) * 100) : null, submittedAt: t.submittedAt, testType: t.testType })),
    summary: { totalSubmissions: hwSubs.length + asgnSubs.length + testSubs.length, avgScore, pendingCount, rank },
  });
});

// ── Reports & Analytics Summary ───────────────────────────────────
router.get("/admin/reports/summary", adminOnly, async (req, res) => {
  const { from, to } = req.query;
  const now = new Date();

  let fromDate: Date, toDate: Date;
  if (from && to) {
    fromDate = new Date(String(from) + "T00:00:00+05:30");
    toDate   = new Date(String(to)   + "T23:59:59+05:30");
  } else {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    toDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const todayIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const todayStart = new Date(`${todayIST.getFullYear()}-${String(todayIST.getMonth()+1).padStart(2,"0")}-${String(todayIST.getDate()).padStart(2,"0")}T00:00:00+05:30`);
  const todayEnd   = new Date(`${todayIST.getFullYear()}-${String(todayIST.getMonth()+1).padStart(2,"0")}-${String(todayIST.getDate()).padStart(2,"0")}T23:59:59+05:30`);

  const [leadsRows, activeMentorRows, todayConvRows, paymentRows] = await Promise.all([
    db.execute(sql`
      SELECT assignment_status, grade, lead_source,
             assigned_mentor_id, assigned_mentor_name,
             amount_paise, course_value,
             (paid_at AT TIME ZONE 'Asia/Kolkata')::date AS paid_date,
             converted_date
      FROM ignite_paid_students
      WHERE paid_at >= ${fromDate} AND paid_at <= ${toDate}
    `),
    db.execute(sql`
      SELECT COUNT(DISTINCT assigned_mentor_id) AS cnt
      FROM ignite_paid_students
      WHERE assigned_mentor_id IS NOT NULL
    `),
    db.execute(sql`
      SELECT COUNT(*) AS cnt FROM ignite_paid_students
      WHERE converted_date >= ${todayStart} AND converted_date <= ${todayEnd}
    `),
    db.execute(sql`
      SELECT payment_type, status, COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total
      FROM payments
      WHERE created_at >= ${fromDate} AND created_at <= ${toDate}
      GROUP BY payment_type, status
    `),
  ]);

  const leads = leadsRows.rows as {
    assignment_status: string; grade: number; lead_source: string | null;
    assigned_mentor_id: number | null; assigned_mentor_name: string | null;
    amount_paise: number; course_value: number | null; paid_date: string;
    converted_date: Date | null;
  }[];

  const total     = leads.length;
  const converted = leads.filter(l => l.assignment_status === "converted").length;
  const assigned  = leads.filter(l => l.assignment_status !== "unassigned").length;
  const demoJoined = leads.filter(l => ["demo_started","demo_completed","converted"].includes(l.assignment_status)).length;
  const demoCompleted = leads.filter(l => ["demo_completed","converted"].includes(l.assignment_status)).length;
  const dropped   = leads.filter(l => l.assignment_status === "dropped").length;
  const demoRevenue  = leads.reduce((s, l) => s + (l.amount_paise || 0), 0) / 100;
  const courseRevenue = leads.filter(l => l.assignment_status === "converted").reduce((s, l) => s + (l.course_value || 0), 0);

  // Grade-wise
  const gradeMap: Record<number, { leads: number; converted: number; revenue: number }> = {};
  for (const l of leads) {
    if (!gradeMap[l.grade]) gradeMap[l.grade] = { leads: 0, converted: 0, revenue: 0 };
    gradeMap[l.grade].leads++;
    if (l.assignment_status === "converted") { gradeMap[l.grade].converted++; gradeMap[l.grade].revenue += l.course_value || 0; }
  }

  // Mentor performance
  const mentorMap: Record<string, { name: string; leads: number; converted: number; revenue: number }> = {};
  for (const l of leads) {
    if (!l.assigned_mentor_id) continue;
    const k = String(l.assigned_mentor_id);
    if (!mentorMap[k]) mentorMap[k] = { name: l.assigned_mentor_name || "Unknown", leads: 0, converted: 0, revenue: 0 };
    mentorMap[k].leads++;
    if (l.assignment_status === "converted") { mentorMap[k].converted++; mentorMap[k].revenue += l.course_value || 0; }
  }

  // Lead source
  const sourceMap: Record<string, { leads: number; converted: number; revenue: number }> = {};
  for (const l of leads) {
    const src = l.lead_source || "Unknown";
    if (!sourceMap[src]) sourceMap[src] = { leads: 0, converted: 0, revenue: 0 };
    sourceMap[src].leads++;
    if (l.assignment_status === "converted") { sourceMap[src].converted++; sourceMap[src].revenue += l.course_value || 0; }
  }

  // Daily trend
  const dailyMap: Record<string, { date: string; leads: number; converted: number; revenue: number }> = {};
  for (const l of leads) {
    const d = String(l.paid_date);
    if (!dailyMap[d]) dailyMap[d] = { date: d, leads: 0, converted: 0, revenue: 0 };
    dailyMap[d].leads++;
    if (l.assignment_status === "converted") { dailyMap[d].converted++; dailyMap[d].revenue += l.course_value || 0; }
  }

  // Payment summary — split Ignite (demo_enrollment) vs Mastery (other types)
  const pmtRows = paymentRows.rows as { payment_type: string; status: string; cnt: string; total: string }[];
  const ignitePmt  = { captured: 0, failed: 0, pending: 0, revenue: 0 };
  const masteryPmt = { captured: 0, failed: 0, pending: 0, revenue: 0 };
  for (const p of pmtRows) {
    const cnt = Number(p.cnt);
    const amt = Number(p.total) / 100;
    const isIgnite = p.payment_type === "demo_enrollment";
    const bucket = isIgnite ? ignitePmt : masteryPmt;
    if (p.status === "captured") { bucket.captured += cnt; bucket.revenue += amt; }
    else if (p.status === "failed") bucket.failed += cnt;
    else bucket.pending += cnt;
  }
  // Mastery revenue also includes courseValue from converted ignite leads
  masteryPmt.revenue += courseRevenue;

  res.json({
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    kpis: {
      totalLeads: total, converted, demoRevenue, courseRevenue,
      totalRevenue: demoRevenue + courseRevenue,
      conversionPct: total > 0 ? Math.round((converted / total) * 100) : 0,
      activeMentors: Number((activeMentorRows.rows[0] as any)?.cnt || 0),
      todayAdmissions: Number((todayConvRows.rows[0] as any)?.cnt || 0),
    },
    funnel: [
      { stage: "Total Leads",    count: total },
      { stage: "Assigned",       count: assigned },
      { stage: "Demo Joined",    count: demoJoined },
      { stage: "Demo Completed", count: demoCompleted },
      { stage: "Converted",      count: converted },
      { stage: "Dropped",        count: dropped },
    ],
    gradeWise: Object.entries(gradeMap).map(([g, d]) => ({
      grade: Number(g), leads: d.leads, converted: d.converted,
      convPct: d.leads > 0 ? Math.round((d.converted / d.leads) * 100) : 0,
      revenue: d.revenue,
    })).sort((a, b) => a.grade - b.grade),
    mentorPerformance: Object.entries(mentorMap).map(([id, d]) => ({
      mentorId: Number(id), name: d.name, leads: d.leads, converted: d.converted,
      convPct: d.leads > 0 ? Math.round((d.converted / d.leads) * 100) : 0,
      revenue: d.revenue,
    })).sort((a, b) => b.convPct - a.convPct),
    leadSource: Object.entries(sourceMap).map(([src, d]) => ({
      source: src, leads: d.leads, converted: d.converted,
      convPct: d.leads > 0 ? Math.round((d.converted / d.leads) * 100) : 0,
      revenue: d.revenue,
    })).sort((a, b) => b.leads - a.leads),
    dailyTrend: Object.values(dailyMap).sort((a: any, b: any) => a.date < b.date ? -1 : 1),
    payments: { ignite: ignitePmt, mastery: masteryPmt },
  });
});

// ── Teacher Notes (add) ───────────────────────────────────────────
router.post("/admin/teachers/:id/notes", adminOnly, async (req, res) => {
  const teacherId = parseInt(String(req.params.id), 10);
  if (isNaN(teacherId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { note } = req.body;
  if (!note?.trim()) { res.status(400).json({ error: "Note cannot be empty" }); return; }
  const [teacher] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, teacherId)).limit(1);
  if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }
  const actor = req.authUser!;
  const [row] = await db.insert(auditLogsTable).values({ actorId: actor.id, actorName: actor.name, actorRole: actor.role, actorEmail: actor.email ?? undefined, action: "teacher_note", actionLabel: "Added note", category: "admin", module: "teachers", targetType: "teacher", targetId: teacherId, targetName: teacher.name, metadata: note.trim() }).returning();
  res.json({ id: row.id, note: row.metadata, addedBy: row.actorName, createdAt: row.createdAt });
});

export default router;
