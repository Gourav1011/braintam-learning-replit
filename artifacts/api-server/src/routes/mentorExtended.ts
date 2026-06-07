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
  doubtSessionsTable,
  mentorEodReportsTable,
} from "@workspace/db";
import { eq, and, desc, sql, inArray, gte, lte, ne } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

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

// ── Today's Tasks ─────────────────────────────────────────────────────────
router.get("/mentor/today-tasks", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const studentIds = await getMentorStudentIds(mentorId);
  const today = new Date().toISOString().slice(0, 10);

  if (studentIds.length === 0) {
    res.json({ followUpsToday: [], contactPending: [], homeworkAlerts: [], attendanceAlerts: [], testAlerts: [] });
    return;
  }

  const students = await db.select({ id: usersTable.id, name: usersTable.name, grade: usersTable.grade, phone: usersTable.phone })
    .from(usersTable).where(inArray(usersTable.id, studentIds));
  const sMap = Object.fromEntries(students.map(s => [s.id, s]));

  // 1. Follow-ups due today or overdue
  const followUpsToday = await db.select({
    id: mentorFollowUpsTable.id,
    studentId: mentorFollowUpsTable.studentId,
    studentName: usersTable.name,
    nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate,
    note: mentorFollowUpsTable.note,
    callStatus: mentorFollowUpsTable.callStatus,
    leadStatus: mentorFollowUpsTable.leadStatus,
    createdAt: mentorFollowUpsTable.createdAt,
  })
    .from(mentorFollowUpsTable)
    .leftJoin(usersTable, eq(usersTable.id, mentorFollowUpsTable.studentId))
    .where(and(
      eq(mentorFollowUpsTable.mentorId, mentorId),
      lte(mentorFollowUpsTable.nextFollowUpDate, today),
      sql`${mentorFollowUpsTable.callStatus} IS DISTINCT FROM 'completed'`,
    ))
    .orderBy(mentorFollowUpsTable.nextFollowUpDate)
    .limit(50);

  // 2. Last contact per student
  const lastContacts = await db.select({
    studentId: mentorFollowUpsTable.studentId,
    lastContact: sql<string>`max(${mentorFollowUpsTable.createdAt})`,
  })
    .from(mentorFollowUpsTable)
    .where(eq(mentorFollowUpsTable.mentorId, mentorId))
    .groupBy(mentorFollowUpsTable.studentId);
  const contactMap = Object.fromEntries(lastContacts.map(r => [r.studentId, r.lastContact]));

  const todayMs = new Date(today + "T23:59:59").getTime();
  const contactPending = studentIds
    .map(sid => {
      const s = sMap[sid];
      if (!s) return null;
      const lc = contactMap[sid];
      const daysSince = lc ? Math.floor((todayMs - new Date(lc).getTime()) / 86400000) : 999;
      const urgency = daysSince <= 3 ? "green" : daysSince <= 7 ? "yellow" : "red";
      return { studentId: sid, name: s.name, grade: s.grade, phone: s.phone, daysSince, lastContact: lc ?? null, urgency };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.urgency !== "green")
    .sort((a, b) => b.daysSince - a.daysSince);

  // 3. Homework alerts
  const hwAlerts = await db.select({
    studentId: homeworkSubmissionsTable.studentId,
    pendingCount: sql<number>`count(*)::int`,
  })
    .from(homeworkSubmissionsTable)
    .where(and(
      inArray(homeworkSubmissionsTable.studentId, studentIds),
      eq(homeworkSubmissionsTable.status, "pending"),
    ))
    .groupBy(homeworkSubmissionsTable.studentId);
  const homeworkAlerts = hwAlerts.map(r => ({
    studentId: r.studentId,
    name: sMap[r.studentId]?.name ?? "Unknown",
    grade: sMap[r.studentId]?.grade ?? 0,
    pendingCount: Number(r.pendingCount),
  })).sort((a, b) => b.pendingCount - a.pendingCount);

  // 4. Attendance alerts
  const attStats = await db.select({
    studentId: mentorAttendanceTable.studentId,
    total: sql<number>`count(*)::int`,
    present: sql<number>`count(*) filter (where ${mentorAttendanceTable.status} = 'present')::int`,
  })
    .from(mentorAttendanceTable)
    .where(inArray(mentorAttendanceTable.studentId, studentIds))
    .groupBy(mentorAttendanceTable.studentId);
  const attendanceAlerts = attStats
    .filter(r => Number(r.total) >= 3)
    .map(r => {
      const pct = Math.round((Number(r.present) / Number(r.total)) * 100);
      return { studentId: r.studentId, name: sMap[r.studentId]?.name ?? "Unknown", grade: sMap[r.studentId]?.grade ?? 0, attendancePct: pct, total: Number(r.total) };
    })
    .filter(r => r.attendancePct < 75)
    .sort((a, b) => a.attendancePct - b.attendancePct);

  // 5. Test alerts (recent 30 days, avg score < 60%)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recentTests = await db.select({
    studentId: testSubmissionsTable.studentId,
    score: testSubmissionsTable.score,
    maxScore: testSubmissionsTable.maxScore,
    submittedAt: testSubmissionsTable.submittedAt,
  })
    .from(testSubmissionsTable)
    .where(and(inArray(testSubmissionsTable.studentId, studentIds), gte(testSubmissionsTable.submittedAt, cutoff)));

  const testByStudent: Record<number, number[]> = {};
  for (const t of recentTests) {
    if (t.maxScore && t.maxScore > 0) {
      if (!testByStudent[t.studentId]) testByStudent[t.studentId] = [];
      testByStudent[t.studentId].push(Math.round((Number(t.score ?? 0) / Number(t.maxScore)) * 100));
    }
  }
  const testAlerts = Object.entries(testByStudent)
    .map(([sid, scores]) => {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      return { studentId: Number(sid), name: sMap[Number(sid)]?.name ?? "Unknown", grade: sMap[Number(sid)]?.grade ?? 0, avgScore: avg, testCount: scores.length };
    })
    .filter(r => r.avgScore < 60)
    .sort((a, b) => a.avgScore - b.avgScore);

  res.json({ followUpsToday, contactPending, homeworkAlerts, attendanceAlerts, testAlerts });
});

