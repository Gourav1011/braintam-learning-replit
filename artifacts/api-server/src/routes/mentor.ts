import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  mentorStudentAssignmentsTable,
  mentorFollowUpsTable,
  mentorFollowUpEditsTable,
  mentorAttendanceTable,
  homeworkSubmissionsTable,
  testSubmissionsTable,
  liveClassesTable,
  studentTimelineTable,
  mentorTasksTable,
  mentorReminderPrefsTable,
  doubtSessionsTable,
  leadStatusHistoryTable,
} from "@workspace/db";
import { eq, and, desc, sql, inArray, gte, lte, or, lt } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";
import crypto from "crypto";
import { runOverdueFollowUpReminders } from "../jobs/overdueFollowUpReminders.js";

function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update(pw + "braintam_salt").digest("hex");
}

const router = Router();
const mentorAuth = requireRole("mentor", "admin");

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

function computeFollowUpStatus(nextFollowUpDate: string | null, callStatus: string | null): {
  fuStatus: "due_today" | "overdue" | "upcoming" | "completed";
  daysOverdue: number;
} {
  if (callStatus === "completed") return { fuStatus: "completed", daysOverdue: 0 };
  if (!nextFollowUpDate) return { fuStatus: "upcoming", daysOverdue: 0 };
  const today = new Date().toISOString().slice(0, 10);
  if (nextFollowUpDate === today) return { fuStatus: "due_today", daysOverdue: 0 };
  if (nextFollowUpDate < today) {
    const daysOverdue = Math.floor((new Date(today).getTime() - new Date(nextFollowUpDate).getTime()) / 86400000);
    return { fuStatus: "overdue", daysOverdue };
  }
  return { fuStatus: "upcoming", daysOverdue: 0 };
}

// ── Dashboard ────────────────────────────────────────────────────────────
router.get("/mentor/dashboard", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const mentorRow = await db.select({ mentorType: usersTable.mentorType }).from(usersTable).where(eq(usersTable.id, mentorId)).limit(1);
  const mentorType = mentorRow[0]?.mentorType ?? "academic";

  const studentIds = await getMentorStudentIds(mentorId);
  const totalAssigned = studentIds.length;

  if (totalAssigned === 0) {
    res.json({ mentorType, totalAssigned: 0, activeToday: 0, needsAttention: 0, atRisk: 0, green: 0, notActive3Days: 0, notActive7Days: 0, homeworkPending: 0, followUpReminders: [], recentFollowUps: [], pendingTasks: 0, overdueTasks: 0 });
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
    const { riskLevel, daysSinceLogin } = computeHealth({ lastLoginDate: s.lastLoginDate, hwPct, testTotal: Number(testMap[s.id]?.total ?? 0) });
    if (daysSinceLogin <= 1) activeToday++;
    if (daysSinceLogin >= 3 && daysSinceLogin < 7) notActive3Days++;
    if (daysSinceLogin >= 7) notActive7Days++;
    if (riskLevel === "at-risk") atRisk++;
    else if (riskLevel === "attention") needsAttention++;
    else green++;
  }

  const today = new Date().toISOString().slice(0, 10);
  const allFollowUps = await db.select({
    id: mentorFollowUpsTable.id, studentId: mentorFollowUpsTable.studentId, studentName: usersTable.name,
    nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate, note: mentorFollowUpsTable.note,
    leadStatus: mentorFollowUpsTable.leadStatus, callStatus: mentorFollowUpsTable.callStatus,
  })
    .from(mentorFollowUpsTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorFollowUpsTable.studentId))
    .where(eq(mentorFollowUpsTable.mentorId, mentorId))
    .orderBy(mentorFollowUpsTable.nextFollowUpDate);

  const followUpReminders = allFollowUps
    .filter(r => r.nextFollowUpDate && r.nextFollowUpDate <= today && r.callStatus !== "completed")
    .slice(0, 10)
    .map(r => ({ ...r, ...computeFollowUpStatus(r.nextFollowUpDate, r.callStatus) }));

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

  const taskCounts = await db.select({ status: mentorTasksTable.status, count: sql<number>`count(*)` })
    .from(mentorTasksTable).where(eq(mentorTasksTable.mentorId, mentorId)).groupBy(mentorTasksTable.status);
  const taskMap = Object.fromEntries(taskCounts.map(t => [t.status, Number(t.count)]));
  const overdueTaskRows = await db.select({ id: mentorTasksTable.id })
    .from(mentorTasksTable)
    .where(and(eq(mentorTasksTable.mentorId, mentorId), lte(mentorTasksTable.dueDate, today), or(eq(mentorTasksTable.status, "pending"), eq(mentorTasksTable.status, "in_progress"))));

  res.json({
    mentorType,
    totalAssigned, activeToday, needsAttention, atRisk, green, notActive3Days, notActive7Days,
    homeworkPending: hwPending, followUpReminders, recentFollowUps,
    pendingTasks: (taskMap["pending"] ?? 0) + (taskMap["in_progress"] ?? 0),
    overdueTasks: overdueTaskRows.length,
  });
});

// ── My students ──────────────────────────────────────────────────────────
router.get("/mentor/students", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "200"), 10)));

  const assignments = await db.select({ studentId: mentorStudentAssignmentsTable.studentId, assignedAt: mentorStudentAssignmentsTable.assignedAt })
    .from(mentorStudentAssignmentsTable)
    .where(and(eq(mentorStudentAssignmentsTable.mentorId, mentorId), eq(mentorStudentAssignmentsTable.isActive, true)))
    .limit(limit);

  if (assignments.length === 0) { res.json({ students: [], total: 0 }); return; }

  const studentIds = assignments.map(a => a.studentId);
  const assignedAtMap = Object.fromEntries(assignments.map(a => [a.studentId, a.assignedAt]));

  const students = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone,
    grade: usersTable.grade, school: usersTable.school, lastLoginDate: usersTable.lastLoginDate,
    isActive: usersTable.isActive, leadStage: usersTable.leadStage,
    parentName: usersTable.parentName, parentPhone: usersTable.parentPhone,
  }).from(usersTable).where(inArray(usersTable.id, studentIds));

  const hwCounts = await db.select({ studentId: homeworkSubmissionsTable.studentId, total: sql<number>`count(*)`, pending: sql<number>`count(*) filter (where status = 'pending')` }).from(homeworkSubmissionsTable).where(inArray(homeworkSubmissionsTable.studentId, studentIds)).groupBy(homeworkSubmissionsTable.studentId);
  const testCounts = await db.select({ studentId: testSubmissionsTable.studentId, total: sql<number>`count(*)` }).from(testSubmissionsTable).where(inArray(testSubmissionsTable.studentId, studentIds)).groupBy(testSubmissionsTable.studentId);
  const attCounts = await db.select({ studentId: mentorAttendanceTable.studentId, total: sql<number>`count(*)`, present: sql<number>`count(*) filter (where status = 'present')` }).from(mentorAttendanceTable).where(inArray(mentorAttendanceTable.studentId, studentIds)).groupBy(mentorAttendanceTable.studentId);
  const hwMap = Object.fromEntries(hwCounts.map(r => [r.studentId, r]));
  const testMap = Object.fromEntries(testCounts.map(r => [r.studentId, r]));
  const attMap = Object.fromEntries(attCounts.map(r => [r.studentId, r]));

  const result = students.map(s => {
    const hw = hwMap[s.id];
    const hwTotal = Number(hw?.total ?? 0);
    const hwPct = hwTotal > 0 ? Math.round(((hwTotal - Number(hw?.pending ?? 0)) / hwTotal) * 100) : 100;
    const { healthScore, riskLevel, daysSinceLogin } = computeHealth({ lastLoginDate: s.lastLoginDate, hwPct, testTotal: Number(testMap[s.id]?.total ?? 0) });
    const attTotal = Number(attMap[s.id]?.total ?? 0);
    const attendancePct = attTotal > 0 ? Math.round((Number(attMap[s.id]?.present ?? 0) / attTotal) * 100) : null;
    return { ...s, assignedAt: assignedAtMap[s.id], hwCompletion: hwPct, hwTotal, hwPending: Number(hw?.pending ?? 0), testCount: Number(testMap[s.id]?.total ?? 0), healthScore, riskLevel, daysSinceLogin, attendancePct };
  });

  res.json({ students: result, total: result.length });
});

