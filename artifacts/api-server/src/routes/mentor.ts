import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  mentorStudentAssignmentsTable,
  mentorFollowUpsTable,
  mentorAttendanceTable,
  homeworkSubmissionsTable,
  testSubmissionsTable,
  liveClassesTable,
} from "@workspace/db";
import { eq, and, desc, sql, inArray, gte, lte, or } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";
import crypto from "crypto";

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(pw + "braintam_salt").digest("hex");
}

const router = Router();
const mentorAuth = requireRole("mentor", "admin");

// ── Helper: get mentor's student IDs ────────────────────────────────────
async function getMentorStudentIds(mentorId: number): Promise<number[]> {
  const rows = await db
    .select({ studentId: mentorStudentAssignmentsTable.studentId })
    .from(mentorStudentAssignmentsTable)
    .where(and(
      eq(mentorStudentAssignmentsTable.mentorId, mentorId),
      eq(mentorStudentAssignmentsTable.isActive, true),
    ));
  return rows.map(r => r.studentId);
}

// ── Helper: compute student health ──────────────────────────────────────
function computeHealth(s: {
  lastLoginDate: Date | null;
  hwPct: number;
  testTotal: number;
}): { healthScore: number; riskLevel: "excellent" | "good" | "attention" | "at-risk"; daysSinceLogin: number } {
  const daysSinceLogin = s.lastLoginDate
    ? Math.floor((Date.now() - new Date(s.lastLoginDate).getTime()) / 86400000)
    : 999;
  const loginScore = daysSinceLogin <= 1 ? 100 : daysSinceLogin <= 3 ? 80 : daysSinceLogin <= 7 ? 60 : 30;
  const healthScore = Math.round((s.hwPct * 0.5) + (loginScore * 0.3) + (s.testTotal > 0 ? 20 : 0));
  let riskLevel: "excellent" | "good" | "attention" | "at-risk";
  if (healthScore >= 90) riskLevel = "excellent";
  else if (healthScore >= 75) riskLevel = "good";
  else if (healthScore >= 50) riskLevel = "attention";
  else riskLevel = "at-risk";
  return { healthScore, riskLevel, daysSinceLogin };
}

// ── Dashboard summary ────────────────────────────────────────────────────
router.get("/mentor/dashboard", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const studentIds = await getMentorStudentIds(mentorId);
  const totalAssigned = studentIds.length;

  if (totalAssigned === 0) {
    res.json({ totalAssigned: 0, activeToday: 0, needsAttention: 0, atRisk: 0, green: 0, notActive3Days: 0, notActive7Days: 0, homeworkPending: 0, followUpReminders: [], recentFollowUps: [] });
    return;
  }

  const students = await db.select({ id: usersTable.id, lastLoginDate: usersTable.lastLoginDate }).from(usersTable).where(inArray(usersTable.id, studentIds));
  const hwCounts = await db.select({ studentId: homeworkSubmissionsTable.studentId, total: sql<number>`count(*)`, pending: sql<number>`count(*) filter (where status = 'pending')` }).from(homeworkSubmissionsTable).where(inArray(homeworkSubmissionsTable.studentId, studentIds)).groupBy(homeworkSubmissionsTable.studentId);
  const testCounts = await db.select({ studentId: testSubmissionsTable.studentId, total: sql<number>`count(*)` }).from(testSubmissionsTable).where(inArray(testSubmissionsTable.studentId, studentIds)).groupBy(testSubmissionsTable.studentId);
  const hwMap = Object.fromEntries(hwCounts.map(r => [r.studentId, r]));
  const testMap = Object.fromEntries(testCounts.map(r => [r.studentId, r]));

  let activeToday = 0, notActive3Days = 0, notActive7Days = 0, atRisk = 0, needsAttention = 0, green = 0, hwPending = 0;
  for (const s of students) {
    const hw = hwMap[s.id];
    const hwTotal = Number(hw?.total ?? 0);
    const hwDone = hwTotal - Number(hw?.pending ?? 0);
    const hwPct = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : 100;
    hwPending += Number(hw?.pending ?? 0);
    const { healthScore, riskLevel, daysSinceLogin } = computeHealth({ lastLoginDate: s.lastLoginDate, hwPct, testTotal: Number(testMap[s.id]?.total ?? 0) });
    if (daysSinceLogin <= 1) activeToday++;
    if (daysSinceLogin >= 3 && daysSinceLogin < 7) notActive3Days++;
    if (daysSinceLogin >= 7) notActive7Days++;
    if (riskLevel === "at-risk") atRisk++;
    else if (riskLevel === "attention") needsAttention++;
    else green++;
  }

  const today = new Date().toISOString().slice(0, 10);
  const followUpReminders = await db.select({
    id: mentorFollowUpsTable.id,
    studentId: mentorFollowUpsTable.studentId,
    studentName: usersTable.name,
    nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate,
    note: mentorFollowUpsTable.note,
    leadStatus: mentorFollowUpsTable.leadStatus,
  })
    .from(mentorFollowUpsTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorFollowUpsTable.studentId))
    .where(and(eq(mentorFollowUpsTable.mentorId, mentorId), lte(mentorFollowUpsTable.nextFollowUpDate, today)))
    .orderBy(mentorFollowUpsTable.nextFollowUpDate)
    .limit(10);

  const recentFollowUps = await db.select({
    id: mentorFollowUpsTable.id, studentId: mentorFollowUpsTable.studentId, studentName: usersTable.name,
    noteType: mentorFollowUpsTable.noteType, note: mentorFollowUpsTable.note, callStatus: mentorFollowUpsTable.callStatus,
    leadStatus: mentorFollowUpsTable.leadStatus, nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate, createdAt: mentorFollowUpsTable.createdAt,
  })
    .from(mentorFollowUpsTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorFollowUpsTable.studentId))
    .where(eq(mentorFollowUpsTable.mentorId, mentorId))
    .orderBy(desc(mentorFollowUpsTable.createdAt))
    .limit(5);

  res.json({ totalAssigned, activeToday, needsAttention, atRisk, green, notActive3Days, notActive7Days, homeworkPending: hwPending, followUpReminders, recentFollowUps });
});