// ── Observer: Live Classes (read-only) ────────────────────────────────────
router.get("/mentor/observer/live-classes", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const mode = String(req.query.mode ?? "upcoming");
  const studentIds = await getMentorStudentIds(mentorId);
  if (studentIds.length === 0) { res.json([]); return; }

  const grades = await db.select({ grade: usersTable.grade }).from(usersTable).where(inArray(usersTable.id, studentIds));
  const gradeSet = [...new Set(grades.map(g => g.grade).filter((g): g is number => g !== null))];
  if (gradeSet.length === 0) { res.json([]); return; }

  const now = new Date();
  let rangeStart: Date, rangeEnd: Date;
  if (mode === "past") {
    rangeEnd = now;
    rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 30);
  } else {
    rangeStart = now;
    rangeEnd = new Date(now); rangeEnd.setDate(rangeEnd.getDate() + 14);
  }

  const classes = await db.select({
    id: liveClassesTable.id, title: liveClassesTable.title, grade: liveClassesTable.grade,
    scheduledAt: liveClassesTable.scheduledAt, duration: liveClassesTable.duration,
    status: liveClassesTable.status, joinUrl: liveClassesTable.joinUrl,
    teacher: liveClassesTable.teacher, subjectId: liveClassesTable.subjectId,
    studentsJoined: liveClassesTable.studentsJoined,
  })
    .from(liveClassesTable)
    .where(and(
      inArray(liveClassesTable.grade, gradeSet),
      gte(liveClassesTable.scheduledAt, rangeStart),
      lte(liveClassesTable.scheduledAt, rangeEnd),
      eq(liveClassesTable.isPublished, true),
    ))
    .orderBy(mode === "past" ? desc(liveClassesTable.scheduledAt) : liveClassesTable.scheduledAt)
    .limit(100);
  res.json(classes);
});