// ── Mentor: Student health summary (bucketed) ─────────────────────────────
// NOTE: must be defined BEFORE /mentor/students/:id or Express will match "health-summary" as :id
router.get("/mentor/students/health-summary", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const studentIds = await getMentorStudentIds(mentorId);
  if (studentIds.length === 0) {
    res.json({ green: [], yellow: [], red: [], critical: [], total: 0 });
    return;
  }

  const students = await db.select({
    id: usersTable.id, name: usersTable.name, grade: usersTable.grade,
    lastLoginDate: usersTable.lastLoginDate, leadStage: usersTable.leadStage,
  }).from(usersTable).where(inArray(usersTable.id, studentIds));

  const hwCounts = await db.select({ studentId: homeworkSubmissionsTable.studentId, total: sql<number>`count(*)`, pending: sql<number>`count(*) filter (where status = 'pending')` })
    .from(homeworkSubmissionsTable).where(inArray(homeworkSubmissionsTable.studentId, studentIds)).groupBy(homeworkSubmissionsTable.studentId);
  const testCounts = await db.select({ studentId: testSubmissionsTable.studentId, total: sql<number>`count(*)` })
    .from(testSubmissionsTable).where(inArray(testSubmissionsTable.studentId, studentIds)).groupBy(testSubmissionsTable.studentId);
  const hwMap = Object.fromEntries(hwCounts.map(r => [r.studentId, r]));
  const testMap = Object.fromEntries(testCounts.map(r => [r.studentId, r]));

  const buckets: Record<"green" | "yellow" | "red" | "critical", Array<{ id: number; name: string; grade: number; healthScore: number; daysSinceLogin: number; leadStage: string | null }>> = { green: [], yellow: [], red: [], critical: [] };

  for (const s of students) {
    const hw = hwMap[s.id];
    const hwTotal = Number(hw?.total ?? 0);
    const hwPct = hwTotal > 0 ? Math.round(((hwTotal - Number(hw?.pending ?? 0)) / hwTotal) * 100) : 100;
    const { healthScore, daysSinceLogin } = computeHealth({ lastLoginDate: s.lastLoginDate, hwPct, testTotal: Number(testMap[s.id]?.total ?? 0) });
    const entry = { id: s.id, name: s.name, grade: s.grade, healthScore, daysSinceLogin, leadStage: s.leadStage };
    if (healthScore >= 75) buckets.green.push(entry);
    else if (healthScore >= 50) buckets.yellow.push(entry);
    else if (healthScore >= 25) buckets.red.push(entry);
    else buckets.critical.push(entry);
  }

  res.json({ ...buckets, total: students.length });
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
  }).from(mentorFollowUpsTable).where(eq(mentorFollowUpsTable.studentId, studentId)).orderBy(desc(mentorFollowUpsTable.createdAt));

  const attendance = await db.select({
    id: mentorAttendanceTable.id, liveClassId: mentorAttendanceTable.liveClassId,
    attendanceDate: mentorAttendanceTable.attendanceDate, status: mentorAttendanceTable.status, remark: mentorAttendanceTable.remark,
  }).from(mentorAttendanceTable).where(eq(mentorAttendanceTable.studentId, studentId)).orderBy(desc(mentorAttendanceTable.attendanceDate)).limit(20);

  const timeline = await db.select().from(studentTimelineTable).where(eq(studentTimelineTable.studentId, studentId)).orderBy(desc(studentTimelineTable.createdAt)).limit(100);

  res.json({ student, hwSubs, testSubs, followUps, attendance, timeline });
});

// ── Update student (lead stage / parent info) ────────────────────────────
router.patch("/mentor/students/:id", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const studentId = parseInt(String(req.params.id), 10);

  if (req.authUser!.role !== "admin") {
    const [assignment] = await db.select({ id: mentorStudentAssignmentsTable.id }).from(mentorStudentAssignmentsTable)
      .where(and(eq(mentorStudentAssignmentsTable.mentorId, mentorId), eq(mentorStudentAssignmentsTable.studentId, studentId), eq(mentorStudentAssignmentsTable.isActive, true))).limit(1);
    if (!assignment) { res.status(403).json({ error: "Not your assigned student" }); return; }
  }

  const {
    leadStage, parentName, parentPhone,
    weakSubject, strongSubject, interestLevel, repeatedCustomer,
    displayName, referenceGrade, altPhone, notes,
  } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (leadStage !== undefined) updates.leadStage = leadStage || null;
  if (parentName !== undefined) updates.parentName = parentName || null;
  if (parentPhone !== undefined) updates.parentPhone = parentPhone || null;
  if (weakSubject !== undefined) updates.weakSubject = weakSubject || null;
  if (strongSubject !== undefined) updates.strongSubject = strongSubject || null;
  if (interestLevel !== undefined) updates.interestLevel = interestLevel || null;
  if (repeatedCustomer !== undefined) updates.repeatedCustomer = Boolean(repeatedCustomer);
  // New mentor-editable fields — displayName/referenceGrade/altPhone/notes only
  if (displayName !== undefined) updates.displayName = displayName || null;
  if (referenceGrade !== undefined) updates.referenceGrade = referenceGrade ? Number(referenceGrade) : null;
  if (altPhone !== undefined) updates.altPhone = altPhone || null;
  if (notes !== undefined) updates.notes = notes || null;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, studentId)).returning({
    id: usersTable.id, leadStage: usersTable.leadStage, parentName: usersTable.parentName, parentPhone: usersTable.parentPhone,
    weakSubject: usersTable.weakSubject, strongSubject: usersTable.strongSubject, interestLevel: usersTable.interestLevel,
    displayName: usersTable.displayName, referenceGrade: usersTable.referenceGrade,
    altPhone: usersTable.altPhone, notes: usersTable.notes,
  });
  res.json(updated);
});

// ── Student Timeline (append-only, no DELETE/PATCH) ──────────────────────
router.get("/mentor/timeline/:studentId", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const studentId = parseInt(String(req.params.studentId), 10);

  if (req.authUser!.role !== "admin") {
    const [assignment] = await db.select({ id: mentorStudentAssignmentsTable.id }).from(mentorStudentAssignmentsTable)
      .where(and(eq(mentorStudentAssignmentsTable.mentorId, mentorId), eq(mentorStudentAssignmentsTable.studentId, studentId), eq(mentorStudentAssignmentsTable.isActive, true))).limit(1);
    if (!assignment) { res.status(403).json({ error: "Not your assigned student" }); return; }
  }

  const rows = await db.select().from(studentTimelineTable)
    .where(eq(studentTimelineTable.studentId, studentId))
    .orderBy(desc(studentTimelineTable.createdAt)).limit(200);
  res.json(rows);
});