// ── My students ──────────────────────────────────────────────────────────
router.get("/mentor/students", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "100"), 10)));

  const assignments = await db.select({ studentId: mentorStudentAssignmentsTable.studentId, assignedAt: mentorStudentAssignmentsTable.assignedAt })
    .from(mentorStudentAssignmentsTable)
    .where(and(eq(mentorStudentAssignmentsTable.mentorId, mentorId), eq(mentorStudentAssignmentsTable.isActive, true)))
    .limit(limit);

  if (assignments.length === 0) { res.json({ students: [], total: 0 }); return; }

  const studentIds = assignments.map(a => a.studentId);
  const assignedAtMap = Object.fromEntries(assignments.map(a => [a.studentId, a.assignedAt]));

  const students = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, grade: usersTable.grade, school: usersTable.school, lastLoginDate: usersTable.lastLoginDate, isActive: usersTable.isActive }).from(usersTable).where(inArray(usersTable.id, studentIds));
  const hwCounts = await db.select({ studentId: homeworkSubmissionsTable.studentId, total: sql<number>`count(*)`, pending: sql<number>`count(*) filter (where status = 'pending')` }).from(homeworkSubmissionsTable).where(inArray(homeworkSubmissionsTable.studentId, studentIds)).groupBy(homeworkSubmissionsTable.studentId);
  const testCounts = await db.select({ studentId: testSubmissionsTable.studentId, total: sql<number>`count(*)` }).from(testSubmissionsTable).where(inArray(testSubmissionsTable.studentId, studentIds)).groupBy(testSubmissionsTable.studentId);
  const hwMap = Object.fromEntries(hwCounts.map(r => [r.studentId, r]));
  const testMap = Object.fromEntries(testCounts.map(r => [r.studentId, r]));

  const result = students.map(s => {
    const hw = hwMap[s.id];
    const hwTotal = Number(hw?.total ?? 0);
    const hwPct = hwTotal > 0 ? Math.round(((hwTotal - Number(hw?.pending ?? 0)) / hwTotal) * 100) : 100;
    const { healthScore, riskLevel, daysSinceLogin } = computeHealth({ lastLoginDate: s.lastLoginDate, hwPct, testTotal: Number(testMap[s.id]?.total ?? 0) });
    return { ...s, assignedAt: assignedAtMap[s.id], hwCompletion: hwPct, hwTotal, hwPending: Number(hw?.pending ?? 0), testCount: Number(testMap[s.id]?.total ?? 0), healthScore, riskLevel, daysSinceLogin };
  });

  res.json({ students: result, total: result.length });
});

