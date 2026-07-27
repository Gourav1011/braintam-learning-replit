import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, subjectsTable, homeworkTable, assignmentsTable,
  testsTable, liveClassesTable, enrollmentsTable, testSubmissionsTable,
  homeworkSubmissionsTable, assignmentSubmissionsTable, dailyCoinClaimsTable,
  coursesTable, announcementsTable, pointsLedgerTable,
  mentorStudentAssignmentsTable, demoBatchEnrollmentsTable, demoBatchesTable,
  demoSessionsTable, mentorFollowUpsTable, pollAnalyticsTable, courseSubjectsTable, recordingsTable, chaptersTable,
  academicYearsTable,
} from "@workspace/db";
import { UpdateStudentProfileBody, GetLeaderboardQueryParams } from "@workspace/api-zod";
import { eq, desc, sql, inArray, and, or, isNull } from "drizzle-orm";
import { attachUser, requireAuth } from "../middlewares/auth.js";
import { checkDailyLogin } from "../services/pointsService.js";

const router = Router();

function studentDisplayName(student: {
  id: number;
  name: string | null;
  studentCode: string | null;
}): string {
  const name = student.name?.trim();

  const isPlaceholder =
    !name ||
    /^(?:Website Lead|Student)(?: \(Grade \d+\))?$/i.test(name);

  if (isPlaceholder && student.studentCode) {
    return student.studentCode;
  }

  return name || student.studentCode || `Student ${student.id}`;
}