router.post("/mentor/timeline/:studentId", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const studentId = parseInt(String(req.params.studentId), 10);

  if (req.authUser!.role !== "admin") {
    const [assignment] = await db.select({ id: mentorStudentAssignmentsTable.id }).from(mentorStudentAssignmentsTable)
      .where(and(eq(mentorStudentAssignmentsTable.mentorId, mentorId), eq(mentorStudentAssignmentsTable.studentId, studentId), eq(mentorStudentAssignmentsTable.isActive, true))).limit(1);
    if (!assignment) { res.status(403).json({ error: "Not your assigned student" }); return; }
  }

  const { noteType, remark, followUpDate, actionTaken } = req.body;
  if (!remark?.trim()) { res.status(400).json({ error: "remark is required" }); return; }

  const author = req.authUser!;
  const [row] = await db.insert(studentTimelineTable).values({
    studentId, createdById: author.id, createdByName: author.name, createdByRole: author.role,
    noteType: noteType ?? "general", remark: String(remark),
    followUpDate: followUpDate ?? null, actionTaken: actionTaken ?? null,
  }).returning();
  res.status(201).json(row);
});

// ── Mentor Tasks ─────────────────────────────────────────────────────────
router.get("/mentor/tasks", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const today = new Date().toISOString().slice(0, 10);

  const tasks = await db.select({
    id: mentorTasksTable.id, title: mentorTasksTable.title, taskType: mentorTasksTable.taskType,
    status: mentorTasksTable.status, dueDate: mentorTasksTable.dueDate, note: mentorTasksTable.note,
    studentId: mentorTasksTable.studentId, studentName: usersTable.name,
    completedAt: mentorTasksTable.completedAt, createdAt: mentorTasksTable.createdAt,
  })
    .from(mentorTasksTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorTasksTable.studentId))
    .where(eq(mentorTasksTable.mentorId, mentorId))
    .orderBy(desc(mentorTasksTable.createdAt))
    .limit(200);

  const enriched = tasks.map(t => {
    let effectiveStatus = t.status;
    if (effectiveStatus !== "completed" && t.dueDate && t.dueDate < today) effectiveStatus = "overdue";
    return { ...t, effectiveStatus };
  });

  res.json(enriched);
});

router.post("/mentor/tasks", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const { title, taskType, studentId, dueDate, note } = req.body;
  if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }
  const [row] = await db.insert(mentorTasksTable).values({
    mentorId, title: String(title), taskType: taskType ?? "general",
    studentId: studentId ? Number(studentId) : null,
    status: "pending", dueDate: dueDate ?? null, note: note ?? null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/mentor/tasks/:id", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const id = parseInt(String(req.params.id), 10);

  const [existing] = await db.select({ id: mentorTasksTable.id }).from(mentorTasksTable)
    .where(and(eq(mentorTasksTable.id, id), eq(mentorTasksTable.mentorId, mentorId))).limit(1);
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  const { status, note, dueDate, title } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status) { updates.status = status; if (status === "completed") updates.completedAt = new Date(); }
  if (note !== undefined) updates.note = note;
  if (dueDate !== undefined) updates.dueDate = dueDate || null;
  if (title) updates.title = title;

  const [updated] = await db.update(mentorTasksTable).set(updates).where(eq(mentorTasksTable.id, id)).returning();
  res.json(updated);
});

router.delete("/mentor/tasks/:id", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const id = parseInt(String(req.params.id), 10);
  await db.delete(mentorTasksTable).where(and(eq(mentorTasksTable.id, id), eq(mentorTasksTable.mentorId, mentorId)));
  res.json({ ok: true });
});

// ── Live classes for attendance ──────────────────────────────────────────
router.get("/mentor/live-classes", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const upcoming = req.query.upcoming === "true";
  const date = String(req.query.date ?? new Date().toISOString().slice(0, 10));

  const studentIds = await getMentorStudentIds(mentorId);
  if (studentIds.length === 0) { res.json([]); return; }

  const grades = await db.select({ grade: usersTable.grade }).from(usersTable).where(inArray(usersTable.id, studentIds));
  const gradeSet = [...new Set(grades.map(g => g.grade))];

  let rangeStart: Date;
  let rangeEnd: Date;
  if (upcoming) {
    rangeStart = new Date();
    rangeEnd = new Date();
    rangeEnd.setDate(rangeEnd.getDate() + 14);
  } else {
    rangeStart = new Date(date + "T00:00:00.000Z");
    rangeEnd = new Date(date + "T23:59:59.999Z");
  }

  const classes = await db.select({
    id: liveClassesTable.id,
    title: liveClassesTable.title,
    grade: liveClassesTable.grade,
    scheduledAt: liveClassesTable.scheduledAt,
    duration: liveClassesTable.duration,
    status: liveClassesTable.status,
    joinUrl: liveClassesTable.joinUrl,
    teacher: liveClassesTable.teacher,
    subjectId: liveClassesTable.subjectId,
  }).from(liveClassesTable)
    .where(and(
      inArray(liveClassesTable.grade, gradeSet),
      gte(liveClassesTable.scheduledAt, rangeStart),
      lte(liveClassesTable.scheduledAt, rangeEnd),
      eq(liveClassesTable.isPublished, true),
    ))
    .orderBy(liveClassesTable.scheduledAt)
    .limit(upcoming ? 20 : 100);

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
    id: mentorAttendanceTable.id, studentId: mentorAttendanceTable.studentId, studentName: usersTable.name,
    status: mentorAttendanceTable.status, callStatus: mentorAttendanceTable.callStatus,
    callTime: mentorAttendanceTable.callTime, calledBy: mentorAttendanceTable.calledBy,
    calledByName: mentorAttendanceTable.calledByName, remark: mentorAttendanceTable.remark,
    liveClassId: mentorAttendanceTable.liveClassId, attendanceDate: mentorAttendanceTable.attendanceDate,
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
  if (!studentId || !attendanceDate || !status) { res.status(400).json({ error: "studentId, attendanceDate, status required" }); return; }

  const conditions = [
    eq(mentorAttendanceTable.mentorId, mentorId),
    eq(mentorAttendanceTable.studentId, Number(studentId)),
    eq(mentorAttendanceTable.attendanceDate, String(attendanceDate)),
  ];
  if (liveClassId) conditions.push(eq(mentorAttendanceTable.liveClassId, Number(liveClassId)));

  const existing = await db.select({ id: mentorAttendanceTable.id }).from(mentorAttendanceTable).where(and(...conditions)).limit(1);
  const values = { status: String(status), callStatus: callStatus ?? null, callTime: callTime ?? null, calledBy: calledBy ?? null, calledByName: calledByName ?? null, remark: remark ?? null, updatedAt: new Date() };

  if (existing.length > 0) {
    const [row] = await db.update(mentorAttendanceTable).set(values).where(eq(mentorAttendanceTable.id, existing[0].id)).returning();
    res.json(row);
  } else {
    const [row] = await db.insert(mentorAttendanceTable).values({ mentorId, studentId: Number(studentId), liveClassId: liveClassId ? Number(liveClassId) : null, attendanceDate: String(attendanceDate), ...values }).returning();
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
    .limit(200);

  const enriched = rows.map(r => ({ ...r, ...computeFollowUpStatus(r.nextFollowUpDate, r.callStatus) }));
  res.json(enriched);
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

router.patch("/mentor/follow-ups/:id", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const actorName = req.authUser!.name ?? "Staff";
  const actorRole = req.authUser!.role ?? "mentor";
  const id = parseInt(String(req.params.id), 10);

  const { noteType, note, callStatus, callTime, calledBy, calledByName, leadStatus, nextFollowUpDate, editRemark } = req.body;
  const isFullEdit = editRemark !== undefined;

  if (isFullEdit && !String(editRemark ?? "").trim()) {
    res.status(400).json({ error: "editRemark is required when editing a follow-up." });
    return;
  }
  if (!isFullEdit && callStatus === "completed" && !String(note ?? "").trim()) {
    res.status(400).json({ error: "A completion remark is required when marking a follow-up as completed." });
    return;
  }

  const [existing] = await db.select().from(mentorFollowUpsTable)
    .where(and(eq(mentorFollowUpsTable.id, id), eq(mentorFollowUpsTable.mentorId, mentorId))).limit(1);
  if (!existing) { res.status(404).json({ error: "Follow-up not found" }); return; }

  const updates: Record<string, unknown> = {};
  if (noteType !== undefined) updates.noteType = noteType;
  if (note !== undefined) updates.note = note;
  if (callStatus !== undefined) updates.callStatus = callStatus;
  if (callTime !== undefined) updates.callTime = callTime;
  if (calledBy !== undefined) updates.calledBy = calledBy;
  if (calledByName !== undefined) updates.calledByName = calledByName;
  if (leadStatus !== undefined) updates.leadStatus = leadStatus;
  if (nextFollowUpDate !== undefined) updates.nextFollowUpDate = nextFollowUpDate;

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }

  if (isFullEdit) {
    await db.insert(mentorFollowUpEditsTable).values({
      followUpId: id,
      editedById: mentorId,
      editedByName: actorName,
      editedByRole: actorRole,
      previousNote: existing.note,
      editRemark: String(editRemark).trim(),
    });
  }

  const [row] = await db.update(mentorFollowUpsTable).set(updates)
    .where(and(eq(mentorFollowUpsTable.id, id), eq(mentorFollowUpsTable.mentorId, mentorId))).returning();
  res.json({ ...row, ...computeFollowUpStatus(row.nextFollowUpDate, row.callStatus) });
});