// ── Doubt Sessions ────────────────────────────────────────────────────────
router.get("/mentor/doubt-sessions/stats", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const rows = await db.select({ status: doubtSessionsTable.status, count: sql<number>`count(*)::int` })
    .from(doubtSessionsTable).where(eq(doubtSessionsTable.mentorId, mentorId)).groupBy(doubtSessionsTable.status);
  const m: Record<string, number> = {};
  for (const r of rows) m[r.status] = Number(r.count);
  const total = Object.values(m).reduce((a, b) => a + b, 0);
  res.json({
    total, completed: m.completed ?? 0, cancelled: m.cancelled ?? 0,
    noShow: m.no_show ?? 0, scheduled: m.scheduled ?? 0,
    completionRate: total > 0 ? Math.round(((m.completed ?? 0) / total) * 100) : 0,
  });
});

router.get("/mentor/doubt-sessions", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const rows = await db.select().from(doubtSessionsTable)
    .where(eq(doubtSessionsTable.mentorId, mentorId))
    .orderBy(desc(doubtSessionsTable.scheduledDate), desc(doubtSessionsTable.scheduledTime))
    .limit(200);
  res.json(rows);
});

router.post("/mentor/doubt-sessions", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const { title, studentIds, studentNames, scheduledDate, scheduledTime, duration, platform, meetingLink, topic, remarks } = req.body;
  if (!title?.trim() || !scheduledDate || !scheduledTime) {
    res.status(400).json({ error: "title, scheduledDate and scheduledTime are required" }); return;
  }
  const [row] = await db.insert(doubtSessionsTable).values({
    mentorId, title: String(title),
    studentIds: JSON.stringify(Array.isArray(studentIds) ? studentIds : []),
    studentNames: JSON.stringify(Array.isArray(studentNames) ? studentNames : []),
    scheduledDate: String(scheduledDate), scheduledTime: String(scheduledTime),
    duration: duration ? Number(duration) : 60, platform: platform ?? "Google Meet",
    meetingLink: meetingLink ?? null, topic: topic ?? null, remarks: remarks ?? null, status: "scheduled",
  }).returning();
  res.status(201).json(row);
});

router.patch("/mentor/doubt-sessions/:id", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select({ id: doubtSessionsTable.id }).from(doubtSessionsTable)
    .where(and(eq(doubtSessionsTable.id, id), eq(doubtSessionsTable.mentorId, mentorId))).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const { title, studentIds, studentNames, scheduledDate, scheduledTime, duration, platform, meetingLink, topic, remarks, status } = req.body;
  const upd: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) upd.title = title;
  if (studentIds !== undefined) upd.studentIds = JSON.stringify(Array.isArray(studentIds) ? studentIds : []);
  if (studentNames !== undefined) upd.studentNames = JSON.stringify(Array.isArray(studentNames) ? studentNames : []);
  if (scheduledDate !== undefined) upd.scheduledDate = scheduledDate;
  if (scheduledTime !== undefined) upd.scheduledTime = scheduledTime;
  if (duration !== undefined) upd.duration = Number(duration);
  if (platform !== undefined) upd.platform = platform;
  if (meetingLink !== undefined) upd.meetingLink = meetingLink || null;
  if (topic !== undefined) upd.topic = topic || null;
  if (remarks !== undefined) upd.remarks = remarks || null;
  if (status !== undefined) upd.status = status;

  const [row] = await db.update(doubtSessionsTable).set(upd).where(eq(doubtSessionsTable.id, id)).returning();
  res.json(row);
});

router.delete("/mentor/doubt-sessions/:id", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const id = parseInt(String(req.params.id), 10);
  await db.delete(doubtSessionsTable).where(and(eq(doubtSessionsTable.id, id), eq(doubtSessionsTable.mentorId, mentorId)));
  res.json({ ok: true });
});

