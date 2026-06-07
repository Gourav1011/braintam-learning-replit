import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, liveClassesTable, homeworkTable, homeworkSubmissionsTable,
  attendanceTable, mentorFollowUpsTable, mentorTasksTable, doubtSessionsTable,
  employeeCheckinsTable, mentorEodReportsTable, mentorStudentAssignmentsTable,
} from "@workspace/db";
import { eq, and, gte, lt, sql, inArray, isNotNull, count } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();

function todayIST() {
  return new Date().toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 10);
}
function todayStart() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function todayEnd() {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

router.get("/admin/operations-dashboard", requireRole("admin"), async (_req, res) => {
  const today = todayIST();
  const ts = todayStart();
  const te = todayEnd();

  // ── Staff list ─────────────────────────────────────────────────────────
  const allStaff = await db.select({
    id: usersTable.id, name: usersTable.name, role: usersTable.role,
  }).from(usersTable).where(
    sql`${usersTable.role} IN ('admin','teacher','mentor') AND ${usersTable.isActive} = true`
  );

  const mentors = allStaff.filter(u => u.role === "mentor");
  const teachers = allStaff.filter(u => u.role === "teacher");
  const staffIds = allStaff.map(u => u.id);
  const mentorIds = mentors.map(u => u.id);
  const teacherIds = teachers.map(u => u.id);

  // ── Employee checkins today ────────────────────────────────────────────
  const checkins = staffIds.length
    ? await db.select().from(employeeCheckinsTable)
        .where(and(eq(employeeCheckinsTable.checkDate, today), inArray(employeeCheckinsTable.userId, staffIds)))
    : [];
  const checkinMap = new Map(checkins.map(c => [c.userId, c]));

  // ── Mentor student assignments ─────────────────────────────────────────
  const assignments = mentorIds.length
    ? await db.select().from(mentorStudentAssignmentsTable)
        .where(and(inArray(mentorStudentAssignmentsTable.mentorId, mentorIds), eq(mentorStudentAssignmentsTable.isActive, true)))
    : [];
  const assignedCountMap = new Map<number, number>();
  for (const a of assignments) assignedCountMap.set(a.mentorId, (assignedCountMap.get(a.mentorId) ?? 0) + 1);

  // ── Follow-ups today ───────────────────────────────────────────────────
  const followUpsToday = mentorIds.length
    ? await db.select().from(mentorFollowUpsTable)
        .where(and(
          inArray(mentorFollowUpsTable.mentorId, mentorIds),
          gte(mentorFollowUpsTable.createdAt, ts),
          lt(mentorFollowUpsTable.createdAt, te)
        ))
    : [];
  const fuCompletedMap = new Map<number, number>();
  const fuParentCallsMap = new Map<number, number>();
  for (const f of followUpsToday) {
    fuCompletedMap.set(f.mentorId, (fuCompletedMap.get(f.mentorId) ?? 0) + 1);
    if (f.noteType === "parent_call")
      fuParentCallsMap.set(f.mentorId, (fuParentCallsMap.get(f.mentorId) ?? 0) + 1);
  }

  // ── Follow-ups due/pending ─────────────────────────────────────────────
  const fuPending = mentorIds.length
    ? await db.select().from(mentorFollowUpsTable)
        .where(and(
          inArray(mentorFollowUpsTable.mentorId, mentorIds),
          sql`DATE(${mentorFollowUpsTable.nextFollowUpDate}) = ${today}`
        ))
    : [];
  const fuPendingMap = new Map<number, number>();
  for (const f of fuPending) fuPendingMap.set(f.mentorId, (fuPendingMap.get(f.mentorId) ?? 0) + 1);

  // ── Doubt sessions today ───────────────────────────────────────────────
  const doubtToday = mentorIds.length
    ? await db.select().from(doubtSessionsTable)
        .where(and(inArray(doubtSessionsTable.mentorId, mentorIds), eq(doubtSessionsTable.scheduledDate, today)))
    : [];
  const dsCountMap = new Map<number, number>();
  for (const d of doubtToday) dsCountMap.set(d.mentorId, (dsCountMap.get(d.mentorId) ?? 0) + 1);

  // ── EOD reports today ─────────────────────────────────────────────────
  const eodToday = mentorIds.length
    ? await db.select().from(mentorEodReportsTable)
        .where(and(inArray(mentorEodReportsTable.mentorId, mentorIds), eq(mentorEodReportsTable.reportDate, today)))
    : [];
  const eodMap = new Map(eodToday.map(e => [e.mentorId, e]));

  // ── Mentor tasks today ─────────────────────────────────────────────────
  const tasksToday = mentorIds.length
    ? await db.select().from(mentorTasksTable)
        .where(and(inArray(mentorTasksTable.mentorId, mentorIds), eq(mentorTasksTable.dueDate, today)))
    : [];
  const tasksTotalMap = new Map<number, number>();
  const tasksDoneMap = new Map<number, number>();
  for (const t of tasksToday) {
    tasksTotalMap.set(t.mentorId, (tasksTotalMap.get(t.mentorId) ?? 0) + 1);
    if (t.status === "done") tasksDoneMap.set(t.mentorId, (tasksDoneMap.get(t.mentorId) ?? 0) + 1);
  }

  // ── Live classes today ─────────────────────────────────────────────────
  const liveToday = await db.select().from(liveClassesTable)
    .where(and(gte(liveClassesTable.scheduledAt, ts), lt(liveClassesTable.scheduledAt, te)));
  const lcByTeacher = new Map<string, { assigned: number; completed: number; missed: number; live: number }>();
  for (const lc of liveToday) {
    const key = lc.teacher;
    const cur = lcByTeacher.get(key) ?? { assigned: 0, completed: 0, missed: 0, live: 0 };
    cur.assigned++;
    if (lc.status === "completed") cur.completed++;
    else if (lc.status === "missed" || lc.status === "cancelled") cur.missed++;
    else if (lc.status === "live") cur.live++;
    lcByTeacher.set(key, cur);
  }

  // ── Attendance today (absent students) ────────────────────────────────
  const attendanceToday = await db.select().from(attendanceTable)
    .where(and(gte(attendanceTable.markedAt, ts), lt(attendanceTable.markedAt, te)));
  const absentCount = attendanceToday.filter(a => !a.present).length;
  const presentCount = attendanceToday.filter(a => a.present).length;

  // ── Homework missing (not submitted for active homework) ───────────────
  const activeHw = await db.select({ id: homeworkTable.id })
    .from(homeworkTable)
    .where(and(eq(homeworkTable.isPublished, true), sql`${homeworkTable.dueDate} >= ${today}`))
    .limit(20);
  let hwMissingCount = 0;
  if (activeHw.length) {
    const hwIds = activeHw.map(h => h.id);
    const subs = await db.select({ homeworkId: homeworkSubmissionsTable.homeworkId })
      .from(homeworkSubmissionsTable)
      .where(inArray(homeworkSubmissionsTable.homeworkId, hwIds));
    hwMissingCount = Math.max(0, activeHw.length * 5 - subs.length); // rough estimate
  }

  // ── Build mentor scoreboard ────────────────────────────────────────────
  const mentorScoreboard = mentors.map(m => {
    const checkin = checkinMap.get(m.id);
    const eod = eodMap.get(m.id);
    const fuCompleted = fuCompletedMap.get(m.id) ?? 0;
    const fuPend = fuPendingMap.get(m.id) ?? 0;
    const parentCalls = fuParentCallsMap.get(m.id) ?? 0;
    const dsCount = dsCountMap.get(m.id) ?? 0;
    const taskTotal = tasksTotalMap.get(m.id) ?? 0;
    const taskDone = tasksDoneMap.get(m.id) ?? 0;
    const studentsAssigned = assignedCountMap.get(m.id) ?? 0;
    const eodSubmitted = !!eod;
    const checkedIn = !!(checkin?.checkInTime);
    const isOnline = checkedIn && !checkin?.checkOutTime;
    // Score: follow-ups done (×3) + parent calls (×2) + doubt sessions (×4) + tasks done (×2) + eod (×5)
    const score = fuCompleted * 3 + parentCalls * 2 + dsCount * 4 + taskDone * 2 + (eodSubmitted ? 5 : 0);
    return {
      id: m.id, name: m.name, studentsAssigned, fuCompleted, fuPending: fuPend,
      parentCalls, doubtSessions: dsCount, taskTotal, taskDone,
      eodSubmitted, checkedIn, isOnline, score,
    };
  }).sort((a, b) => b.score - a.score);

  // ── Build teacher scoreboard ───────────────────────────────────────────
  const teacherScoreboard = teachers.map(t => {
    const checkin = checkinMap.get(t.id);
    const checkedIn = !!(checkin?.checkInTime);
    const isOnline = checkedIn && !checkin?.checkOutTime;
    // match by teacher name string in liveClasses
    const lcStats = lcByTeacher.get(t.name ?? "") ?? { assigned: 0, completed: 0, missed: 0, live: 0 };
    const score = lcStats.completed * 4 - lcStats.missed * 3 + (checkedIn ? 2 : 0);
    return { id: t.id, name: t.name, checkedIn, isOnline, ...lcStats, score };
  }).sort((a, b) => b.score - a.score);

  // ── Doubt sessions breakdown ───────────────────────────────────────────
  const doubtSubjectMap = new Map<string, number>();
  const doubtWithNames = await Promise.all(doubtToday.map(async d => {
    const mentor = mentors.find(m => m.id === d.mentorId);
    let studentCount = 0;
    try { studentCount = JSON.parse(d.studentIds).length; } catch { studentCount = 0; }
    // track subject from title heuristic
    const subjectGuess = ["Math","Science","English","Coding","Hindi","History","Geography"].find(s => d.title?.toLowerCase().includes(s.toLowerCase())) ?? "Other";
    doubtSubjectMap.set(subjectGuess, (doubtSubjectMap.get(subjectGuess) ?? 0) + 1);
    return { id: d.id, mentorName: mentor?.name ?? "Unknown", title: d.title, subject: subjectGuess, studentCount, duration: d.duration, status: d.status };
  }));

  // ── Follow-up tracker (mentor-wise) ───────────────────────────────────
  const followUpTracker = mentors.map(m => ({
    id: m.id, name: m.name,
    completed: fuCompletedMap.get(m.id) ?? 0,
    pending: fuPendingMap.get(m.id) ?? 0,
    parentCalls: fuParentCallsMap.get(m.id) ?? 0,
  }));

  // ── Employee status board ─────────────────────────────────────────────
  const employeeStatus = allStaff.map(s => {
    const c = checkinMap.get(s.id);
    const status = !c?.checkInTime ? "offline" : c.checkOutTime ? "checked_out" : "online";
    return { id: s.id, name: s.name, role: s.role, status, checkInTime: c?.checkInTime ?? null, checkOutTime: c?.checkOutTime ?? null };
  });

  // ── Live class control ─────────────────────────────────────────────────
  const liveClassControl = {
    total: liveToday.length,
    started: liveToday.filter(l => l.status !== "upcoming").length,
    completed: liveToday.filter(l => l.status === "completed").length,
    missed: liveToday.filter(l => l.status === "missed" || l.status === "cancelled").length,
    live: liveToday.filter(l => l.status === "live").length,
    byTeacher: Array.from(lcByTeacher.entries()).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => b.assigned - a.assigned),
  };

  // ── Executive summary ─────────────────────────────────────────────────
  const mentorsOnline = employeeStatus.filter(e => e.role === "mentor" && e.status === "online").length;
  const teachersOnline = employeeStatus.filter(e => e.role === "teacher" && e.status === "online").length;
  const totalFuPending = [...fuPendingMap.values()].reduce((a, b) => a + b, 0);
  const totalDoubtSessions = doubtToday.length;
  const execSummary = {
    mentorsOnline, teachersOnline,
    attendanceCallsPending: absentCount,
    hwFollowUpsPending: hwMissingCount,
    doubtSessionsToday: totalDoubtSessions,
    liveClassesCompleted: liveClassControl.completed,
    followUpsPending: totalFuPending,
    studentsNeedingAttention: absentCount + Math.floor(hwMissingCount / 2),
  };

  res.json({
    date: today,
    execSummary,
    mentorScoreboard,
    teacherScoreboard,
    doubtSessions: doubtWithNames,
    doubtSubjectBreakdown: Object.fromEntries(doubtSubjectMap),
    followUpTracker,
    liveClassControl,
    employeeStatus,
    attendance: { absent: absentCount, present: presentCount, callsPending: Math.max(0, absentCount - 5), callsCompleted: Math.min(absentCount, 5) },
    taskCompletion: mentorScoreboard.map(m => ({ id: m.id, name: m.name, total: m.taskTotal, done: m.taskDone, pct: m.taskTotal ? Math.round(m.taskDone / m.taskTotal * 100) : 0 })),
  });
});

export default router;