router.get("/mentor/follow-ups/:id/edits", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const id = parseInt(String(req.params.id), 10);
  const [ownership] = await db.select({ id: mentorFollowUpsTable.id }).from(mentorFollowUpsTable)
    .where(and(eq(mentorFollowUpsTable.id, id), eq(mentorFollowUpsTable.mentorId, mentorId))).limit(1);
  if (!ownership) { res.status(404).json({ error: "Follow-up not found" }); return; }
  const edits = await db.select().from(mentorFollowUpEditsTable)
    .where(eq(mentorFollowUpEditsTable.followUpId, id))
    .orderBy(desc(mentorFollowUpEditsTable.editedAt));
  res.json(edits);
});

router.delete("/mentor/follow-ups/:id", mentorAuth, async (_req, res) => {
  res.status(405).json({ error: "Follow-ups cannot be deleted. Edit the record instead." });
});

// ── Reminder Preferences ─────────────────────────────────────────────────
router.get("/mentor/reminder-prefs", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const [row] = await db
    .select()
    .from(mentorReminderPrefsTable)
    .where(eq(mentorReminderPrefsTable.mentorId, mentorId))
    .limit(1);
  if (!row) {
    res.json({ mentorId, remindersEnabled: true, digestMode: true, digestTime: "09:00" });
    return;
  }
  res.json(row);
});

router.put("/mentor/reminder-prefs", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const { remindersEnabled, digestMode, digestTime } = req.body;

  if (digestTime !== undefined) {
    if (typeof digestTime !== "string" || !/^\d{2}:\d{2}$/.test(digestTime)) {
      res.status(400).json({ error: "digestTime must be in HH:MM format (e.g. '09:00')" });
      return;
    }
  }

  const values = {
    mentorId,
    remindersEnabled: typeof remindersEnabled === "boolean" ? remindersEnabled : true,
    digestMode: typeof digestMode === "boolean" ? digestMode : true,
    digestTime: typeof digestTime === "string" ? digestTime : "09:00",
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(mentorReminderPrefsTable)
    .values(values)
    .onConflictDoUpdate({
      target: mentorReminderPrefsTable.mentorId,
      set: { remindersEnabled: values.remindersEnabled, digestMode: values.digestMode, digestTime: values.digestTime, updatedAt: values.updatedAt },
    })
    .returning();
  res.json(row);
});

// Admin-only: manually trigger reminder job (for testing / on-demand dispatch)
router.post("/admin/trigger-reminder-job", requireRole("admin"), async (_req, res) => {
  runOverdueFollowUpReminders().catch(() => {});
  res.json({ ok: true, message: "Reminder job triggered in background" });
});

// ── Admin: Mentor management ─────────────────────────────────────────────
const adminOnly = requireRole("admin");

router.get("/admin/mentors", adminOnly, async (req, res) => {
  const mentors = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, isActive: usersTable.isActive, mentorType: usersTable.mentorType, createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.role, "mentor")).orderBy(desc(usersTable.createdAt));
  const counts = await db.select({ mentorId: mentorStudentAssignmentsTable.mentorId, count: sql<number>`count(*)` }).from(mentorStudentAssignmentsTable).where(eq(mentorStudentAssignmentsTable.isActive, true)).groupBy(mentorStudentAssignmentsTable.mentorId);
  const countMap = Object.fromEntries(counts.map(c => [c.mentorId, Number(c.count)]));
  res.json(mentors.map(m => ({ ...m, studentCount: countMap[m.id] ?? 0 })));
});

router.post("/admin/mentors", adminOnly, async (req, res) => {
  const { name, email, phone, password, mentorType } = req.body;
  if (!name || !email || !password) { res.status(400).json({ error: "name, email, password required" }); return; }
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) { res.status(400).json({ error: "Email already in use" }); return; }
  const [mentor] = await db.insert(usersTable).values({ name, email, phone: phone ?? null, role: "mentor", grade: 0, passwordHash: hashPassword(password), points: 0, streakDays: 0, mentorType: mentorType ?? "academic" }).returning();
  res.status(201).json({ id: mentor.id, name: mentor.name, email: mentor.email, phone: mentor.phone, isActive: mentor.isActive, mentorType: mentor.mentorType, createdAt: mentor.createdAt, studentCount: 0 });
});