// ── Student detail ───────────────────────────────────────────────────────
router.get("/mentor/students/:id", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const studentId = parseInt(String(req.params.id), 10);

  const [assignment] = await db.select().from(mentorStudentAssignmentsTable).where(and(eq(mentorStudentAssignmentsTable.mentorId, mentorId), eq(mentorStudentAssignmentsTable.studentId, studentId), eq(mentorStudentAssignmentsTable.isActive, true))).limit(1);
  if (!assignment && req.authUser!.role !== "admin") { res.status(403).json({ error: "Not your assigned student" }); return; }

  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId)).limit(1);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const hwSubs = await db.select().from(homeworkSubmissionsTable).where(eq(homeworkSubmissionsTable.studentId, studentId)).orderBy(desc(homeworkSubmissionsTable.submittedAt)).limit(10);
  const testSubs = await db.select().from(testSubmissionsTable).where(eq(testSubmissionsTable.studentId, studentId)).orderBy(desc(testSubmissionsTable.submittedAt)).limit(10);
  const followUps = await db.select({
    id: mentorFollowUpsTable.id, studentId: mentorFollowUpsTable.studentId, noteType: mentorFollowUpsTable.noteType,
    note: mentorFollowUpsTable.note, callStatus: mentorFollowUpsTable.callStatus, callTime: mentorFollowUpsTable.callTime,
    calledBy: mentorFollowUpsTable.calledBy, calledByName: mentorFollowUpsTable.calledByName,
    leadStatus: mentorFollowUpsTable.leadStatus, nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate, createdAt: mentorFollowUpsTable.createdAt,
  }).from(mentorFollowUpsTable).where(and(eq(mentorFollowUpsTable.mentorId, mentorId), eq(mentorFollowUpsTable.studentId, studentId))).orderBy(desc(mentorFollowUpsTable.createdAt));

  const attendance = await db.select({ id: mentorAttendanceTable.id, liveClassId: mentorAttendanceTable.liveClassId, attendanceDate: mentorAttendanceTable.attendanceDate, status: mentorAttendanceTable.status, remark: mentorAttendanceTable.remark }).from(mentorAttendanceTable).where(and(eq(mentorAttendanceTable.mentorId, mentorId), eq(mentorAttendanceTable.studentId, studentId))).orderBy(desc(mentorAttendanceTable.attendanceDate)).limit(20);

  res.json({ student, hwSubs, testSubs, followUps, attendance });
});

// ── Live classes for attendance ──────────────────────────────────────────
router.get("/mentor/live-classes", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const date = String(req.query.date ?? new Date().toISOString().slice(0, 10));

  const studentIds = await getMentorStudentIds(mentorId);
  if (studentIds.length === 0) { res.json([]); return; }

  const grades = await db.select({ grade: usersTable.grade }).from(usersTable).where(inArray(usersTable.id, studentIds));
  const gradeSet = [...new Set(grades.map(g => g.grade))];

  const dayStart = new Date(date + "T00:00:00.000Z");
  const dayEnd = new Date(date + "T23:59:59.999Z");

  const classes = await db.select().from(liveClassesTable)
    .where(and(
      inArray(liveClassesTable.grade, gradeSet),
      gte(liveClassesTable.scheduledAt, dayStart),
      lte(liveClassesTable.scheduledAt, dayEnd),
      eq(liveClassesTable.isPublished, true),
    ))
    .orderBy(liveClassesTable.scheduledAt);

  res.json(classes);
});

// ── Attendance CRUD ──────────────────────────────────────────────────────
router.get("/mentor/attendance", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const date = String(req.query.date ?? new Date().toISOString().slice(0, 10));
  const liveClassId = req.query.liveClassId ? parseInt(String(req.query.liveClassId), 10) : null;

  const conditions = [eq(mentorAttendanceTable.mentorId, mentorId), eq(mentorAttendanceTable.attendanceDate, date)];
  if (liveClassId) conditions.push(eq(mentorAttendanceTable.liveClassId, liveClassId));

  const rows = await db.select({
    id: mentorAttendanceTable.id,
    studentId: mentorAttendanceTable.studentId,
    studentName: usersTable.name,
    status: mentorAttendanceTable.status,
    callStatus: mentorAttendanceTable.callStatus,
    callTime: mentorAttendanceTable.callTime,
    calledBy: mentorAttendanceTable.calledBy,
    calledByName: mentorAttendanceTable.calledByName,
    remark: mentorAttendanceTable.remark,
    liveClassId: mentorAttendanceTable.liveClassId,
    attendanceDate: mentorAttendanceTable.attendanceDate,
  })
    .from(mentorAttendanceTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorAttendanceTable.studentId))
    .where(and(...conditions))
    .orderBy(usersTable.name);

  res.json(rows);
});