// ── EOD Reports ───────────────────────────────────────────────────────────
router.get("/mentor/eod-reports", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const rows = await db.select().from(mentorEodReportsTable)
    .where(eq(mentorEodReportsTable.mentorId, mentorId))
    .orderBy(desc(mentorEodReportsTable.reportDate)).limit(30);
  res.json(rows);
});

router.get("/mentor/eod-reports/today-prefill", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const today = new Date().toISOString().slice(0, 10);

  const [existing] = await db.select().from(mentorEodReportsTable)
    .where(and(eq(mentorEodReportsTable.mentorId, mentorId), eq(mentorEodReportsTable.reportDate, today))).limit(1);
  if (existing) { res.json(existing); return; }

  const todayStart = new Date(today + "T00:00:00.000+05:30");
  const todayEnd = new Date(today + "T23:59:59.999+05:30");
  const todayFUs = await db.select({ studentId: mentorFollowUpsTable.studentId, callStatus: mentorFollowUpsTable.callStatus })
    .from(mentorFollowUpsTable)
    .where(and(eq(mentorFollowUpsTable.mentorId, mentorId), gte(mentorFollowUpsTable.createdAt, todayStart), lte(mentorFollowUpsTable.createdAt, todayEnd)));

  const uniqueStudents = new Set(todayFUs.map(f => f.studentId)).size;
  const callsDone = todayFUs.filter(f => f.callStatus === "called").length;
  const fuDone = todayFUs.filter(f => f.callStatus === "completed").length;

  const pendingFUs = await db.select({ id: mentorFollowUpsTable.id }).from(mentorFollowUpsTable)
    .where(and(eq(mentorFollowUpsTable.mentorId, mentorId), lte(mentorFollowUpsTable.nextFollowUpDate, today), sql`${mentorFollowUpsTable.callStatus} IS DISTINCT FROM 'completed'`));

  const doubtDone = await db.select({ id: doubtSessionsTable.id }).from(doubtSessionsTable)
    .where(and(eq(doubtSessionsTable.mentorId, mentorId), eq(doubtSessionsTable.scheduledDate, today), eq(doubtSessionsTable.status, "completed")));

  res.json({
    id: null, mentorId, reportDate: today,
    studentsContacted: uniqueStudents, callsCompleted: callsDone,
    followUpsCompleted: fuDone, followUpsPending: pendingFUs.length,
    doubtSessionsConducted: doubtDone.length, classesObserved: 0,
    challengesFaced: null, studentsNeedingAttention: null, parentConcerns: null, remarks: null,
  });
});

router.post("/mentor/eod-reports", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;
  const today = new Date().toISOString().slice(0, 10);
  const { reportDate = today, studentsContacted = 0, callsCompleted = 0, followUpsCompleted = 0, followUpsPending = 0, doubtSessionsConducted = 0, classesObserved = 0, challengesFaced, studentsNeedingAttention, parentConcerns, remarks } = req.body;

  const [existing] = await db.select({ id: mentorEodReportsTable.id }).from(mentorEodReportsTable)
    .where(and(eq(mentorEodReportsTable.mentorId, mentorId), eq(mentorEodReportsTable.reportDate, String(reportDate)))).limit(1);

  const data = {
    studentsContacted: Number(studentsContacted), callsCompleted: Number(callsCompleted),
    followUpsCompleted: Number(followUpsCompleted), followUpsPending: Number(followUpsPending),
    doubtSessionsConducted: Number(doubtSessionsConducted), classesObserved: Number(classesObserved),
    challengesFaced: challengesFaced ?? null, studentsNeedingAttention: studentsNeedingAttention ?? null,
    parentConcerns: parentConcerns ?? null, remarks: remarks ?? null, updatedAt: new Date(),
  };

  if (existing) {
    const [row] = await db.update(mentorEodReportsTable).set(data).where(eq(mentorEodReportsTable.id, existing.id)).returning();
    res.json(row);
  } else {
    const [row] = await db.insert(mentorEodReportsTable).values({ mentorId, reportDate: String(reportDate), ...data }).returning();
    res.status(201).json(row);
  }
});

export default router;
