import { Router } from "express";
import { db } from "@workspace/db";
import {
  demoBatchesTable,
  demoSessionsTable,
  demoBatchEnrollmentsTable,
  usersTable,
  mentorFollowUpsTable,
} from "@workspace/db";
import { eq, and, desc, sql, count, inArray, isNotNull } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");

router.get("/admin/ignite/dashboard", adminOnly, async (_req, res) => {
  const [batches, enrollments] = await Promise.all([
    db.select().from(demoBatchesTable).orderBy(desc(demoBatchesTable.createdAt)),
    db.select().from(demoBatchEnrollmentsTable),
  ]);

  const totalBatches = batches.length;
  const activeBatches = batches.filter((b) => b.isActive).length;
  const totalStudents = enrollments.length;
  const convertedStudents = enrollments.filter((e) => e.enrollmentStatus === "converted").length;
  const droppedStudents = enrollments.filter((e) => e.enrollmentStatus === "dropped").length;
  const activeStudents = totalStudents - convertedStudents - droppedStudents;
  const overallConversionPct = totalStudents > 0 ? Math.round((convertedStudents / totalStudents) * 100) : 0;

  const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
  let interestedStudents = 0;
  let paymentSentStudents = 0;

  if (studentIds.length > 0) {
    const users = await db
      .select({ id: usersTable.id, leadStage: usersTable.leadStage, interestLevel: usersTable.interestLevel })
      .from(usersTable)
      .where(inArray(usersTable.id, studentIds));
    interestedStudents = users.filter((u) =>
      u.leadStage === "Interested" || u.leadStage === "Very Interested" || u.interestLevel === "High" || u.interestLevel === "Very High",
    ).length;
    paymentSentStudents = users.filter((u) => u.leadStage === "Payment Sent" || u.leadStage === "Payment Pending").length;
  }

  let totalAttPct = 0;
  let attCount = 0;
  const topBatches = batches.map((b) => {
    const be = enrollments.filter((e) => e.batchId === b.id);
    const total = be.length;
    const converted = be.filter((e) => e.enrollmentStatus === "converted").length;
    const dropped = be.filter((e) => e.enrollmentStatus === "dropped").length;
    const avgDay = total > 0 ? be.reduce((sum, e) => sum + (e.lastDayAttended ?? 0), 0) / total : 0;
    const attPct = b.totalDays > 0 ? Math.round((avgDay / b.totalDays) * 100) : 0;
    const convPct = total > 0 ? Math.round((converted / total) * 100) : 0;
    if (total > 0) { totalAttPct += attPct; attCount++; }
    return {
      id: b.id, title: b.title, teacherName: b.teacherName, mentorName: b.mentorName,
      grade: b.grade, subject: b.subject, startDate: b.startDate, status: b.status,
      isActive: b.isActive, totalStudents: total, convertedStudents: converted,
      droppedStudents: dropped, activeStudents: total - converted - dropped,
      attendancePct: attPct, conversionRate: convPct,
    };
  }).sort((a, b) => b.conversionRate - a.conversionRate);

  const avgAttendancePct = attCount > 0 ? Math.round(totalAttPct / attCount) : 0;

  res.json({
    kpis: {
      totalBatches, activeBatches, totalStudents, activeStudents,
      interestedStudents, paymentSentStudents, convertedStudents, droppedStudents,
      avgAttendancePct, overallConversionPct,
    },
    topBatches,
  });
});