router.get("/student/dashboard", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;
  // Fire-and-forget — updates lastLoginDate + streak every unique calendar day.
  // checkDailyLogin is idempotent: same-day calls are a no-op.
  checkDailyLogin(studentId).catch(() => {});
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

  // All four stat queries return 0 when the student has no course enrollments.
  // Live classes and tests are filtered by enrolled courseId so content from
  // other courses never leaks through, even within the same grade.
  const upcoming = courseIds.length > 0
    ? await db.select().from(liveClassesTable)
        .where(and(
          eq(liveClassesTable.status, "upcoming"),
          inArray(liveClassesTable.courseId, courseIds)
        )).limit(5)
    : [];

  const hw = courseIds.length > 0
    ? await db.select().from(homeworkTable)
        .where(inArray(homeworkTable.courseId, courseIds))
        .limit(10)
    : [];

  const asgn = courseIds.length > 0
    ? await db.select().from(assignmentsTable)
        .where(inArray(assignmentsTable.courseId, courseIds))
        .limit(10)
    : [];

  const tests = courseIds.length > 0
    ? await db.select().from(testsTable)
        .where(and(
          eq(testsTable.status, "upcoming"),
          inArray(testsTable.courseId, courseIds)
        )).limit(5)
    : [];

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
    studentName: student ? studentDisplayName(student) : "Student",
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

  const igniteEnrollments = await db
    .select({
      batchId: demoBatchEnrollmentsTable.batchId,
      enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
    })
    .from(demoBatchEnrollmentsTable)
    .where(eq(demoBatchEnrollmentsTable.studentId, studentId));

  const hasMastery = enrolled.length > 0;
  const now = Date.now();

  let hasActiveIgnite = false;
  let hasCompletedIgnite = false;
  let igniteDay2Reached = false;
  let activeIgniteBatchId: number | null = null;
  let latestIgniteBatchId: number | null = null;
  let latestIgniteBatchTime = -Infinity;

  for (const igniteEnrollment of igniteEnrollments) {
    const [batch] = await db
      .select({
        status: demoBatchesTable.status,
        endDate: demoBatchesTable.endDate,
      })
      .from(demoBatchesTable)
      .where(eq(demoBatchesTable.id, igniteEnrollment.batchId))
      .limit(1);

    if (!batch) continue;

    const batchEndTime =
      batch.endDate !== null
        ? new Date(batch.endDate).getTime()
        : Number.POSITIVE_INFINITY;

    const orderingTime = Number.isFinite(batchEndTime)
      ? batchEndTime
      : -Infinity;

    if (latestIgniteBatchId === null || orderingTime > latestIgniteBatchTime) {
      latestIgniteBatchId = igniteEnrollment.batchId;
      latestIgniteBatchTime = orderingTime;
    }

    const batchEnded =
      batch.status === "completed" ||
      (batch.endDate !== null && new Date(batch.endDate).getTime() < now);

    const isActive =
      igniteEnrollment.enrollmentStatus === "active" && !batchEnded;

    if (isActive) {
      hasActiveIgnite = true;
      activeIgniteBatchId ??= igniteEnrollment.batchId;

      const historicalDay2 = await db
        .select({ scheduledAt: demoSessionsTable.scheduledAt })
        .from(demoSessionsTable)
        .where(and(
          eq(demoSessionsTable.batchId, igniteEnrollment.batchId),
          eq(demoSessionsTable.dayNumber, 2),
          eq(demoSessionsTable.isPublished, true),
        ))
        .limit(1);

      const liveDay2 = await db
        .select({ scheduledAt: liveClassesTable.scheduledAt })
        .from(liveClassesTable)
        .where(and(
          eq(liveClassesTable.igniteBatchId, igniteEnrollment.batchId),
          eq(liveClassesTable.classType, "ignite"),
          eq(liveClassesTable.dayNumber, 2),
          eq(liveClassesTable.isPublished, true),
          eq(liveClassesTable.isArchived, false),
        ))
        .limit(1);

      const day2Times = [...historicalDay2, ...liveDay2]
        .map(row => new Date(row.scheduledAt).getTime())
        .filter(Number.isFinite);

      if (day2Times.length > 0 && now >= Math.min(...day2Times)) {
        igniteDay2Reached = true;
      }
    } else {
      hasCompletedIgnite = true;
    }
  }

  const studentPortalState =
    hasMastery ? "mastery" :
    hasActiveIgnite
      ? (igniteDay2Reached ? "ignite_day2_plus" : "ignite_before_day2")
      : hasCompletedIgnite
        ? "completed_ignite"
        : "none";

  const isDemoStudent =
    studentPortalState === "ignite_before_day2" ||
    studentPortalState === "ignite_day2_plus";

  let igniteMentor: { name: string | null; phone: string | null } | null = null;

  const mentorSourceBatchId =
    activeIgniteBatchId ??
    (studentPortalState === "completed_ignite" ? latestIgniteBatchId : null);

  if (mentorSourceBatchId !== null) {
    const [assignment] = await db
      .select({
        assignedMentorId: demoBatchEnrollmentsTable.assignedMentorId,
        assignedMentorName: demoBatchEnrollmentsTable.assignedMentorName,
      })
      .from(demoBatchEnrollmentsTable)
      .where(and(
        eq(demoBatchEnrollmentsTable.studentId, studentId),
        eq(demoBatchEnrollmentsTable.batchId, mentorSourceBatchId),
      ))
      .limit(1);

    if (assignment?.assignedMentorId) {
      const [mentor] = await db
        .select({
          name: usersTable.name,
          phone: usersTable.phone,
        })
        .from(usersTable)
        .where(eq(usersTable.id, assignment.assignedMentorId))
        .limit(1);

      igniteMentor = {
        name: mentor?.name ?? assignment.assignedMentorName ?? null,
        phone: mentor?.phone ?? null,
      };
    }
  }

  const todayUTC = new Date().toISOString().slice(0, 10);
  const lastLoginUTC = student.lastLoginDate ? new Date(student.lastLoginDate).toISOString().slice(0, 10) : null;
  res.json({
    id: student.id,
    name: studentDisplayName(student),
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
    isDemoStudent,
    studentPortalState,
    igniteMentor,
  });
});

