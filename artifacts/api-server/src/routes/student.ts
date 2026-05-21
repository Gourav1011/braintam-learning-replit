import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, subjectsTable, homeworkTable, assignmentsTable, testsTable, liveClassesTable } from "@workspace/db";
import { UpdateStudentProfileBody, GetLeaderboardQueryParams } from "@workspace/api-zod";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

const MOCK_STUDENT_ID = 1;

router.get("/student/dashboard", async (req, res) => {
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, MOCK_STUDENT_ID));
  const subjects = await db.select().from(subjectsTable).limit(6);

  const upcoming = await db.select().from(liveClassesTable)
    .where(eq(liveClassesTable.status, "upcoming")).limit(5);
  const hw = await db.select().from(homeworkTable).limit(10);
  const asgn = await db.select().from(assignmentsTable).limit(10);
  const tests = await db.select().from(testsTable)
    .where(eq(testsTable.status, "upcoming")).limit(5);

  res.json({
    studentName: student?.name ?? "Student",
    grade: student?.grade ?? 6,
    points: student?.points ?? 0,
    rank: student?.rank ?? 42,
    upcomingLiveClasses: upcoming.length,
    pendingHomework: hw.length,
    pendingAssignments: asgn.length,
    upcomingTests: tests.length,
    streakDays: student?.streakDays ?? 0,
    recentActivity: [
      { id: 1, type: "live_class", title: "Algebra Basics - Live Session", subjectName: "Mathematics", createdAt: new Date(Date.now() - 86400000).toISOString(), score: null },
      { id: 2, type: "test", title: "Chapter 3 Quiz - Photosynthesis", subjectName: "Science", createdAt: new Date(Date.now() - 172800000).toISOString(), score: 85 },
      { id: 3, type: "homework", title: "Grammar Exercise - Tenses", subjectName: "English", createdAt: new Date(Date.now() - 259200000).toISOString(), score: null },
      { id: 4, type: "video", title: "How Plants Make Food", subjectName: "Science", createdAt: new Date(Date.now() - 345600000).toISOString(), score: null },
      { id: 5, type: "course", title: "Fractions & Decimals", subjectName: "Mathematics", createdAt: new Date(Date.now() - 432000000).toISOString(), score: null },
    ],
    subjectProgress: subjects.map((s, i) => ({
      subjectId: s.id,
      subjectName: s.name,
      progress: [72, 58, 89, 45, 63, 77][i] ?? 50,
      color: s.color,
    })),
  });
});

router.get("/student/profile", async (req, res) => {
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, MOCK_STUDENT_ID));
  if (!student) {
    res.json({ id: 1, name: "Arjun Sharma", email: null, phone: "+91 98765 43210", grade: 6, avatarUrl: null, points: 1240, rank: 42, school: "DPS New Delhi" });
    return;
  }
  res.json({
    id: student.id,
    name: student.name,
    email: student.email ?? null,
    phone: student.phone ?? null,
    grade: student.grade,
    avatarUrl: student.avatarUrl ?? null,
    points: student.points,
    rank: student.rank ?? null,
    school: student.school ?? null,
  });
});

router.patch("/student/profile", async (req, res) => {
  const parsed = UpdateStudentProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.school) updates.school = parsed.data.school;
  if (parsed.data.avatarUrl) updates.avatarUrl = parsed.data.avatarUrl;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, MOCK_STUDENT_ID)).returning();
  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email ?? null,
    phone: updated.phone ?? null,
    grade: updated.grade,
    avatarUrl: updated.avatarUrl ?? null,
    points: updated.points,
    rank: updated.rank ?? null,
    school: updated.school ?? null,
  });
});

router.get("/student/progress", async (req, res) => {
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, MOCK_STUDENT_ID));
  const subjects = await db.select().from(subjectsTable).limit(6);

  res.json({
    totalPoints: student?.points ?? 1240,
    rank: student?.rank ?? 42,
    coursesCompleted: 8,
    testsAttempted: 15,
    averageScore: 78.5,
    subjectWise: subjects.map((s, i) => ({
      subjectId: s.id,
      subjectName: s.name,
      progress: [72, 58, 89, 45, 63, 77][i] ?? 50,
      color: s.color,
    })),
  });
});

router.get("/student/recent-activity", async (req, res) => {
  res.json([
    { id: 1, type: "live_class", title: "Algebra Basics - Live Session", subjectName: "Mathematics", createdAt: new Date(Date.now() - 86400000).toISOString(), score: null },
    { id: 2, type: "test", title: "Chapter 3 Quiz - Photosynthesis", subjectName: "Science", createdAt: new Date(Date.now() - 172800000).toISOString(), score: 85 },
    { id: 3, type: "homework", title: "Grammar Exercise - Tenses", subjectName: "English", createdAt: new Date(Date.now() - 259200000).toISOString(), score: null },
    { id: 4, type: "video", title: "How Plants Make Food", subjectName: "Science", createdAt: new Date(Date.now() - 345600000).toISOString(), score: null },
    { id: 5, type: "course", title: "Fractions & Decimals", subjectName: "Mathematics", createdAt: new Date(Date.now() - 432000000).toISOString(), score: null },
    { id: 6, type: "assignment", title: "Map Drawing - India Rivers", subjectName: "Social Science", createdAt: new Date(Date.now() - 518400000).toISOString(), score: null },
    { id: 7, type: "recording", title: "Chemical Reactions Explained", subjectName: "Science", createdAt: new Date(Date.now() - 604800000).toISOString(), score: null },
  ]);
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
      grade !== undefined ? eq(usersTable.grade, grade) : sql`true`
    )
    .orderBy(desc(usersTable.points))
    .limit(50);

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
      db
        .update(usersTable)
        .set({ rank: i + 1 })
        .where(eq(usersTable.id, s.id))
    )
  );

  res.json(ranked);
});

export default router;