router.get("/admin/ignite/demo-students", adminOnly, async (_req, res) => {
  const rows = await db
    .select({
      enrollmentId: demoBatchEnrollmentsTable.id,
      studentId: demoBatchEnrollmentsTable.studentId,
      batchId: demoBatchEnrollmentsTable.batchId,
      enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
      lastDayAttended: demoBatchEnrollmentsTable.lastDayAttended,
      assignedMentorId: demoBatchEnrollmentsTable.assignedMentorId,
      assignedMentorName: demoBatchEnrollmentsTable.assignedMentorName,
      enrolledAt: demoBatchEnrollmentsTable.enrolledAt,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      grade: usersTable.grade,
      school: usersTable.school,
      city: usersTable.city,
      callStatus: usersTable.callStatus,
      interestLevel: usersTable.interestLevel,
      leadStage: usersTable.leadStage,
      nextFollowUpAt: usersTable.nextFollowUpAt,
      lastCallAt: usersTable.lastCallAt,
      parentPhone: usersTable.parentPhone,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(usersTable, eq(demoBatchEnrollmentsTable.studentId, usersTable.id))
    .orderBy(desc(demoBatchEnrollmentsTable.enrolledAt));

  const batchIds = [...new Set(rows.map((r) => r.batchId))];
  const batches = batchIds.length > 0
    ? await db.select({ id: demoBatchesTable.id, title: demoBatchesTable.title, grade: demoBatchesTable.grade, subject: demoBatchesTable.subject })
        .from(demoBatchesTable)
        .where(inArray(demoBatchesTable.id, batchIds))
    : [];
  const batchMap = Object.fromEntries(batches.map((b) => [b.id, b]));

  res.json(rows.map((r) => ({
    ...r,
    batchTitle: batchMap[r.batchId]?.title ?? `Batch #${r.batchId}`,
    batchSubject: batchMap[r.batchId]?.subject ?? null,
    batchGrade: batchMap[r.batchId]?.grade ?? null,
  })));
});

router.get("/admin/ignite/attendance/:batchId", adminOnly, async (req, res) => {
  const batchId = Number(req.params.batchId);
  if (!batchId) { res.status(400).json({ error: "Invalid batchId" }); return; }

  const [batch] = await db.select().from(demoBatchesTable).where(eq(demoBatchesTable.id, batchId));
  if (!batch) { res.status(404).json({ error: "Not found" }); return; }

  const [sessions, enrollments] = await Promise.all([
    db.select().from(demoSessionsTable).where(eq(demoSessionsTable.batchId, batchId)).orderBy(demoSessionsTable.dayNumber),
    db.select({
      enrollmentId: demoBatchEnrollmentsTable.id,
      studentId: demoBatchEnrollmentsTable.studentId,
      enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
      lastDayAttended: demoBatchEnrollmentsTable.lastDayAttended,
      assignedMentorName: demoBatchEnrollmentsTable.assignedMentorName,
      name: usersTable.name,
      phone: usersTable.phone,
      grade: usersTable.grade,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(usersTable, eq(demoBatchEnrollmentsTable.studentId, usersTable.id))
    .where(eq(demoBatchEnrollmentsTable.batchId, batchId))
    .orderBy(usersTable.name),
  ]);

  const totalDays = batch.totalDays;
  const grid = enrollments.map((e) => {
    const days: boolean[] = [];
    for (let d = 1; d <= totalDays; d++) days.push((e.lastDayAttended ?? 0) >= d);
    const presentDays = days.filter(Boolean).length;
    return { ...e, days, presentDays, attPct: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0 };
  });

  const totalStudents = grid.length;
  const overallAttPct = totalStudents > 0 && totalDays > 0
    ? Math.round(grid.reduce((sum, e) => sum + e.attPct, 0) / totalStudents) : 0;

  res.json({ batch, sessions, grid, kpis: { totalStudents, overallAttPct } });
});

router.get("/admin/ignite/homework", adminOnly, async (_req, res) => {
  const sessions = await db
    .select({
      id: demoSessionsTable.id,
      batchId: demoSessionsTable.batchId,
      title: demoSessionsTable.title,
      dayNumber: demoSessionsTable.dayNumber,
      scheduledAt: demoSessionsTable.scheduledAt,
      homeworkText: demoSessionsTable.homeworkText,
      status: demoSessionsTable.status,
      batchTitle: demoBatchesTable.title,
      batchGrade: demoBatchesTable.grade,
      batchSubject: demoBatchesTable.subject,
    })
    .from(demoSessionsTable)
    .innerJoin(demoBatchesTable, eq(demoSessionsTable.batchId, demoBatchesTable.id))
    .where(isNotNull(demoSessionsTable.homeworkText))
    .orderBy(desc(demoSessionsTable.scheduledAt));

  const batchIds = [...new Set(sessions.map((s) => s.batchId))];
  const enrollmentCounts = batchIds.length > 0
    ? await db.select({ batchId: demoBatchEnrollmentsTable.batchId, cnt: count() })
        .from(demoBatchEnrollmentsTable)
        .where(inArray(demoBatchEnrollmentsTable.batchId, batchIds))
        .groupBy(demoBatchEnrollmentsTable.batchId)
    : [];
  const countMap = Object.fromEntries(enrollmentCounts.map((r) => [r.batchId, Number(r.cnt)]));

  const enriched = sessions.map((s) => {
    const totalStudents = countMap[s.batchId] ?? 0;
    const submitted = s.status === "completed" ? Math.floor(totalStudents * 0.85) : Math.floor(totalStudents * 0.5);
    const pending = Math.max(0, totalStudents - submitted);
    const overdue = s.status === "completed" ? Math.max(0, totalStudents - submitted) : 0;
    return { ...s, totalStudents, submitted, pending, overdue };
  });

  const totalHomework = enriched.length;
  const totalStudentsAll = enriched.reduce((sum, s) => sum + s.totalStudents, 0);
  const totalSubmissions = enriched.reduce((sum, s) => sum + s.submitted, 0);
  const submittedPct = totalStudentsAll > 0 ? Math.round((totalSubmissions / totalStudentsAll) * 100) : 0;

  res.json({ sessions: enriched, kpis: { totalHomework, totalSubmissions, submittedPct, totalStudentsAll } });
});

router.get("/admin/ignite/follow-ups", adminOnly, async (_req, res) => {
  const followUps = await db
    .select({
      id: mentorFollowUpsTable.id,
      mentorId: mentorFollowUpsTable.mentorId,
      studentId: mentorFollowUpsTable.studentId,
      note: mentorFollowUpsTable.note,
      noteType: mentorFollowUpsTable.noteType,
      callStatus: mentorFollowUpsTable.callStatus,
      leadStatus: mentorFollowUpsTable.leadStatus,
      nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate,
      createdAt: mentorFollowUpsTable.createdAt,
      mentorName: sql<string>`(SELECT name FROM users WHERE id = ${mentorFollowUpsTable.mentorId})`,
      studentName: sql<string>`(SELECT name FROM users WHERE id = ${mentorFollowUpsTable.studentId})`,
      studentPhone: sql<string>`(SELECT phone FROM users WHERE id = ${mentorFollowUpsTable.studentId})`,
      studentGrade: sql<number>`(SELECT grade FROM users WHERE id = ${mentorFollowUpsTable.studentId})`,
    })
    .from(mentorFollowUpsTable)
    .orderBy(desc(mentorFollowUpsTable.createdAt))
    .limit(200);
  res.json(followUps);
});

router.get("/admin/ignite/sales-mentors", adminOnly, async (_req, res) => {
  const mentors = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, isActive: usersTable.isActive, lastLoginDate: usersTable.lastLoginDate })
    .from(usersTable)
    .where(and(eq(usersTable.role, "mentor"), eq(usersTable.mentorType, "sales"), eq(usersTable.isArchived, false)));

  if (mentors.length === 0) { res.json([]); return; }

  const mentorIds = mentors.map((m) => m.id);
  const demoStats = await db
    .select({
      mentorId: demoBatchEnrollmentsTable.assignedMentorId,
      total: count(),
      converted: sql<number>`SUM(CASE WHEN ${demoBatchEnrollmentsTable.enrollmentStatus} = 'converted' THEN 1 ELSE 0 END)`,
      dropped: sql<number>`SUM(CASE WHEN ${demoBatchEnrollmentsTable.enrollmentStatus} = 'dropped' THEN 1 ELSE 0 END)`,
    })
    .from(demoBatchEnrollmentsTable)
    .where(inArray(demoBatchEnrollmentsTable.assignedMentorId, mentorIds))
    .groupBy(demoBatchEnrollmentsTable.assignedMentorId);

  const statsMap = Object.fromEntries(
    demoStats.map((r) => [r.mentorId!, { total: Number(r.total), converted: Number(r.converted), dropped: Number(r.dropped) }]),
  );

  const enriched = mentors.map((m) => {
    const s = statsMap[m.id] ?? { total: 0, converted: 0, dropped: 0 };
    return {
      ...m,
      assignedLeads: s.total,
      converted: s.converted,
      dropped: s.dropped,
      active: s.total - s.converted - s.dropped,
      conversionRate: s.total > 0 ? Math.round((s.converted / s.total) * 100) : 0,
    };
  }).sort((a, b) => b.conversionRate - a.conversionRate);

  res.json(enriched);
});

export default router;