router.post("/student/request-mastery-opportunity", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;
  const requestType = req.body?.requestType === "enroll" ? "enroll" : "scholarship";

  const activeEnrollmentRows = await db
    .select({
      batchId: demoBatchEnrollmentsTable.batchId,
      mentorId: demoBatchEnrollmentsTable.assignedMentorId,
      batchStatus: demoBatchesTable.status,
      batchEndDate: demoBatchesTable.endDate,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(
      demoBatchesTable,
      eq(demoBatchesTable.id, demoBatchEnrollmentsTable.batchId),
    )
    .where(and(
      eq(demoBatchEnrollmentsTable.studentId, studentId),
      eq(demoBatchEnrollmentsTable.enrollmentStatus, "active"),
    ));

  const requestNow = Date.now();

  const currentIgniteEnrollment = activeEnrollmentRows.find((row) =>
    row.batchStatus !== "completed" &&
    (row.batchEndDate === null || new Date(row.batchEndDate).getTime() >= requestNow)
  );

  let igniteEnrollment = currentIgniteEnrollment;

  if (!igniteEnrollment) {
    const allIgniteRows = await db
      .select({
        batchId: demoBatchEnrollmentsTable.batchId,
        mentorId: demoBatchEnrollmentsTable.assignedMentorId,
        batchStatus: demoBatchesTable.status,
        batchEndDate: demoBatchesTable.endDate,
      })
      .from(demoBatchEnrollmentsTable)
      .innerJoin(
        demoBatchesTable,
        eq(demoBatchesTable.id, demoBatchEnrollmentsTable.batchId),
      )
      .where(eq(demoBatchEnrollmentsTable.studentId, studentId));

    const completedRows = allIgniteRows
      .filter((row) =>
        row.batchStatus === "completed" ||
        (row.batchEndDate !== null &&
          new Date(row.batchEndDate).getTime() < requestNow)
      )
      .sort((a, b) => {
        const aTime = a.batchEndDate
          ? new Date(a.batchEndDate).getTime()
          : -Infinity;
        const bTime = b.batchEndDate
          ? new Date(b.batchEndDate).getTime()
          : -Infinity;

        return bTime - aTime;
      });

    igniteEnrollment = completedRows[0];
  }

  if (!igniteEnrollment) {
    res.status(409).json({ error: "No Ignite enrollment found for this opportunity." });
    return;
  }

  if (!igniteEnrollment.mentorId) {
    res.status(409).json({ error: "Mentor not assigned yet. Contact Support." });
    return;
  }

  const [followUp] = await db.insert(mentorFollowUpsTable).values({
    mentorId: igniteEnrollment.mentorId,
    studentId,
    noteType: requestType === "enroll" ? "mastery_enrollment" : "mastery_opportunity",
    note: requestType === "enroll"
      ? "Student requested to enroll in Mastery and receive the payment link."
      : "Student requested to check their Mastery scholarship price.",
    leadStatus: "Interested",
  }).returning();

  res.status(201).json({ ok: true, followUpId: followUp.id });
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
    name: studentDisplayName(updated),
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

  // Only count content from courses the student is actually enrolled in.
  // If they have no enrollments, all totals are 0 — nothing to do.
  const enrolledRows = await db
    .select({ courseId: enrollmentsTable.courseId })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.studentId, studentId));
  const courseIds = enrolledRows.map(e => e.courseId);

  const [
    [hwSubmitted], [hwTotal],
    [asgnSubmitted], [asgnTotal],
    [testSubmittedRow], [testsTotal],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(homeworkSubmissionsTable).where(eq(homeworkSubmissionsTable.studentId, studentId)),
    courseIds.length > 0
      ? db.select({ count: sql<number>`count(*)::int` }).from(homeworkTable).where(inArray(homeworkTable.courseId, courseIds))
      : Promise.resolve([{ count: 0 }]),
    db.select({ count: sql<number>`count(*)::int` }).from(assignmentSubmissionsTable).where(eq(assignmentSubmissionsTable.studentId, studentId)),
    courseIds.length > 0
      ? db.select({ count: sql<number>`count(*)::int` }).from(assignmentsTable).where(inArray(assignmentsTable.courseId, courseIds))
      : Promise.resolve([{ count: 0 }]),
    db.select({ count: sql<number>`count(*)::int` }).from(testSubmissionsTable).where(eq(testSubmissionsTable.studentId, studentId)),
    courseIds.length > 0
      ? db.select({ count: sql<number>`count(*)::int` }).from(testsTable).where(eq(testsTable.grade, studentGrade))
      : Promise.resolve([{ count: 0 }]),
  ]);

  const testResults = await db.select({ score: testSubmissionsTable.score, maxScore: testSubmissionsTable.maxScore }).from(testSubmissionsTable).where(eq(testSubmissionsTable.studentId, studentId));
  const avgScore = testResults.length > 0
    ? Math.round(testResults.reduce((sum, t) => sum + (t.maxScore && t.maxScore > 0 ? (t.score! / t.maxScore) * 100 : 0), 0) / testResults.length)
    : 0;

  // Subject-wise progress: only count homework in enrolled courses
  const subjectWise = await Promise.all(subjects.map(async (s, i) => {
    const COLORS = ["#1d4ed8", "#7c3aed", "#059669", "#ea580c", "#0891b2", "#be185d"];
    if (courseIds.length === 0) {
      return { subjectId: s.id, subjectName: s.name, progress: 0, color: s.color ?? COLORS[i] ?? COLORS[0] };
    }
    const [[hwSubjTotal], [hwDone]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(homeworkTable)
        .where(and(eq(homeworkTable.subjectId, s.id), inArray(homeworkTable.courseId, courseIds))),
      db.select({ n: sql<number>`count(*)::int` }).from(homeworkSubmissionsTable)
        .innerJoin(homeworkTable, eq(homeworkSubmissionsTable.homeworkId, homeworkTable.id))
        .where(and(eq(homeworkSubmissionsTable.studentId, studentId), eq(homeworkTable.subjectId, s.id), inArray(homeworkTable.courseId, courseIds))),
    ]);
    const total = Number(hwSubjTotal?.n ?? 0);
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
      studentCode: usersTable.studentCode,
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
    .limit(20);

  const ranked = students.map((s, i) => ({
    rank: i + 1,
    studentName: studentDisplayName({
      id: s.id,
      name: s.studentName,
      studentCode: s.studentCode,
    }),
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

router.get("/student/points-history", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;
  const history = await db
    .select({
      id:         pointsLedgerTable.id,
      amount:     pointsLedgerTable.amount,
      actionType: pointsLedgerTable.actionType,
      note:       pointsLedgerTable.note,
      createdAt:  pointsLedgerTable.createdAt,
    })
    .from(pointsLedgerTable)
    .where(eq(pointsLedgerTable.userId, studentId))
    .orderBy(desc(pointsLedgerTable.createdAt))
    .limit(25);

  const now      = new Date();
  const weekAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const weekPoints  = history.filter(h => h.createdAt >= weekAgo).reduce((s, h) => s + h.amount, 0);
  const monthPoints = history.filter(h => h.createdAt >= monthAgo).reduce((s, h) => s + h.amount, 0);

  res.json({
    history:     history.map(h => ({ ...h, createdAt: h.createdAt.toISOString() })),
    weekPoints,
    monthPoints,
  });
});

// ── Live Poll Performance (permanent history) ────────────────────────────
// Every poll answer is recorded to poll_analytics at answer time and never deleted,
// so this reflects the student's full participation history across all live classes.
router.get("/student/poll-history", requireAuth, async (req, res) => {
  const studentId = String(req.authUser!.id);
  const rows = await db
    .select({
      id: pollAnalyticsTable.id,
      sessionId: pollAnalyticsTable.sessionId,
      pollQuestion: pollAnalyticsTable.pollQuestion,
      optionText: pollAnalyticsTable.optionText,
      isCorrect: pollAnalyticsTable.isCorrect,
      responseTimeMs: pollAnalyticsTable.responseTimeMs,
      answeredAt: pollAnalyticsTable.answeredAt,
    })
    .from(pollAnalyticsTable)
    .where(eq(pollAnalyticsTable.studentId, studentId))
    .orderBy(desc(pollAnalyticsTable.answeredAt))
    .limit(200);

  const totalAnswered = rows.length;
  const totalCorrect = rows.filter(r => r.isCorrect).length;

  res.json({
    history: rows.map(r => ({ ...r, answeredAt: r.answeredAt.toISOString() })),
    totalAnswered,
    totalCorrect,
    accuracyPct: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
  });
});

// ── My Mentor ──────────────────────────────────────────────────────────────
// ── GET /student/my-courses ───────────────────────────────────────
// Returns enrolled courses enriched with batch info (for Ignite courses).
// Called from student dashboard to show immediate course access after payment.
router.get("/student/my-courses", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;

  const enrollmentRows = await db
    .select({
      enrollmentId: enrollmentsTable.id,
      courseId: enrollmentsTable.courseId,
      batchId: enrollmentsTable.batchId,
      enrollmentType: enrollmentsTable.enrollmentType,
      enrolledAt: enrollmentsTable.enrolledAt,
      courseTitle: coursesTable.title,
      courseType: coursesTable.courseType,
      courseThumbnail: coursesTable.thumbnailUrl,
      courseDescription: coursesTable.description,
      totalLessons: coursesTable.totalLessons,
      courseGrade: coursesTable.grade,
    instanceName: coursesTable.instanceName,
    })
    .from(enrollmentsTable)
    .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
    .where(and(
      eq(enrollmentsTable.studentId, studentId),
      eq(coursesTable.isArchived, false),
      eq(enrollmentsTable.status, "active"),
    ))
    .orderBy(desc(enrollmentsTable.enrolledAt));

  const batchIds = enrollmentRows.map((e) => e.batchId).filter(Boolean) as number[];
  const batchRows = batchIds.length > 0
    ? await db.select().from(demoBatchesTable).where(inArray(demoBatchesTable.id, batchIds))
    : [];
  const batchMap = new Map(batchRows.map((b) => [b.id, b]));

  const result = enrollmentRows.map((e) => {
    const batch = e.batchId ? batchMap.get(e.batchId) : null;
    return {
      enrollmentId: e.enrollmentId,
      courseId: e.courseId,
      courseTitle: e.courseTitle,
      courseType: e.courseType,
      courseThumbnail: e.courseThumbnail,
      description: e.courseDescription,
      totalLessons: e.totalLessons,
      grade: e.courseGrade,
      enrollmentType: e.enrollmentType,
      enrolledAt: e.enrolledAt,
      instanceName: e.instanceName ?? null,
      batch: batch
        ? {
            id: batch.id,
            title: batch.title,
            startDate: batch.startDate,
            endDate: batch.endDate,
            status: batch.status,
            teacherName: batch.teacherName,
            joinLink: batch.joinLink,
          }
        : null,
    };
  });

  res.json(result);
});

// ── GET /student/my-courses/completed ───────────────────────────────────────
// Returns past (completed/archived) enrollments with content counts.
// Courses returned here are NEVER deleted — status is 'completed' or 'archived'.
router.get("/student/my-courses/completed", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;

  const rows = await db
    .select({
      enrollmentId: enrollmentsTable.id,
      courseId: enrollmentsTable.courseId,
      enrollmentType: enrollmentsTable.enrollmentType,
      courseTitle: coursesTable.title,
      courseGrade: coursesTable.grade,
      totalLessons: coursesTable.totalLessons,
      academicYearId: coursesTable.academicYearId,
      enrolledAt: enrollmentsTable.enrolledAt,
      completedAt: enrollmentsTable.completedAt,
      completionNote: enrollmentsTable.completionNote,
      subjectCount: sql<number>`(
        SELECT COUNT(*)::int FROM course_subjects WHERE course_id = ${coursesTable.id}
      )`,
      recordingCount: sql<number>`(
        SELECT COUNT(*)::int FROM recordings WHERE course_id = ${coursesTable.id}
      )`,
      chapterCount: sql<number>`(
        SELECT COUNT(*)::int FROM chapters WHERE course_id = ${coursesTable.id}
      )`,
      academicYearName: academicYearsTable.name,
    })
    .from(enrollmentsTable)
    .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
    .leftJoin(academicYearsTable, eq(coursesTable.academicYearId, academicYearsTable.id))
    .where(and(
      eq(enrollmentsTable.studentId, studentId),
      sql`${enrollmentsTable.status} IN ('completed', 'archived')`,
    ))
    .orderBy(desc(enrollmentsTable.completedAt));

  const completedCourses = rows
    .filter(r => r.enrollmentType !== "ignite")
    .map(r => ({
    enrollmentId: r.enrollmentId,
    courseId: r.courseId,
    courseTitle: r.courseTitle,
    grade: r.courseGrade,
    totalLessons: r.totalLessons,
    subjectCount: r.subjectCount ?? 0,
    recordingCount: r.recordingCount ?? 0,
    chapterCount: r.chapterCount ?? 0,
    academicYear: r.academicYearName ?? null,
    enrolledAt: r.enrolledAt,
    completedAt: r.completedAt ?? null,
    completionNote: r.completionNote ?? null,
  }));

  // Keep every completed Ignite/demo attempt as its own historical course.
  // A student may attend multiple Ignite batches before converting to Mastery.
  const demoRows = await db
    .select({
      enrollmentId: demoBatchEnrollmentsTable.id,
      enrolledAt: demoBatchEnrollmentsTable.enrolledAt,
      enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
      batchId: demoBatchesTable.id,
      title: demoBatchesTable.title,
      grade: demoBatchesTable.grade,
      totalDays: demoBatchesTable.totalDays,
      endDate: demoBatchesTable.endDate,
      batchStatus: demoBatchesTable.status,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(
      demoBatchesTable,
      eq(demoBatchEnrollmentsTable.batchId, demoBatchesTable.id),
    )
    .where(eq(demoBatchEnrollmentsTable.studentId, studentId));

  const now = Date.now();

  const completedDemoCourses = demoRows
    .filter(d => {
      const endedByDate =
        d.endDate !== null &&
        new Date(d.endDate).getTime() < now;

      return (
        d.enrollmentStatus === "completed" ||
        d.batchStatus === "completed" ||
        endedByDate
      );
    })
    .map(d => ({
      // Negative ID prevents collision with normal course-enrollment IDs
      // while keeping the existing frontend response shape.
      enrollmentId: -d.enrollmentId,
      courseId: -d.batchId,
      courseTitle: d.title,
      grade: d.grade,
      totalLessons: d.totalDays ?? 0,
      subjectCount: 0,
      recordingCount: 0,
      chapterCount: 0,
      academicYear: null,
      enrolledAt: d.enrolledAt,
      completedAt: d.endDate ?? null,
      completionNote: "Ignite batch completed",
    }));

  res.json([...completedCourses, ...completedDemoCourses].sort((a, b) => {
    const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return bTime - aTime;
  }));
});

router.get("/student/my-mentor", requireAuth, async (req, res) => {
  const studentId = req.authUser!.id;
  const [row] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      phone: usersTable.phone,
      email: usersTable.email,
    })
    .from(mentorStudentAssignmentsTable)
    .innerJoin(usersTable, eq(usersTable.id, mentorStudentAssignmentsTable.mentorId))
    .where(
      and(
        eq(mentorStudentAssignmentsTable.studentId, studentId),
        eq(mentorStudentAssignmentsTable.isActive, true),
      )
    )
    .limit(1);
  res.json(row ?? null);
});

export default router;
