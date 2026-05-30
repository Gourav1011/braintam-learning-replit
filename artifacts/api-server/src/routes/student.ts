import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, subjectsTable, homeworkTable, assignmentsTable,
  testsTable, liveClassesTable, enrollmentsTable, testSubmissionsTable,
  homeworkSubmissionsTable, assignmentSubmissionsTable, dailyCoinClaimsTable,
  coursesTable, announcementsTable,
} from "@workspace/db";
import { UpdateStudentProfileBody, GetLeaderboardQueryParams } from "@workspace/api-zod";
import { eq, desc, sql, inArray, and, or, isNull } from "drizzle-orm";
import { attachUser, requireAuth } from "../middlewares/auth.js";
import { checkDailyLogin } from "../services/pointsService.js";

const router = Router();

router.get("/student/dashboard", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));

  const enrolledRows = await db
    .select({ courseId: enrollmentsTable.courseId })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.studentId, studentId));
  const courseIds = enrolledRows.map(e => e.courseId);

  const enrolledCourses = courseIds.length > 0
    ? await db.select({ id: coursesTable.id, title: coursesTable.title })
        .from(coursesTable)
        .where(inArray(coursesTable.id, courseIds))
        .limit(6)
    : [];

  const upcoming = await db.select().from(liveClassesTable)
    .where(eq(liveClassesTable.status, "upcoming")).limit(5);

  const hw = await db.select().from(homeworkTable).where(
    courseIds.length
      ? or(inArray(homeworkTable.courseId, courseIds), isNull(homeworkTable.courseId))
      : isNull(homeworkTable.courseId)
  ).limit(10);

  const asgn = await db.select().from(assignmentsTable).where(
    courseIds.length
      ? or(inArray(assignmentsTable.courseId, courseIds), isNull(assignmentsTable.courseId))
      : isNull(assignmentsTable.courseId)
  ).limit(10);

  const tests = await db.select().from(testsTable)
    .where(eq(testsTable.status, "upcoming")).limit(5);

  const recentHw = await db
    .select({ id: homeworkSubmissionsTable.id, title: homeworkTable.title, submittedAt: homeworkSubmissionsTable.submittedAt })
    .from(homeworkSubmissionsTable)
    .innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
    .where(eq(homeworkSubmissionsTable.studentId, studentId))
    .orderBy(desc(homeworkSubmissionsTable.submittedAt))
    .limit(3);

  const recentTests = await db
    .select({ id: testSubmissionsTable.id, title: testsTable.title, score: testSubmissionsTable.score, maxScore: testSubmissionsTable.maxScore, submittedAt: testSubmissionsTable.submittedAt })
    .from(testSubmissionsTable)
    .innerJoin(testsTable, eq(testSubmissionsTable.testId, testsTable.id))
    .where(eq(testSubmissionsTable.studentId, studentId))
    .orderBy(desc(testSubmissionsTable.submittedAt))
    .limit(3);

  const recentActivity = [
    ...recentHw.map(h => ({ id: h.id, type: "homework", title: h.title, subjectName: "", createdAt: h.submittedAt.toISOString(), score: null })),
    ...recentTests.map(t => ({ id: t.id, type: "test", title: t.title, subjectName: "", createdAt: t.submittedAt.toISOString(), score: t.maxScore && t.maxScore > 0 ? Math.round((t.score! / t.maxScore) * 100) : null })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 7);

  res.json({
    studentName: student?.name ?? "Student",
    grade: student?.grade ?? 6,
    points: student?.points ?? 0,
    rank: student?.rank ?? null,
    role: student?.role ?? "student",
    upcomingLiveClasses: upcoming.length,
    pendingHomework: hw.length,
    pendingAssignments: asgn.length,
    upcomingTests: tests.length,
    streakDays: student?.streakDays ?? 0,
    enrolledCourseCount: courseIds.length,
    recentActivity,
    subjectProgress: await Promise.all(
      enrolledCourses.map(async (course, i) => {
        const COLORS = ["#1d4ed8", "#7c3aed", "#059669", "#ea580c", "#0891b2", "#be185d"];
        const [[hwTotal], [asgnTotal], [hwDone], [asgnDone]] = await Promise.all([
          db.select({ n: sql<number>`count(*)::int` }).from(homeworkTable).where(eq(homeworkTable.courseId, course.id)),
          db.select({ n: sql<number>`count(*)::int` }).from(assignmentsTable).where(eq(assignmentsTable.courseId, course.id)),
          db.select({ n: sql<number>`count(*)::int` })
            .from(homeworkSubmissionsTable)
            .innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
            .where(and(eq(homeworkSubmissionsTable.studentId, studentId), eq(homeworkTable.courseId, course.id))),
          db.select({ n: sql<number>`count(*)::int` })
            .from(assignmentSubmissionsTable)
            .innerJoin(assignmentsTable, eq(assignmentSubmissionsTable.assignmentId, assignmentsTable.id))
            .where(and(eq(assignmentSubmissionsTable.studentId, studentId), eq(assignmentsTable.courseId, course.id))),
        ]);
        const total = Number(hwTotal?.n ?? 0) + Number(asgnTotal?.n ?? 0);
        const done  = Number(hwDone?.n  ?? 0) + Number(asgnDone?.n  ?? 0);
        return {
          subjectId:   course.id,
          subjectName: course.title,
          progress:    total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0,
          color:       COLORS[i] ?? COLORS[0],
        };
      })
    ),
  });
});