router.post("/mentor/attendance", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const { studentId, liveClassId, attendanceDate, status, callStatus, callTime, calledBy, calledByName, remark } = req.body;
  if (!studentId || !attendanceDate || !status) {
    res.status(400).json({ error: "studentId, attendanceDate, status required" });
    return;
  }

  const conditions = [
    eq(mentorAttendanceTable.mentorId, mentorId),
    eq(mentorAttendanceTable.studentId, Number(studentId)),
    eq(mentorAttendanceTable.attendanceDate, String(attendanceDate)),
  ];
  if (liveClassId) conditions.push(eq(mentorAttendanceTable.liveClassId, Number(liveClassId)));

  const existing = await db.select({ id: mentorAttendanceTable.id }).from(mentorAttendanceTable).where(and(...conditions)).limit(1);

  const values = {
    status: String(status),
    callStatus: callStatus ?? null,
    callTime: callTime ?? null,
    calledBy: calledBy ?? null,
    calledByName: calledByName ?? null,
    remark: remark ?? null,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    const [row] = await db.update(mentorAttendanceTable).set(values).where(eq(mentorAttendanceTable.id, existing[0].id)).returning();
    res.json(row);
  } else {
    const [row] = await db.insert(mentorAttendanceTable).values({
      mentorId,
      studentId: Number(studentId),
      liveClassId: liveClassId ? Number(liveClassId) : null,
      attendanceDate: String(attendanceDate),
      ...values,
    }).returning();
    res.status(201).json(row);
  }
});

// ── Follow-ups ───────────────────────────────────────────────────────────
router.get("/mentor/follow-ups", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const rows = await db.select({
    id: mentorFollowUpsTable.id, studentId: mentorFollowUpsTable.studentId, studentName: usersTable.name,
    noteType: mentorFollowUpsTable.noteType, note: mentorFollowUpsTable.note,
    callStatus: mentorFollowUpsTable.callStatus, callTime: mentorFollowUpsTable.callTime,
    calledBy: mentorFollowUpsTable.calledBy, calledByName: mentorFollowUpsTable.calledByName,
    leadStatus: mentorFollowUpsTable.leadStatus, nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate,
    createdAt: mentorFollowUpsTable.createdAt,
  })
    .from(mentorFollowUpsTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorFollowUpsTable.studentId))
    .where(eq(mentorFollowUpsTable.mentorId, mentorId))
    .orderBy(desc(mentorFollowUpsTable.createdAt))
    .limit(100);
  res.json(rows);
});

router.post("/mentor/follow-ups", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const { studentId, noteType, note, callStatus, callTime, calledBy, calledByName, leadStatus, nextFollowUpDate } = req.body;
  if (!studentId || !note) { res.status(400).json({ error: "studentId and note required" }); return; }
  const [row] = await db.insert(mentorFollowUpsTable).values({
    mentorId, studentId: Number(studentId), noteType: noteType ?? "general", note: String(note),
    callStatus: callStatus ?? null, callTime: callTime ?? null, calledBy: calledBy ?? null,
    calledByName: calledByName ?? null, leadStatus: leadStatus ?? null, nextFollowUpDate: nextFollowUpDate ?? null,
  }).returning();
  res.status(201).json(row);
});

router.delete("/mentor/follow-ups/:id", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const id = parseInt(String(req.params.id), 10);
  await db.delete(mentorFollowUpsTable).where(and(eq(mentorFollowUpsTable.id, id), eq(mentorFollowUpsTable.mentorId, mentorId)));
  res.json({ ok: true });
});

// ── Admin: Mentor management ─────────────────────────────────────────────
const adminOnly = requireRole("admin");

router.get("/admin/mentors", adminOnly, async (req, res) => {
  const mentors = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, isActive: usersTable.isActive, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.role, "mentor")).orderBy(desc(usersTable.createdAt));
  const counts = await db.select({ mentorId: mentorStudentAssignmentsTable.mentorId, count: sql<number>`count(*)` }).from(mentorStudentAssignmentsTable).where(eq(mentorStudentAssignmentsTable.isActive, true)).groupBy(mentorStudentAssignmentsTable.mentorId);
  const countMap = Object.fromEntries(counts.map(c => [c.mentorId, Number(c.count)]));
  res.json(mentors.map(m => ({ ...m, studentCount: countMap[m.id] ?? 0 })));
});