router.patch("/admin/mentors/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { isActive, name, password, phone, mentorType } = req.body;
  const updates: Record<string, unknown> = {};
  if (typeof isActive === "boolean") updates.isActive = isActive;
  if (name) updates.name = name;
  if (password) updates.passwordHash = hashPassword(password);
  if (phone !== undefined) updates.phone = phone || null;

  let delinkCount = 0;
  if (mentorType) {
    const [current] = await db
      .select({ mentorType: usersTable.mentorType })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    const currentType = current?.mentorType ?? "academic";
    updates.mentorType = mentorType;
    // Type is changing — delink all active student assignments
    if (currentType !== mentorType) {
      const delinked = await db
        .update(mentorStudentAssignmentsTable)
        .set({ isActive: false })
        .where(and(
          eq(mentorStudentAssignmentsTable.mentorId, id),
          eq(mentorStudentAssignmentsTable.isActive, true),
        ))
        .returning({ id: mentorStudentAssignmentsTable.id });
      delinkCount = delinked.length;
    }
  }

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  res.json({ ...updated, studentCount: 0, delinkCount });
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

// ── Admin: BTL CRM Overview ──────────────────────────────────────────────

// Pipeline summary: count per lead stage across all assigned students
router.get("/admin/btl-crm/pipeline", adminOnly, async (_req, res) => {
  const students = await db
    .select({ leadStage: usersTable.leadStage })
    .from(usersTable)
    .innerJoin(mentorStudentAssignmentsTable, and(
      eq(mentorStudentAssignmentsTable.studentId, usersTable.id),
      eq(mentorStudentAssignmentsTable.isActive, true),
    ))
    .where(eq(usersTable.role, "student"));

  const stageCounts: Record<string, number> = {};
  let unassignedToStage = 0;
  for (const s of students) {
    if (s.leadStage) {
      stageCounts[s.leadStage] = (stageCounts[s.leadStage] ?? 0) + 1;
    } else {
      unassignedToStage++;
    }
  }

  const totalAssigned = students.length;
  const converted = (stageCounts["Converted"] ?? 0) + (stageCounts["Paid Student"] ?? 0);
  const dropped = stageCounts["Dropped"] ?? 0;
  const active = totalAssigned - dropped - unassignedToStage;

  res.json({ stageCounts, totalAssigned, converted, dropped, unassignedToStage, active });
});

// Mentor performance table: per-mentor stats across their pipeline
router.get("/admin/btl-crm/mentor-performance", adminOnly, async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const mentors = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, isActive: usersTable.isActive })
    .from(usersTable)
    .where(eq(usersTable.role, "mentor"));

  if (mentors.length === 0) { res.json([]); return; }

  const mentorIds = mentors.map(m => m.id);

  const assignmentCounts = await db
    .select({ mentorId: mentorStudentAssignmentsTable.mentorId, count: sql<number>`count(*)` })
    .from(mentorStudentAssignmentsTable)
    .where(and(inArray(mentorStudentAssignmentsTable.mentorId, mentorIds), eq(mentorStudentAssignmentsTable.isActive, true)))
    .groupBy(mentorStudentAssignmentsTable.mentorId);
  const assignMap = Object.fromEntries(assignmentCounts.map(r => [r.mentorId, Number(r.count)]));

  const followUpStats = await db
    .select({
      mentorId: mentorFollowUpsTable.mentorId,
      total: sql<number>`count(*)`,
      completed: sql<number>`count(*) filter (where call_status = 'completed')`,
      overdue: sql<number>`count(*) filter (where next_follow_up_date < ${today} and call_status != 'completed' and next_follow_up_date is not null)`,
    })
    .from(mentorFollowUpsTable)
    .where(inArray(mentorFollowUpsTable.mentorId, mentorIds))
    .groupBy(mentorFollowUpsTable.mentorId);
  const fuMap = Object.fromEntries(followUpStats.map(r => [r.mentorId, r]));

  const taskStats = await db
    .select({
      mentorId: mentorTasksTable.mentorId,
      total: sql<number>`count(*)`,
      done: sql<number>`count(*) filter (where status = 'done')`,
      overdue: sql<number>`count(*) filter (where status in ('pending','in_progress') and due_date < ${today})`,
    })
    .from(mentorTasksTable)
    .where(inArray(mentorTasksTable.mentorId, mentorIds))
    .groupBy(mentorTasksTable.mentorId);
  const taskMap = Object.fromEntries(taskStats.map(r => [r.mentorId, r]));

  // students converted per mentor
  const convertedCounts = await db
    .select({ mentorId: mentorStudentAssignmentsTable.mentorId, count: sql<number>`count(*)` })
    .from(mentorStudentAssignmentsTable)
    .innerJoin(usersTable, and(
      eq(usersTable.id, mentorStudentAssignmentsTable.studentId),
      inArray(usersTable.leadStage, ["Converted", "Paid Student"]),
    ))
    .where(and(inArray(mentorStudentAssignmentsTable.mentorId, mentorIds), eq(mentorStudentAssignmentsTable.isActive, true)))
    .groupBy(mentorStudentAssignmentsTable.mentorId);
  const convMap = Object.fromEntries(convertedCounts.map(r => [r.mentorId, Number(r.count)]));

  const result = mentors.map(m => {
    const fu = fuMap[m.id];
    const tk = taskMap[m.id];
    const fuTotal = Number(fu?.total ?? 0);
    const fuDone = Number(fu?.completed ?? 0);
    const fuCompletionRate = fuTotal > 0 ? Math.round((fuDone / fuTotal) * 100) : null;
    return {
      id: m.id,
      name: m.name,
      email: m.email,
      isActive: m.isActive,
      totalStudents: assignMap[m.id] ?? 0,
      converted: convMap[m.id] ?? 0,
      followUpTotal: fuTotal,
      followUpDone: fuDone,
      followUpCompletionRate: fuCompletionRate,
      overdueFollowUps: Number(fu?.overdue ?? 0),
      totalTasks: Number(tk?.total ?? 0),
      doneTasks: Number(tk?.done ?? 0),
      overdueTasks: Number(tk?.overdue ?? 0),
    };
  });

  res.json(result);
});

// Students filtered by pipeline lead stage (assigned to any mentor)
router.get("/admin/btl-crm/pipeline/students", adminOnly, async (req, res) => {
  const stage = String(req.query.stage ?? "").trim();
  if (!stage) { res.status(400).json({ error: "stage query param required" }); return; }

  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      grade: usersTable.grade,
      school: usersTable.school,
      parentName: usersTable.parentName,
      parentPhone: usersTable.parentPhone,
      leadStage: usersTable.leadStage,
    })
    .from(usersTable)
    .innerJoin(mentorStudentAssignmentsTable, and(
      eq(mentorStudentAssignmentsTable.studentId, usersTable.id),
      eq(mentorStudentAssignmentsTable.isActive, true),
    ))
    .where(and(
      eq(usersTable.role, "student"),
      eq(usersTable.leadStage, stage),
    ))
    .orderBy(usersTable.name);

  res.json(rows);
});

// Global overdue follow-up reminders across all mentors
router.get("/admin/btl-crm/overdue-reminders", adminOnly, async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      id: mentorFollowUpsTable.id,
      mentorId: mentorFollowUpsTable.mentorId,
      mentorName: sql<string>`(select name from users where id = ${mentorFollowUpsTable.mentorId})`,
      studentId: mentorFollowUpsTable.studentId,
      studentName: usersTable.name,
      studentGrade: usersTable.grade,
      leadStatus: mentorFollowUpsTable.leadStatus,
      note: mentorFollowUpsTable.note,
      nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate,
      callStatus: mentorFollowUpsTable.callStatus,
      createdAt: mentorFollowUpsTable.createdAt,
    })
    .from(mentorFollowUpsTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorFollowUpsTable.studentId))
    .where(and(
      sql`${mentorFollowUpsTable.nextFollowUpDate} < ${today}`,
      sql`${mentorFollowUpsTable.callStatus} != 'completed'`,
      sql`${mentorFollowUpsTable.nextFollowUpDate} is not null`,
    ))
    .orderBy(mentorFollowUpsTable.nextFollowUpDate)
    .limit(100);

  const enriched = rows.map(r => ({
    ...r,
    daysOverdue: r.nextFollowUpDate
      ? Math.floor((new Date(today).getTime() - new Date(r.nextFollowUpDate).getTime()) / 86400000)
      : 0,
  }));

  res.json(enriched);
});