router.get("/student/announcements", attachUser, async (req, res) => {
  const grade = req.authUser?.grade ?? null;
  const rows = await db.select().from(announcementsTable)
    .where(
      and(
        eq(announcementsTable.isActive, true),
        or(
          isNull(announcementsTable.grade),
          grade !== null ? eq(announcementsTable.grade, grade) : isNull(announcementsTable.grade)
        )
      )
    )
    .orderBy(desc(announcementsTable.createdAt))
    .limit(10);
  res.json(rows);
});

router.get("/student/profile", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));
  if (!student) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const enrolled = await db
    .select({ grade: coursesTable.grade, courseId: coursesTable.id, courseTitle: coursesTable.title })
    .from(enrollmentsTable)
    .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
    .where(eq(enrollmentsTable.studentId, studentId))
    .limit(6);
  const effectiveGrade: number = enrolled[0]?.grade ?? student.grade ?? 6;
  const todayUTC = new Date().toISOString().slice(0, 10);
  const lastLoginUTC = student.lastLoginDate ? new Date(student.lastLoginDate).toISOString().slice(0, 10) : null;
  res.json({
    id: student.id,
    name: student.name,
    email: student.email ?? null,
    phone: student.phone ?? null,
    grade: student.grade,
    effectiveGrade,
    role: student.role ?? "student",
    avatarUrl: student.avatarUrl ?? null,
    points: student.points,
    rank: student.rank ?? null,
    school: student.school ?? null,
    state: student.state ?? null,
    city: student.city ?? null,
    board: student.board ?? null,
    streak: student.streakDays ?? 0,
    dailyLoginClaimed: lastLoginUTC === todayUTC,
    enrolledCourses: enrolled.map(e => ({ id: e.courseId, title: e.courseTitle })),
  });
});

router.patch("/student/profile", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;
  const parsed = UpdateStudentProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.school !== undefined) updates.school = parsed.data.school;
  if (parsed.data.state !== undefined) updates.state = parsed.data.state;
  if (parsed.data.city !== undefined) updates.city = parsed.data.city;
  if (parsed.data.board !== undefined) updates.board = parsed.data.board;
  if (parsed.data.grade !== undefined) updates.grade = parsed.data.grade;
  if (parsed.data.avatarUrl) updates.avatarUrl = parsed.data.avatarUrl;
  // Phone can only be set once — don't overwrite if already set
  if (parsed.data.phone && !((await db.select({ phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, studentId)).limit(1))[0]?.phone)) {
    updates.phone = parsed.data.phone;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, studentId)).returning();
  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email ?? null,
    phone: updated.phone ?? null,
    grade: updated.grade,
    role: updated.role ?? "student",
    avatarUrl: updated.avatarUrl ?? null,
    points: updated.points,
    rank: updated.rank ?? null,
    school: updated.school ?? null,
    state: updated.state ?? null,
    city: updated.city ?? null,
    board: updated.board ?? null,
  });
});