router.post("/admin/mentors", adminOnly, async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) { res.status(400).json({ error: "name, email, password required" }); return; }
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) { res.status(400).json({ error: "Email already in use" }); return; }
  const [mentor] = await db.insert(usersTable).values({ name, email, phone: phone ?? null, role: "mentor", grade: 0, passwordHash: hashPassword(password), points: 0, streakDays: 0 }).returning();
  res.status(201).json({ id: mentor.id, name: mentor.name, email: mentor.email, phone: mentor.phone, isActive: mentor.isActive, createdAt: mentor.createdAt, studentCount: 0 });
});

router.patch("/admin/mentors/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { isActive, name, password, phone } = req.body;
  const updates: Record<string, unknown> = {};
  if (typeof isActive === "boolean") updates.isActive = isActive;
  if (name) updates.name = name;
  if (password) updates.passwordHash = hashPassword(password);
  if (phone !== undefined) updates.phone = phone || null;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  res.json(updated);
});

router.delete("/admin/mentors/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(mentorStudentAssignmentsTable).where(eq(mentorStudentAssignmentsTable.mentorId, id));
  await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, id));
  res.json({ ok: true });
});

router.get("/admin/mentor-student-map", adminOnly, async (req, res) => {
  const rows = await db.select({ studentId: mentorStudentAssignmentsTable.studentId, mentorId: usersTable.id, mentorName: usersTable.name, mentorPhone: usersTable.phone })
    .from(mentorStudentAssignmentsTable)
    .innerJoin(usersTable, eq(usersTable.id, mentorStudentAssignmentsTable.mentorId))
    .where(eq(mentorStudentAssignmentsTable.isActive, true));
  res.json(rows);
});

router.post("/admin/mentor-grade-assign", adminOnly, async (req, res) => {
  const { mentorId, grade } = req.body;
  if (!mentorId || grade === undefined || grade === null) { res.status(400).json({ error: "mentorId and grade required" }); return; }
  const studentRows = await db.select({ id: usersTable.id }).from(usersTable).where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true), eq(usersTable.grade, Number(grade))));
  if (studentRows.length === 0) { res.json({ assigned: 0 }); return; }
  await db.update(mentorStudentAssignmentsTable).set({ isActive: false }).where(inArray(mentorStudentAssignmentsTable.studentId, studentRows.map(s => s.id)));
  await db.insert(mentorStudentAssignmentsTable).values(studentRows.map(s => ({ mentorId: Number(mentorId), studentId: s.id })));
  res.json({ assigned: studentRows.length });
});

router.get("/admin/mentors/:id/assignments", adminOnly, async (req, res) => {
  const mentorId = parseInt(String(req.params.id), 10);
  const rows = await db.select({ id: mentorStudentAssignmentsTable.id, studentId: mentorStudentAssignmentsTable.studentId, studentName: usersTable.name, studentGrade: usersTable.grade, studentEmail: usersTable.email, assignedAt: mentorStudentAssignmentsTable.assignedAt, isActive: mentorStudentAssignmentsTable.isActive })
    .from(mentorStudentAssignmentsTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorStudentAssignmentsTable.studentId))
    .where(eq(mentorStudentAssignmentsTable.mentorId, mentorId))
    .orderBy(desc(mentorStudentAssignmentsTable.assignedAt));
  res.json(rows);
});

router.post("/admin/mentor-assignments", adminOnly, async (req, res) => {
  const { mentorId, studentId } = req.body;
  if (!mentorId || !studentId) { res.status(400).json({ error: "mentorId and studentId required" }); return; }
  await db.update(mentorStudentAssignmentsTable).set({ isActive: false }).where(eq(mentorStudentAssignmentsTable.studentId, Number(studentId)));
  const [row] = await db.insert(mentorStudentAssignmentsTable).values({ mentorId: Number(mentorId), studentId: Number(studentId) }).returning();
  res.status(201).json(row);
});

router.delete("/admin/mentor-assignments/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  await db.update(mentorStudentAssignmentsTable).set({ isActive: false }).where(eq(mentorStudentAssignmentsTable.id, id));
  res.json({ ok: true });
});

export default router;