// Unassigned students: active students with no active mentor assignment
router.get("/admin/btl-crm/unassigned", adminOnly, async (_req, res) => {
  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      grade: usersTable.grade,
      school: usersTable.school,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(
      mentorStudentAssignmentsTable,
      and(
        eq(mentorStudentAssignmentsTable.studentId, usersTable.id),
        eq(mentorStudentAssignmentsTable.isActive, true),
      ),
    )
    .where(and(
      eq(usersTable.role, "student"),
      eq(usersTable.isActive, true),
      sql`${mentorStudentAssignmentsTable.id} is null`,
    ))
    .orderBy(usersTable.grade, usersTable.name);

  res.json({ count: rows.length, students: rows });
});

// Admin: full student CRM detail (contact info + last 5 timeline entries)
router.get("/admin/btl-crm/student/:id", adminOnly, async (req, res) => {
  const studentId = parseInt(String(req.params.id), 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid student id" }); return; }

  const [student] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      grade: usersTable.grade,
      school: usersTable.school,
      leadStage: usersTable.leadStage,
      parentName: usersTable.parentName,
      parentPhone: usersTable.parentPhone,
      lastLoginDate: usersTable.lastLoginDate,
    })
    .from(usersTable)
    .where(eq(usersTable.id, studentId))
    .limit(1);

  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const timeline = await db
    .select()
    .from(studentTimelineTable)
    .where(eq(studentTimelineTable.studentId, studentId))
    .orderBy(desc(studentTimelineTable.createdAt))
    .limit(5);

  res.json({ student, timeline });
});

// ── Mentor: Sales pipeline (scoped to my students) ───────────────────────
router.get("/mentor/my-pipeline", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const studentIds = await getMentorStudentIds(mentorId);
  if (studentIds.length === 0) { res.json([]); return; }

  const students = await db.select({
    id: usersTable.id, name: usersTable.name, grade: usersTable.grade,
    phone: usersTable.phone, parentPhone: usersTable.parentPhone,
    leadStage: usersTable.leadStage, accountType: usersTable.accountType,
  }).from(usersTable).where(inArray(usersTable.id, studentIds));

  const today = new Date().toISOString().slice(0, 10);

  // Latest follow-up per student
  const latestFu = await db.select({
    studentId: mentorFollowUpsTable.studentId,
    nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate,
    note: mentorFollowUpsTable.note,
    createdAt: mentorFollowUpsTable.createdAt,
  }).from(mentorFollowUpsTable)
    .where(and(eq(mentorFollowUpsTable.mentorId, mentorId), inArray(mentorFollowUpsTable.studentId, studentIds)))
    .orderBy(desc(mentorFollowUpsTable.createdAt));

  const fuMap = new Map<number, typeof latestFu[0]>();
  for (const f of latestFu) {
    if (!fuMap.has(f.studentId)) fuMap.set(f.studentId, f);
  }

  const result = students.map(s => {
    const fu = fuMap.get(s.id);
    const nextFollowUpDate = fu?.nextFollowUpDate ?? null;
    const daysOverdue = nextFollowUpDate && nextFollowUpDate < today
      ? Math.floor((new Date(today).getTime() - new Date(nextFollowUpDate).getTime()) / 86400000)
      : 0;
    return {
      ...s,
      lastContact: fu?.createdAt ?? null,
      nextFollowUpDate,
      lastNote: fu?.note ?? null,
      daysOverdue,
    };
  });

  res.json(result);
});

// ── Mentor: Leaderboard ───────────────────────────────────────────────────
router.get("/mentor/leaderboard", mentorAuth, async (req, res) => {
  const period = String(req.query.period ?? "week");

  const now = new Date();
  let startDate: Date;
  if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "all") {
    startDate = new Date(2024, 0, 1);
  } else {
    // week
    const day = now.getDay();
    startDate = new Date(now);
    startDate.setDate(now.getDate() - day);
    startDate.setHours(0, 0, 0, 0);
  }

  const mentors = await db.select({ id: usersTable.id, name: usersTable.name, mentorType: usersTable.mentorType })
    .from(usersTable).where(and(eq(usersTable.role, "mentor"), eq(usersTable.isActive, true)));
  if (mentors.length === 0) { res.json([]); return; }

  const mentorIds = mentors.map(m => m.id);

  const [followUps, doubtSessions, assignments] = await Promise.all([
    db.select({ mentorId: mentorFollowUpsTable.mentorId, noteType: mentorFollowUpsTable.noteType, count: sql<number>`count(*)` })
      .from(mentorFollowUpsTable)
      .where(and(inArray(mentorFollowUpsTable.mentorId, mentorIds), gte(mentorFollowUpsTable.createdAt, startDate)))
      .groupBy(mentorFollowUpsTable.mentorId, mentorFollowUpsTable.noteType),
    db.select({ mentorId: doubtSessionsTable.mentorId, count: sql<number>`count(*)` })
      .from(doubtSessionsTable)
      .where(and(inArray(doubtSessionsTable.mentorId, mentorIds), sql`${doubtSessionsTable.scheduledDate} >= ${startDate.toISOString().slice(0, 10)}`))
      .groupBy(doubtSessionsTable.mentorId),
    db.select({ mentorId: mentorStudentAssignmentsTable.mentorId, count: sql<number>`count(*)` })
      .from(mentorStudentAssignmentsTable)
      .where(and(inArray(mentorStudentAssignmentsTable.mentorId, mentorIds), eq(mentorStudentAssignmentsTable.isActive, true)))
      .groupBy(mentorStudentAssignmentsTable.mentorId),
  ]);

  const fuMap = new Map<number, { calls: number; followUps: number; parentCalls: number }>();
  for (const f of followUps) {
    const cur = fuMap.get(f.mentorId) ?? { calls: 0, followUps: 0, parentCalls: 0 };
    cur.followUps += Number(f.count);
    if (f.noteType === "Check-in Call" || f.noteType === "General Note") cur.calls += Number(f.count);
    if (f.noteType === "Parent Call") cur.parentCalls += Number(f.count);
    fuMap.set(f.mentorId, cur);
  }
  const dsMap = new Map(doubtSessions.map(d => [d.mentorId, Number(d.count)]));
  const assignMap = new Map(assignments.map(a => [a.mentorId, Number(a.count)]));

  const ranked = mentors.map(m => {
    const fu = fuMap.get(m.id) ?? { calls: 0, followUps: 0, parentCalls: 0 };
    const ds = dsMap.get(m.id) ?? 0;
    const assigned = assignMap.get(m.id) ?? 0;
    // Score: calls×3 + followUps×2 + parentCalls×2 + doubtSessions×4
    const score = fu.calls * 3 + fu.followUps * 2 + fu.parentCalls * 2 + ds * 4;
    return {
      id: m.id, name: m.name, mentorType: m.mentorType,
      callsThisWeek: fu.calls,
      followUpsThisWeek: fu.followUps,
      doubtSessionsThisWeek: ds,
      studentsEngaged: fu.followUps,
      studentsAssigned: assigned,
      score,
    };
  }).sort((a, b) => b.score - a.score)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  res.json(ranked);
});

// ── Mentor: Dashboard (extend to include mentorType) ─────────────────────
// (mentorType is added by fetching the user row — it's already in req.authUser via auth middleware)

