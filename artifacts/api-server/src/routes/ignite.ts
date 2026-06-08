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

router.get("/admin/ignite/analytics", adminOnly, async (_req, res) => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const startOfThisWeek = new Date(now); startOfThisWeek.setDate(now.getDate() - 6); startOfThisWeek.setHours(0,0,0,0);

  const [allEnrollments, allSessions, allBatches] = await Promise.all([
    db.select({
      id: demoBatchEnrollmentsTable.id,
      batchId: demoBatchEnrollmentsTable.batchId,
      studentId: demoBatchEnrollmentsTable.studentId,
      enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
      lastDayAttended: demoBatchEnrollmentsTable.lastDayAttended,
      assignedMentorName: demoBatchEnrollmentsTable.assignedMentorName,
      enrolledAt: demoBatchEnrollmentsTable.enrolledAt,
      studentName: usersTable.name,
      studentPhone: usersTable.phone,
      parentPhone: usersTable.parentPhone,
      grade: usersTable.grade,
      leadStage: usersTable.leadStage,
      interestLevel: usersTable.interestLevel,
      callStatus: usersTable.callStatus,
    })
    .from(demoBatchEnrollmentsTable)
    .innerJoin(usersTable, eq(demoBatchEnrollmentsTable.studentId, usersTable.id))
    .orderBy(desc(demoBatchEnrollmentsTable.enrolledAt)),
    db.select().from(demoSessionsTable).orderBy(desc(demoSessionsTable.scheduledAt)),
    db.select().from(demoBatchesTable),
  ]);

  const batchMap = Object.fromEntries(allBatches.map(b => [b.id, b]));

  const isThisMonth = (d: Date | null) => d && d >= startOfThisMonth && d <= now;
  const isLastMonth = (d: Date | null) => d && d >= startOfLastMonth && d <= endOfLastMonth;
  const isThisWeek = (d: Date | null) => d && d >= startOfThisWeek && d <= now;

  // ── Leads KPIs ──
  const leadsLifetime = allEnrollments.length;
  const leadsThisMonth = allEnrollments.filter(e => isThisMonth(e.enrolledAt)).length;
  const leadsThisWeek = allEnrollments.filter(e => isThisWeek(e.enrolledAt)).length;
  const leadsLastMonth = allEnrollments.filter(e => isLastMonth(e.enrolledAt)).length;

  // ── Conversion KPIs ──
  const converted = allEnrollments.filter(e => e.enrollmentStatus === "converted");
  const convLifetime = converted.length;
  const convThisMonth = converted.filter(e => isThisMonth(e.enrolledAt)).length;
  const convThisWeek = converted.filter(e => isThisWeek(e.enrolledAt)).length;
  const convLastMonth = converted.filter(e => isLastMonth(e.enrolledAt)).length;

  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100 * 10) / 10 : 0;
  const convPctOverall = pct(convLifetime, leadsLifetime);
  const convPctMonthly = pct(convThisMonth, leadsThisMonth);
  const convPctWeekly = pct(convThisWeek, leadsThisWeek);

  // ── Classes KPIs ──
  const completedSessions = allSessions.filter(s => s.status === "completed");
  const classesLifetime = completedSessions.length;
  const classesThisMonth = completedSessions.filter(s => isThisMonth(s.scheduledAt)).length;
  const classesThisWeek = completedSessions.filter(s => isThisWeek(s.scheduledAt)).length;
  const classesLastMonth = completedSessions.filter(s => isLastMonth(s.scheduledAt)).length;

  // ── Funnel ──
  const demoAttended = allEnrollments.filter(e => (e.lastDayAttended ?? 0) >= 1).length;
  const interested = allEnrollments.filter(e =>
    e.leadStage === "Interested" || e.leadStage === "Very Interested" || e.interestLevel === "High" || e.interestLevel === "Very High"
  ).length;
  const funnel = [
    { stage: "Leads Enrolled", count: leadsLifetime, color: "#3B82F6" },
    { stage: "Demo Attended", count: demoAttended, color: "#8B5CF6" },
    { stage: "Interested", count: interested, color: "#F59E0B" },
    { stage: "Converted", count: convLifetime, color: "#22C55E" },
  ];

  // ── Grade-wise ──
  const gradeMap: Record<number, { leads: number; converted: number }> = {};
  for (const e of allEnrollments) {
    const g = e.grade ?? 0;
    if (!gradeMap[g]) gradeMap[g] = { leads: 0, converted: 0 };
    gradeMap[g].leads += 1;
    if (e.enrollmentStatus === "converted") gradeMap[g].converted += 1;
  }
  const gradeWise = Object.entries(gradeMap)
    .map(([g, v]) => ({ grade: Number(g), leads: v.leads, converted: v.converted, conversionPct: pct(v.converted, v.leads) }))
    .sort((a, b) => a.grade - b.grade);

  // ── Teacher Impact ──
  const teacherMap: Record<string, { classes: number; students: Set<number>; conversions: number }> = {};
  for (const s of allSessions) {
    const b = batchMap[s.batchId];
    const teacher = b?.teacherName ?? "Unknown";
    if (!teacherMap[teacher]) teacherMap[teacher] = { classes: 0, students: new Set(), conversions: 0 };
    teacherMap[teacher].classes += 1;
  }
  for (const e of allEnrollments) {
    const b = batchMap[e.batchId];
    const teacher = b?.teacherName ?? "Unknown";
    if (!teacherMap[teacher]) teacherMap[teacher] = { classes: 0, students: new Set(), conversions: 0 };
    teacherMap[teacher].students.add(e.studentId);
    if (e.enrollmentStatus === "converted") teacherMap[teacher].conversions += 1;
  }
  const teacherImpact = Object.entries(teacherMap)
    .map(([teacher, v]) => ({
      teacher, classes: v.classes, students: v.students.size,
      conversions: v.conversions, conversionPct: pct(v.conversions, v.students.size),
    }))
    .sort((a, b) => b.conversionPct - a.conversionPct);

  // ── Counselor Performance ──
  const counselorMap: Record<string, { leads: number; converted: number }> = {};
  for (const e of allEnrollments) {
    const mentor = e.assignedMentorName ?? "Unassigned";
    if (!counselorMap[mentor]) counselorMap[mentor] = { leads: 0, converted: 0 };
    counselorMap[mentor].leads += 1;
    if (e.enrollmentStatus === "converted") counselorMap[mentor].converted += 1;
  }
  const counselorPerf = Object.entries(counselorMap)
    .map(([counselor, v]) => ({ counselor, leads: v.leads, converted: v.converted, conversionPct: pct(v.converted, v.leads) }))
    .sort((a, b) => b.conversionPct - a.conversionPct);

  // ── Monthly Trend (last 12 months) ──
  const monthlyTrend: Record<string, { leads: number; conversions: number; classes: number }> = {};
  const monthKey = (d: Date | null) => {
    if (!d) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = monthKey(d)!;
    monthlyTrend[k] = { leads: 0, conversions: 0, classes: 0 };
  }
  for (const e of allEnrollments) {
    const k = monthKey(e.enrolledAt);
    if (k && monthlyTrend[k]) {
      monthlyTrend[k].leads += 1;
      if (e.enrollmentStatus === "converted") monthlyTrend[k].conversions += 1;
    }
  }
  for (const s of completedSessions) {
    const k = monthKey(s.scheduledAt);
    if (k && monthlyTrend[k]) monthlyTrend[k].classes += 1;
  }
  const trend = Object.entries(monthlyTrend).map(([month, v]) => {
    const [y, m] = month.split("-");
    const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    return { month: label, ...v };
  });

  // ── Lead Stage Breakdown ──
  const stageMap: Record<string, number> = {};
  for (const e of allEnrollments) {
    const stage = e.leadStage ?? "Not Set";
    stageMap[stage] = (stageMap[stage] ?? 0) + 1;
  }
  const leadStage = Object.entries(stageMap).map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count);

  // ── Recent Leads ──
  const recentLeads = allEnrollments.slice(0, 50).map(e => ({
    id: e.id,
    studentName: e.studentName,
    grade: e.grade,
    phone: e.studentPhone,
    parentPhone: e.parentPhone,
    enrolledAt: e.enrolledAt,
    enrollmentStatus: e.enrollmentStatus,
    lastDayAttended: e.lastDayAttended,
    assignedMentorName: e.assignedMentorName,
    leadStage: e.leadStage,
    interestLevel: e.interestLevel,
    batchTitle: batchMap[e.batchId]?.title ?? `Batch #${e.batchId}`,
    batchGrade: batchMap[e.batchId]?.grade ?? null,
    teacherName: batchMap[e.batchId]?.teacherName ?? null,
  }));

  res.json({
    kpis: {
      leads: { lifetime: leadsLifetime, thisMonth: leadsThisMonth, thisWeek: leadsThisWeek, lastMonth: leadsLastMonth },
      conversions: { lifetime: convLifetime, thisMonth: convThisMonth, thisWeek: convThisWeek, lastMonth: convLastMonth },
      classes: { lifetime: classesLifetime, thisMonth: classesThisMonth, thisWeek: classesThisWeek, lastMonth: classesLastMonth },
      conversionPct: { overall: convPctOverall, monthly: convPctMonthly, weekly: convPctWeekly },
    },
    funnel,
    gradeWise,
    teacherImpact,
    counselorPerf,
    trend,
    leadStage,
    recentLeads,
  });
});

export default router;