router.get("/student/progress", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId));
  const subjects = await db.select().from(subjectsTable).limit(6);

  const studentGrade = student?.grade ?? 6;

  const [
    [hwSubmitted], [hwTotal],
    [asgnSubmitted], [asgnTotal],
    [testSubmittedRow], [testsTotal],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(homeworkSubmissionsTable).where(eq(homeworkSubmissionsTable.studentId, studentId)),
    db.select({ count: sql<number>`count(*)::int` }).from(homeworkTable).where(eq(homeworkTable.grade, studentGrade)),
    db.select({ count: sql<number>`count(*)::int` }).from(assignmentSubmissionsTable).where(eq(assignmentSubmissionsTable.studentId, studentId)),
    db.select({ count: sql<number>`count(*)::int` }).from(assignmentsTable).where(eq(assignmentsTable.grade, studentGrade)),
    db.select({ count: sql<number>`count(*)::int` }).from(testSubmissionsTable).where(eq(testSubmissionsTable.studentId, studentId)),
    db.select({ count: sql<number>`count(*)::int` }).from(testsTable).where(eq(testsTable.grade, studentGrade)),
  ]);

  const testResults = await db.select({ score: testSubmissionsTable.score, maxScore: testSubmissionsTable.maxScore }).from(testSubmissionsTable).where(eq(testSubmissionsTable.studentId, studentId));
  const avgScore = testResults.length > 0
    ? Math.round(testResults.reduce((sum, t) => sum + (t.maxScore && t.maxScore > 0 ? (t.score! / t.maxScore) * 100 : 0), 0) / testResults.length)
    : 0;
  const subjectWise = await Promise.all(subjects.map(async (s, i) => {
    const COLORS = ["#1d4ed8", "#7c3aed", "#059669", "#ea580c", "#0891b2", "#be185d"];
    const [[hwTotal], [hwDone]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(homeworkTable)
        .where(and(eq(homeworkTable.subjectId, s.id), eq(homeworkTable.grade, studentGrade))),
      db.select({ n: sql<number>`count(*)::int` }).from(homeworkSubmissionsTable)
        .innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
        .where(and(eq(homeworkSubmissionsTable.studentId, studentId), eq(homeworkTable.subjectId, s.id))),
    ]);
    const total = Number(hwTotal?.n ?? 0);
    const done = Number(hwDone?.n ?? 0);
    return {
      subjectId: s.id,
      subjectName: s.name,
      progress: total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0,
      color: s.color ?? COLORS[i] ?? COLORS[0],
    };
  }));

  res.json({
    totalPoints: student?.points ?? 0,
    rank: student?.rank ?? null,
    coursesCompleted: 0,
    testsAttempted: Number(testSubmittedRow?.count ?? 0),
    testsTotal: Number(testsTotal?.count ?? 0),
    homeworkSubmitted: Number(hwSubmitted?.count ?? 0),
    homeworkTotal: Number(hwTotal?.count ?? 0),
    assignmentsSubmitted: Number(asgnSubmitted?.count ?? 0),
    assignmentsTotal: Number(asgnTotal?.count ?? 0),
    averageScore: avgScore,
    subjectWise,
  });
});