// ── Sales SSM: Leads list ─────────────────────────────────────────────────
router.get("/mentor/sales/leads", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;

  const assignments = await db
    .select({ studentId: mentorStudentAssignmentsTable.studentId })
    .from(mentorStudentAssignmentsTable)
    .where(and(eq(mentorStudentAssignmentsTable.mentorId, mentorId), eq(mentorStudentAssignmentsTable.isActive, true)));

  if (assignments.length === 0) { res.json([]); return; }
  const studentIds = assignments.map(a => a.studentId);

  const students = await db.select({
    id: usersTable.id, name: usersTable.name, grade: usersTable.grade,
    school: usersTable.school, city: usersTable.city, state: usersTable.state,
    phone: usersTable.phone, parentName: usersTable.parentName, parentPhone: usersTable.parentPhone,
    leadStage: usersTable.leadStage, callStatus: usersTable.callStatus,
    interestLevel: usersTable.interestLevel, weakSubject: usersTable.weakSubject,
    strongSubject: usersTable.strongSubject, repeatedCustomer: usersTable.repeatedCustomer,
    nextFollowUpAt: usersTable.nextFollowUpAt, nextFollowUpTime: usersTable.nextFollowUpTime,
    lastCallAt: usersTable.lastCallAt, busyReason: usersTable.busyReason,
  }).from(usersTable).where(inArray(usersTable.id, studentIds));

  const hwCounts = await db.select({
    studentId: homeworkSubmissionsTable.studentId,
    total: sql<number>`count(*)`,
    pending: sql<number>`count(*) filter (where status = 'pending')`,
  }).from(homeworkSubmissionsTable).where(inArray(homeworkSubmissionsTable.studentId, studentIds)).groupBy(homeworkSubmissionsTable.studentId);

  const attCounts = await db.select({
    studentId: mentorAttendanceTable.studentId,
    total: sql<number>`count(*)`,
    present: sql<number>`count(*) filter (where status = 'present')`,
  }).from(mentorAttendanceTable).where(inArray(mentorAttendanceTable.studentId, studentIds)).groupBy(mentorAttendanceTable.studentId);

  const hwMap = Object.fromEntries(hwCounts.map(r => [r.studentId, r]));
  const attMap = Object.fromEntries(attCounts.map(r => [r.studentId, r]));

  const result = students.map(s => {
    const hw = hwMap[s.id];
    const hwTotal = Number(hw?.total ?? 0);
    const hwPct = hwTotal > 0 ? Math.round(((hwTotal - Number(hw?.pending ?? 0)) / hwTotal) * 100) : null;
    const att = attMap[s.id];
    const attTotal = Number(att?.total ?? 0);
    const attPct = attTotal > 0 ? Math.round((Number(att?.present ?? 0) / attTotal) * 100) : null;
    return {
      ...s,
      hwPct, hwTotal, hwPending: Number(hw?.pending ?? 0),
      attPct, attTotal,
      leadStage: s.leadStage ?? "New Lead",
      callStatus: s.callStatus ?? "Need To Call",
    };
  });

  res.json(result);
});

// ── Sales SSM: Dashboard metrics ──────────────────────────────────────────
router.get("/mentor/sales/dashboard", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const studentIds = await getMentorStudentIds(mentorId);

  if (studentIds.length === 0) {
    res.json({ assignedLeads: 0, needToCall: 0, interested: 0, highlyInterested: 0, converted: 0, repeatedCustomers: 0, dropped: 0 });
    return;
  }

  const students = await db.select({
    callStatus: usersTable.callStatus,
    leadStage: usersTable.leadStage,
    repeatedCustomer: usersTable.repeatedCustomer,
  }).from(usersTable).where(inArray(usersTable.id, studentIds));

  res.json({
    assignedLeads: students.length,
    needToCall: students.filter(s => !s.callStatus || s.callStatus === "Need To Call").length,
    interested: students.filter(s => s.leadStage === "Interested").length,
    highlyInterested: students.filter(s => s.leadStage === "Highly Interested").length,
    converted: students.filter(s => s.leadStage === "Converted").length,
    repeatedCustomers: students.filter(s => s.repeatedCustomer).length,
    dropped: students.filter(s => s.leadStage === "Dropped").length,
  });
});

// ── Sales SSM: Save call outcome (permanent remark) ───────────────────────
router.post("/mentor/sales/call-outcome/:studentId", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const studentId = parseInt(String(req.params.studentId), 10);

  if (req.authUser!.role !== "admin") {
    const [asgn] = await db.select({ id: mentorStudentAssignmentsTable.id }).from(mentorStudentAssignmentsTable)
      .where(and(eq(mentorStudentAssignmentsTable.mentorId, mentorId), eq(mentorStudentAssignmentsTable.studentId, studentId), eq(mentorStudentAssignmentsTable.isActive, true))).limit(1);
    if (!asgn) { res.status(403).json({ error: "Not your assigned student" }); return; }
  }

  const { callOutcome, busyReason, leadStatus, interestLevel, remark, nextFollowUpAt, nextFollowUpTime, repeatedCustomer } = req.body;
  if (!remark?.trim()) { res.status(400).json({ error: "Remark is required" }); return; }
  if (!callOutcome) { res.status(400).json({ error: "callOutcome is required" }); return; }

  const [current] = await db.select({ leadStage: usersTable.leadStage })
    .from(usersTable).where(eq(usersTable.id, studentId)).limit(1);
  const prevStage = current?.leadStage ?? null;

  const now = new Date();
  const updates: Record<string, unknown> = { callStatus: callOutcome, lastCallAt: now, updatedAt: now };
  if (busyReason !== undefined) updates.busyReason = busyReason || null;
  if (leadStatus) updates.leadStage = leadStatus;
  if (interestLevel) updates.interestLevel = interestLevel;
  if (nextFollowUpAt) updates.nextFollowUpAt = nextFollowUpAt;
  if (nextFollowUpTime) updates.nextFollowUpTime = nextFollowUpTime;
  if (repeatedCustomer !== undefined) updates.repeatedCustomer = Boolean(repeatedCustomer);

  await db.update(usersTable).set(updates).where(eq(usersTable.id, studentId));

  const actor = req.authUser!;
  const noteText = `[${callOutcome}${busyReason ? ` – ${busyReason}` : ""}] ${remark.trim()}`;
  const [fu] = await db.insert(mentorFollowUpsTable).values({
    mentorId,
    studentId,
    noteType: "Call Outcome",
    note: noteText,
    callStatus: callOutcome,
    callTime: now.toISOString(),
    calledBy: String(actor.id),
    calledByName: actor.name,
    leadStatus: leadStatus ?? null,
    nextFollowUpDate: nextFollowUpAt ?? null,
  }).returning();

  if (leadStatus && leadStatus !== prevStage) {
    await db.insert(leadStatusHistoryTable).values({
      leadId: studentId,
      oldStatus: prevStage,
      newStatus: leadStatus,
      changedById: actor.id,
      changedByName: actor.name,
      changedByRole: actor.role,
      remarks: remark.trim(),
    }).catch(() => {});

    await db.insert(studentTimelineTable).values({
      studentId,
      createdById: actor.id,
      createdByName: actor.name,
      createdByRole: actor.role,
      noteType: "status_change",
      remark: `Status changed from "${prevStage ?? "New"}" to "${leadStatus}"`,
      actionTaken: "status_change",
    }).catch(() => {});
  }

  res.status(201).json({ ok: true, followUp: fu });
});

// ── Sales SSM: Follow-up history for a student ────────────────────────────
router.get("/mentor/sales/history/:studentId", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const studentId = parseInt(String(req.params.studentId), 10);

  if (req.authUser!.role !== "admin") {
    const [asgn] = await db.select({ id: mentorStudentAssignmentsTable.id }).from(mentorStudentAssignmentsTable)
      .where(and(eq(mentorStudentAssignmentsTable.mentorId, mentorId), eq(mentorStudentAssignmentsTable.studentId, studentId), eq(mentorStudentAssignmentsTable.isActive, true))).limit(1);
    if (!asgn) { res.status(403).json({ error: "Not your assigned student" }); return; }
  }

  const rows = await db.select().from(mentorFollowUpsTable)
    .where(eq(mentorFollowUpsTable.studentId, studentId))
    .orderBy(desc(mentorFollowUpsTable.createdAt))
    .limit(50);
  res.json(rows);
});

// ── Sales SSM: Leaderboard (by conversions) ───────────────────────────────
router.get("/mentor/sales/leaderboard", mentorAuth, async (req, res) => {
  const mentors = await db.select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(and(eq(usersTable.role, "mentor"), eq(usersTable.mentorType, "sales"), eq(usersTable.isActive, true)));

  if (mentors.length === 0) { res.json([]); return; }
  const mentorIds = mentors.map(m => m.id);

  const assignments = await db.select({
    mentorId: mentorStudentAssignmentsTable.mentorId,
    studentId: mentorStudentAssignmentsTable.studentId,
  }).from(mentorStudentAssignmentsTable)
    .where(and(inArray(mentorStudentAssignmentsTable.mentorId, mentorIds), eq(mentorStudentAssignmentsTable.isActive, true)));

  const mentorStudentMap: Record<number, number[]> = {};
  for (const a of assignments) {
    if (!mentorStudentMap[a.mentorId]) mentorStudentMap[a.mentorId] = [];
    mentorStudentMap[a.mentorId].push(a.studentId);
  }

  const allStudentIds = assignments.map(a => a.studentId);
  const stageRows = allStudentIds.length > 0
    ? await db.select({ id: usersTable.id, leadStage: usersTable.leadStage })
        .from(usersTable).where(inArray(usersTable.id, allStudentIds))
    : [];
  const stageMap = Object.fromEntries(stageRows.map(s => [s.id, s.leadStage]));

  const results = mentors.map(m => {
    const sIds = mentorStudentMap[m.id] ?? [];
    const assignedCount = sIds.length;
    const convertedCount = sIds.filter(id => stageMap[id] === "Converted").length;
    const conversionRate = assignedCount > 0 ? Math.round((convertedCount / assignedCount) * 100) : 0;
    return { mentorId: m.id, mentorName: m.name, assignedCount, convertedCount, conversionRate };
  });

  results.sort((a, b) => b.convertedCount - a.convertedCount || b.conversionRate - a.conversionRate);
  res.json(results.map((r, i) => ({ ...r, rank: i + 1 })));
});

// ── GET /mentor/sales/leaderboard/grade ─────────────────────────────────────
// Grade-wise mentor leaderboard. sorted by conversion % desc.
// Also returns `myGrades` — the grades this mentor has leads in.
router.get("/mentor/sales/leaderboard/grade", mentorAuth, async (req, res) => {
  const grade = req.query.grade ? Number(req.query.grade) : null;
  if (!grade || grade < 1 || grade > 10) {
    res.status(400).json({ error: "grade query param required (1–10)" });
    return;
  }

  const callerId = req.authUser!.id;

  // 1. All active sales mentors
  const mentors = await db.select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(and(
      eq(usersTable.role, "mentor"),
      eq(usersTable.mentorType, "sales"),
      eq(usersTable.isActive, true),
      eq(usersTable.isDeleted, false),
    ));

  if (mentors.length === 0) {
    res.json({ grade, myGrades: [], leaderboard: [] });
    return;
  }

  const mentorIds = mentors.map(m => m.id);

  // 2. All active assignments for leads of the selected grade
  const assignments = await db
    .select({
      mentorId: mentorStudentAssignmentsTable.mentorId,
      studentId: mentorStudentAssignmentsTable.studentId,
    })
    .from(mentorStudentAssignmentsTable)
    .innerJoin(usersTable, eq(mentorStudentAssignmentsTable.studentId, usersTable.id))
    .where(and(
      inArray(mentorStudentAssignmentsTable.mentorId, mentorIds),
      eq(mentorStudentAssignmentsTable.isActive, true),
      eq(usersTable.grade, grade),
      inArray(usersTable.accountType, ["lead", "demo_student"]),
      eq(usersTable.isDeleted, false),
    ));

  // 3. Build per-mentor map
  const mentorStudentMap: Record<number, number[]> = {};
  for (const a of assignments) {
    if (!mentorStudentMap[a.mentorId]) mentorStudentMap[a.mentorId] = [];
    mentorStudentMap[a.mentorId].push(a.studentId);
  }

  // 4. Fetch lead stages for these students
  const allStudentIds = assignments.map(a => a.studentId);
  const stageRows = allStudentIds.length > 0
    ? await db.select({ id: usersTable.id, leadStage: usersTable.leadStage })
        .from(usersTable)
        .where(inArray(usersTable.id, allStudentIds))
    : [];
  const stageMap = Object.fromEntries(stageRows.map(s => [s.id, s.leadStage]));

  // 5. Compute stats per mentor (only mentors with ≥1 assigned lead for this grade shown in table)
  const results = mentors
    .map(m => {
      const sIds = mentorStudentMap[m.id] ?? [];
      const assignedCount   = sIds.length;
      const convertedCount  = sIds.filter(id => stageMap[id] === "Converted").length;
      const conversionRate  = assignedCount > 0
        ? Math.round((convertedCount / assignedCount) * 100)
        : 0;
      return { mentorId: m.id, mentorName: m.name ?? "—", assignedCount, convertedCount, conversionRate };
    })
    .filter(r => r.assignedCount > 0); // only mentors working this grade

  // Sort: highest conversion % first; tiebreak by convertedCount
  results.sort((a, b) =>
    b.conversionRate - a.conversionRate ||
    b.convertedCount - a.convertedCount
  );

  const leaderboard = results.map((r, i) => ({ ...r, rank: i + 1 }));

  // 6. My grades — all distinct grades this mentor has leads assigned
  const myGradeRows = await db
    .select({ grade: usersTable.grade })
    .from(mentorStudentAssignmentsTable)
    .innerJoin(usersTable, eq(mentorStudentAssignmentsTable.studentId, usersTable.id))
    .where(and(
      eq(mentorStudentAssignmentsTable.mentorId, callerId),
      eq(mentorStudentAssignmentsTable.isActive, true),
      inArray(usersTable.accountType, ["lead", "demo_student"]),
      eq(usersTable.isDeleted, false),
    ))
    .groupBy(usersTable.grade);

  const myGrades = myGradeRows
    .map(r => r.grade)
    .filter((g): g is number => g !== null)
    .sort((a, b) => a - b);

  res.json({ grade, myGrades, leaderboard });
});

// Admin posts a timeline entry on any student
router.post("/admin/btl-crm/timeline", adminOnly, async (req, res) => {
  const { studentId, remark, noteType, followUpDate, actionTaken } = req.body;
  if (!studentId || !remark) { res.status(400).json({ error: "studentId and remark required" }); return; }

  const actor = req.authUser!;
  const [entry] = await db
    .insert(studentTimelineTable)
    .values({
      studentId: Number(studentId),
      createdById: actor.id,
      createdByName: actor.name,
      createdByRole: "admin",
      noteType: noteType ?? "General Note",
      remark,
      followUpDate: followUpDate ?? null,
      actionTaken: actionTaken ?? null,
    })
    .returning();

  res.status(201).json(entry);
});

export default router;