router.get("/student/recent-activity", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;

  const recentHw = await db
    .select({ id: homeworkSubmissionsTable.id, title: homeworkTable.title, submittedAt: homeworkSubmissionsTable.submittedAt })
    .from(homeworkSubmissionsTable)
    .innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
    .where(eq(homeworkSubmissionsTable.studentId, studentId))
    .orderBy(desc(homeworkSubmissionsTable.submittedAt))
    .limit(5);

  const recentAsgn = await db
    .select({ id: assignmentSubmissionsTable.id, title: assignmentsTable.title, submittedAt: assignmentSubmissionsTable.submittedAt })
    .from(assignmentSubmissionsTable)
    .innerJoin(assignmentsTable, eq(assignmentSubmissionsTable.assignmentId, assignmentsTable.id))
    .where(eq(assignmentSubmissionsTable.studentId, studentId))
    .orderBy(desc(assignmentSubmissionsTable.submittedAt))
    .limit(5);

  const recentTests = await db
    .select({ id: testSubmissionsTable.id, title: testsTable.title, score: testSubmissionsTable.score, maxScore: testSubmissionsTable.maxScore, submittedAt: testSubmissionsTable.submittedAt })
    .from(testSubmissionsTable)
    .innerJoin(testsTable, eq(testSubmissionsTable.testId, testsTable.id))
    .where(eq(testSubmissionsTable.studentId, studentId))
    .orderBy(desc(testSubmissionsTable.submittedAt))
    .limit(5);

  const activity = [
    ...recentHw.map(h => ({ id: h.id, type: "homework" as const, title: h.title, subjectName: "", createdAt: h.submittedAt.toISOString(), score: null })),
    ...recentAsgn.map(a => ({ id: a.id, type: "assignment" as const, title: a.title, subjectName: "", createdAt: a.submittedAt.toISOString(), score: null })),
    ...recentTests.map(t => ({ id: t.id, type: "test" as const, title: t.title, subjectName: "", createdAt: t.submittedAt.toISOString(), score: t.maxScore && t.maxScore > 0 ? Math.round((t.score! / t.maxScore) * 100) : null })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);

  res.json(activity);
});

router.post("/student/daily-login", requireAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const result = await checkDailyLogin(userId);
  res.json(result);
});

router.get("/student/leaderboard", async (req, res) => {
  const parsed = GetLeaderboardQueryParams.safeParse(req.query);
  const grade = parsed.success ? parsed.data.grade : undefined;

  const students = await db
    .select({
      id: usersTable.id,
      studentName: usersTable.name,
      points: usersTable.points,
      grade: usersTable.grade,
      avatarUrl: usersTable.avatarUrl,
      school: usersTable.school,
    })
    .from(usersTable)
    .where(
      grade !== undefined
        ? eq(usersTable.grade, grade)
        : eq(usersTable.role, "student")
    )
    .orderBy(desc(usersTable.points))
    .limit(30);

  const ranked = students.map((s, i) => ({
    rank: i + 1,
    studentName: s.studentName,
    points: s.points,
    grade: s.grade,
    avatarUrl: s.avatarUrl ?? null,
    school: s.school ?? null,
  }));

  await Promise.all(
    students.map((s, i) =>
      db.update(usersTable).set({ rank: i + 1 }).where(eq(usersTable.id, s.id))
    )
  );

  res.json(ranked);
});

// ── Daily Coin Claim ────────────────────────────────────────────
router.get("/student/daily-coin-status", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [claim] = await db.select()
    .from(dailyCoinClaimsTable)
    .where(and(eq(dailyCoinClaimsTable.userId, studentId), eq(dailyCoinClaimsTable.claimDate, today)));

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);

  res.json({
    claimed: !!claim,
    coins: claim?.coins ?? 10,
    nextRefreshAt: tomorrow.toISOString(),
  });
});

router.post("/student/claim-daily-coins", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;
  const today = new Date().toISOString().slice(0, 10);

  const [existing] = await db.select()
    .from(dailyCoinClaimsTable)
    .where(and(eq(dailyCoinClaimsTable.userId, studentId), eq(dailyCoinClaimsTable.claimDate, today)));

  if (existing) {
    res.status(409).json({ error: "Already claimed today" });
    return;
  }

  const coinsToAward = 10;

  await db.update(usersTable).set({
    points: sql`${usersTable.points} + ${coinsToAward}`,
  }).where(eq(usersTable.id, studentId));

  await db.insert(dailyCoinClaimsTable).values({
    userId: studentId,
    claimDate: today,
    coins: coinsToAward,
  });

  const [updated] = await db.select({ points: usersTable.points })
    .from(usersTable).where(eq(usersTable.id, studentId));

  res.json({ success: true, coins: coinsToAward, totalPoints: updated?.points ?? 0 });
});

export default router;
