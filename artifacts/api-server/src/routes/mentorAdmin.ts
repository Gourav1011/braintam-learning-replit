import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  mentorStudentAssignmentsTable,
  mentorFollowUpsTable,
  mentorAttendanceTable,
  homeworkSubmissionsTable,
  demoBatchEnrollmentsTable,
  mentorTasksTable,
  studentTimelineTable,
  mentorGradeAssignmentsTable,
} from "@workspace/db";
import { eq, and, desc, sql, inArray, count } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");

function computeHealth(
  mentorType: string | null,
  attPct: number | null,
  hwPct: number | null,
  convPct: number,
  fuPct: number,
  students: number,
  demoStudents: number,
): { score: number; label: string } {
  const type = mentorType ?? "academic";
  let score = 0;

  if (type === "sales") {
    const convScore = Math.min(convPct * 2, 100);
    const demoBonus = demoStudents > 0 ? 10 : 0;
    score = convScore * 0.55 + fuPct * 0.35 + demoBonus;
  } else {
    const attScore = attPct ?? 50;
    const hwScore = hwPct ?? 50;
    const studentBonus = students > 0 ? 10 : 0;
    score = attScore * 0.4 + hwScore * 0.3 + fuPct * 0.2 + studentBonus;
  }

  score = Math.min(100, Math.max(0, Math.round(score)));
  const label =
    score >= 85
      ? "Excellent"
      : score >= 70
        ? "Good"
        : score >= 50
          ? "Average"
          : "Needs Attention";
  return { score, label };
}

function workloadLabel(students: number, demoStudents: number): string {
  const total = students + demoStudents;
  if (total === 0) return "Low";
  const pct = (total / 60) * 100;
  if (pct <= 50) return "Low";
  if (pct <= 80) return "Medium";
  return "High";
}

router.get("/admin/mentors/enriched", adminOnly, async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const mentors = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      mentorType: usersTable.mentorType,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
      lastLoginAt: usersTable.lastLoginDate,
    })
    .from(usersTable)
    .where(and(eq(usersTable.role, "mentor"), eq(usersTable.isArchived, false)))
    .orderBy(desc(usersTable.createdAt));

  if (mentors.length === 0) {
    res.json([]);
    return;
  }

  const mentorIds = mentors.map((m) => m.id);

  const [
    studentCounts,
    demoStats,
    academicConversions,
    followUpStats,
    attStats,
    hwStats,
  ] = await Promise.all([
    db
      .select({
        mentorId: mentorStudentAssignmentsTable.mentorId,
        cnt: count(),
      })
      .from(mentorStudentAssignmentsTable)
      .where(
        and(
          inArray(mentorStudentAssignmentsTable.mentorId, mentorIds),
          eq(mentorStudentAssignmentsTable.isActive, true),
        ),
      )
      .groupBy(mentorStudentAssignmentsTable.mentorId),

    db
      .select({
        mentorId: demoBatchEnrollmentsTable.assignedMentorId,
        total: count(),
        converted: sql<number>`SUM(CASE WHEN ${demoBatchEnrollmentsTable.enrollmentStatus} = 'converted' THEN 1 ELSE 0 END)`,
      })
      .from(demoBatchEnrollmentsTable)
      .where(
        inArray(
          demoBatchEnrollmentsTable.assignedMentorId,
          mentorIds,
        ),
      )
      .groupBy(demoBatchEnrollmentsTable.assignedMentorId),

    db
      .select({
        mentorId: mentorStudentAssignmentsTable.mentorId,
        cnt: count(),
      })
      .from(mentorStudentAssignmentsTable)
      .innerJoin(
        usersTable,
        and(
          eq(usersTable.id, mentorStudentAssignmentsTable.studentId),
          inArray(usersTable.leadStage, ["Converted", "Paid Student"]),
        ),
      )
      .where(
        and(
          inArray(mentorStudentAssignmentsTable.mentorId, mentorIds),
          eq(mentorStudentAssignmentsTable.isActive, true),
        ),
      )
      .groupBy(mentorStudentAssignmentsTable.mentorId),

    db
      .select({
        mentorId: mentorFollowUpsTable.mentorId,
        total: count(),
        completed: sql<number>`count(*) filter (where call_status = 'completed')`,
      })
      .from(mentorFollowUpsTable)
      .where(inArray(mentorFollowUpsTable.mentorId, mentorIds))
      .groupBy(mentorFollowUpsTable.mentorId),

    db
      .select({
        mentorId: mentorAttendanceTable.mentorId,
        total: count(),
        present: sql<number>`SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)`,
      })
      .from(mentorAttendanceTable)
      .where(inArray(mentorAttendanceTable.mentorId, mentorIds))
      .groupBy(mentorAttendanceTable.mentorId),

    db
      .select({
        mentorId: mentorStudentAssignmentsTable.mentorId,
        total: count(),
        submitted: sql<number>`SUM(CASE WHEN ${homeworkSubmissionsTable.status} != 'pending' THEN 1 ELSE 0 END)`,
      })
      .from(homeworkSubmissionsTable)
      .innerJoin(
        mentorStudentAssignmentsTable,
        and(
          eq(
            mentorStudentAssignmentsTable.studentId,
            homeworkSubmissionsTable.studentId,
          ),
          eq(mentorStudentAssignmentsTable.isActive, true),
        ),
      )
      .where(inArray(mentorStudentAssignmentsTable.mentorId, mentorIds))
      .groupBy(mentorStudentAssignmentsTable.mentorId),
  ]);

  const studentMap = Object.fromEntries(
    studentCounts.map((r) => [r.mentorId, Number(r.cnt)]),
  );
  const demoMap = Object.fromEntries(
    demoStats.map((r) => [
      r.mentorId!,
      { total: Number(r.total), converted: Number(r.converted) },
    ]),
  );
  const acConvMap = Object.fromEntries(
    academicConversions.map((r) => [r.mentorId, Number(r.cnt)]),
  );
  const fuMap = Object.fromEntries(
    followUpStats.map((r) => [
      r.mentorId,
      { total: Number(r.total), completed: Number(r.completed) },
    ]),
  );
  const attMap = Object.fromEntries(
    attStats.map((r) => [
      r.mentorId,
      { total: Number(r.total), present: Number(r.present) },
    ]),
  );
  const hwMap = Object.fromEntries(
    hwStats.map((r) => [
      r.mentorId,
      { total: Number(r.total), submitted: Number(r.submitted) },
    ]),
  );

  const result = mentors.map((m) => {
    const students = studentMap[m.id] ?? 0;
    const demo = demoMap[m.id];
    const demoStudents = demo?.total ?? 0;
    const demoConverted = demo?.converted ?? 0;

    const acConv = acConvMap[m.id] ?? 0;
    const fu = fuMap[m.id];
    const att = attMap[m.id];
    const hw = hwMap[m.id];

    const fuPct =
      fu && fu.total > 0 ? Math.round((fu.completed / fu.total) * 100) : 0;
    const attPct =
      att && att.total > 0
        ? Math.round((att.present / att.total) * 100)
        : null;
    const hwPct =
      hw && hw.total > 0
        ? Math.round((hw.submitted / hw.total) * 100)
        : null;

    const type = m.mentorType ?? "academic";
    const conversions = type === "sales" ? demoConverted : acConv;
    const totalBase = type === "sales" ? demoStudents : students;
    const convPct =
      totalBase > 0 ? Math.round((conversions / totalBase) * 100) : 0;

    const { score, label } = computeHealth(
      m.mentorType,
      attPct,
      hwPct,
      convPct,
      fuPct,
      students,
      demoStudents,
    );

    const workload = workloadLabel(students, demoStudents);

    return {
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      mentorType: type,
      isActive: m.isActive,
      createdAt: m.createdAt,
      lastLoginAt: m.lastLoginAt,
      assignedStudents: students,
      assignedDemoStudents: demoStudents,
      conversions,
      conversionPct: convPct,
      attendancePct: attPct,
      homeworkPct: hwPct,
      followUpPct: fuPct,
      healthScore: score,
      healthLabel: label,
      workload,
    };
  });

  res.json(result);
});

router.get("/admin/mentors/dashboard-stats", adminOnly, async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const mentors = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      mentorType: usersTable.mentorType,
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .where(and(eq(usersTable.role, "mentor"), eq(usersTable.isArchived, false)));

  if (mentors.length === 0) {
    res.json({
      total: 0,
      academic: 0,
      sales: 0,
      active: 0,
      inactive: 0,
      topPerformer: null,
      healthDistribution: { excellent: 0, good: 0, average: 0, needsAttention: 0 },
      workloadDistribution: { low: 0, medium: 0, high: 0 },
      topSalesMentors: [],
      quickInsights: { totalDemoLeads: 0, totalConversions: 0, overallConversionPct: 0, avgAttendancePct: 0 },
      recentActivity: [],
    });
    return;
  }

  const mentorIds = mentors.map((m) => m.id);

  const [demoStats, academicConversions, followUpStats, attStats, recentFollowUps, totalDemoLeads] = await Promise.all([
    db
      .select({
        mentorId: demoBatchEnrollmentsTable.assignedMentorId,
        total: count(),
        converted: sql<number>`SUM(CASE WHEN ${demoBatchEnrollmentsTable.enrollmentStatus} = 'converted' THEN 1 ELSE 0 END)`,
      })
      .from(demoBatchEnrollmentsTable)
      .where(inArray(demoBatchEnrollmentsTable.assignedMentorId, mentorIds))
      .groupBy(demoBatchEnrollmentsTable.assignedMentorId),

    db
      .select({
        mentorId: mentorStudentAssignmentsTable.mentorId,
        cnt: count(),
      })
      .from(mentorStudentAssignmentsTable)
      .innerJoin(
        usersTable,
        and(
          eq(usersTable.id, mentorStudentAssignmentsTable.studentId),
          inArray(usersTable.leadStage, ["Converted", "Paid Student"]),
        ),
      )
      .where(
        and(
          inArray(mentorStudentAssignmentsTable.mentorId, mentorIds),
          eq(mentorStudentAssignmentsTable.isActive, true),
        ),
      )
      .groupBy(mentorStudentAssignmentsTable.mentorId),

    db
      .select({
        mentorId: mentorFollowUpsTable.mentorId,
        total: count(),
        completed: sql<number>`count(*) filter (where call_status = 'completed')`,
      })
      .from(mentorFollowUpsTable)
      .where(inArray(mentorFollowUpsTable.mentorId, mentorIds))
      .groupBy(mentorFollowUpsTable.mentorId),

    db
      .select({
        mentorId: mentorAttendanceTable.mentorId,
        total: count(),
        present: sql<number>`SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)`,
      })
      .from(mentorAttendanceTable)
      .where(inArray(mentorAttendanceTable.mentorId, mentorIds))
      .groupBy(mentorAttendanceTable.mentorId),

    db
      .select({
        mentorId: mentorFollowUpsTable.mentorId,
        mentorName: usersTable.name,
        studentName: sql<string>`(SELECT name FROM users WHERE id = ${mentorFollowUpsTable.studentId})`,
        note: mentorFollowUpsTable.note,
        noteType: mentorFollowUpsTable.noteType,
        createdAt: mentorFollowUpsTable.createdAt,
      })
      .from(mentorFollowUpsTable)
      .leftJoin(usersTable, eq(usersTable.id, mentorFollowUpsTable.mentorId))
      .where(inArray(mentorFollowUpsTable.mentorId, mentorIds))
      .orderBy(desc(mentorFollowUpsTable.createdAt))
      .limit(8),

    db
      .select({ cnt: count() })
      .from(demoBatchEnrollmentsTable),
  ]);

  const demoMap = Object.fromEntries(
    demoStats.map((r) => [r.mentorId!, { total: Number(r.total), converted: Number(r.converted) }]),
  );
  const acConvMap = Object.fromEntries(
    academicConversions.map((r) => [r.mentorId, Number(r.cnt)]),
  );
  const fuMap = Object.fromEntries(
    followUpStats.map((r) => [r.mentorId, { total: Number(r.total), completed: Number(r.completed) }]),
  );
  const attMap = Object.fromEntries(
    attStats.map((r) => [r.mentorId, { total: Number(r.total), present: Number(r.present) }]),
  );

  const studentCounts = await db
    .select({ mentorId: mentorStudentAssignmentsTable.mentorId, cnt: count() })
    .from(mentorStudentAssignmentsTable)
    .where(and(inArray(mentorStudentAssignmentsTable.mentorId, mentorIds), eq(mentorStudentAssignmentsTable.isActive, true)))
    .groupBy(mentorStudentAssignmentsTable.mentorId);
  const studentMap = Object.fromEntries(studentCounts.map((r) => [r.mentorId, Number(r.cnt)]));

  let healthDist = { excellent: 0, good: 0, average: 0, needsAttention: 0 };
  let workloadDist = { low: 0, medium: 0, high: 0 };
  let totalConversions = 0;
  let attTotal = 0; let attCount = 0;
  const salesPerf: { id: number; name: string; convPct: number }[] = [];
  const academicPerf: { id: number; name: string; healthScore: number; attPct: number | null }[] = [];

  for (const m of mentors) {
    const students = studentMap[m.id] ?? 0;
    const demo = demoMap[m.id];
    const demoStudents = demo?.total ?? 0;
    const demoConverted = demo?.converted ?? 0;
    const acConv = acConvMap[m.id] ?? 0;
    const fu = fuMap[m.id];
    const att = attMap[m.id];
    const type = m.mentorType ?? "academic";
    const fuPct = fu && fu.total > 0 ? Math.round((fu.completed / fu.total) * 100) : 0;
    const attPct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;
    const conversions = type === "sales" ? demoConverted : acConv;
    const totalBase = type === "sales" ? demoStudents : students;
    const convPct = totalBase > 0 ? Math.round((conversions / totalBase) * 100) : 0;
    totalConversions += conversions;
    if (attPct !== null) { attTotal += attPct; attCount++; }
    const { label, score: healthScore } = computeHealth(m.mentorType, attPct, null, convPct, fuPct, students, demoStudents);
    if (label === "Excellent") healthDist.excellent++;
    else if (label === "Good") healthDist.good++;
    else if (label === "Average") healthDist.average++;
    else healthDist.needsAttention++;
    const wl = workloadLabel(students, demoStudents);
    if (wl === "Low") workloadDist.low++;
    else if (wl === "Medium") workloadDist.medium++;
    else workloadDist.high++;
    if (type === "sales" && m.isActive) salesPerf.push({ id: m.id, name: m.name, convPct });
    if (type === "academic" && m.isActive) academicPerf.push({ id: m.id, name: m.name, healthScore, attPct });
  }

  salesPerf.sort((a, b) => b.convPct - a.convPct);
  academicPerf.sort((a, b) => b.healthScore - a.healthScore);
  const topPerformer = salesPerf[0] ?? null;
  const totalDemoCount = Number(totalDemoLeads[0]?.cnt ?? 0);
  const overallConvPct = totalDemoCount > 0 ? Math.round((totalConversions / totalDemoCount) * 100) : 0;
  const avgAttendancePct = attCount > 0 ? Math.round(attTotal / attCount) : 0;

  const recentActivity = recentFollowUps.map((r) => ({
    mentorName: r.mentorName ?? "Unknown",
    studentName: r.studentName ?? "Unknown",
    note: r.note ? r.note.slice(0, 60) : r.noteType ?? "follow-up",
    time: r.createdAt,
  }));

  res.json({
    total: mentors.length,
    academic: mentors.filter((m) => (m.mentorType ?? "academic") === "academic").length,
    sales: mentors.filter((m) => m.mentorType === "sales").length,
    active: mentors.filter((m) => m.isActive).length,
    inactive: mentors.filter((m) => !m.isActive).length,
    topPerformer: topPerformer ? { ...topPerformer, mentorType: "sales" } : null,
    healthDistribution: healthDist,
    workloadDistribution: workloadDist,
    topSalesMentors: salesPerf.slice(0, 5),
    topAcademicMentors: academicPerf.slice(0, 5),
    quickInsights: {
      totalDemoLeads: totalDemoCount,
      totalConversions,
      overallConversionPct: overallConvPct,
      avgAttendancePct,
    },
    recentActivity,
  });
});

router.get("/admin/mentors/alerts", adminOnly, async (_req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const mentors = await db
    .select({ id: usersTable.id, name: usersTable.name, mentorType: usersTable.mentorType, lastLoginDate: usersTable.lastLoginDate })
    .from(usersTable)
    .where(and(eq(usersTable.role, "mentor"), eq(usersTable.isArchived, false), eq(usersTable.isActive, true)));

  if (mentors.length === 0) {
    res.json({ noLoginDays: [], noStudents: [], noLeads: [], overloaded: [], lowConversion: [] });
    return;
  }

  const mentorIds = mentors.map((m) => m.id);

  const [studentCounts, demoStats] = await Promise.all([
    db.select({ mentorId: mentorStudentAssignmentsTable.mentorId, cnt: count() })
      .from(mentorStudentAssignmentsTable)
      .where(and(inArray(mentorStudentAssignmentsTable.mentorId, mentorIds), eq(mentorStudentAssignmentsTable.isActive, true)))
      .groupBy(mentorStudentAssignmentsTable.mentorId),
    db.select({ mentorId: demoBatchEnrollmentsTable.assignedMentorId, total: count(), converted: sql<number>`SUM(CASE WHEN ${demoBatchEnrollmentsTable.enrollmentStatus} = 'converted' THEN 1 ELSE 0 END)` })
      .from(demoBatchEnrollmentsTable)
      .where(inArray(demoBatchEnrollmentsTable.assignedMentorId, mentorIds))
      .groupBy(demoBatchEnrollmentsTable.assignedMentorId),
  ]);

  const studentMap = Object.fromEntries(studentCounts.map((r) => [r.mentorId, Number(r.cnt)]));
  const demoMap = Object.fromEntries(demoStats.map((r) => [r.mentorId!, { total: Number(r.total), converted: Number(r.converted) }]));

  const noLoginDays: { id: number; name: string }[] = [];
  const noStudents: { id: number; name: string }[] = [];
  const noLeads: { id: number; name: string }[] = [];
  const overloaded: { id: number; name: string }[] = [];
  const lowConversion: { id: number; name: string; convPct: number }[] = [];

  for (const m of mentors) {
    const type = m.mentorType ?? "academic";
    const students = studentMap[m.id] ?? 0;
    const demo = demoMap[m.id];
    const demoStudents = demo?.total ?? 0;
    const demoConverted = demo?.converted ?? 0;

    if (!m.lastLoginDate || m.lastLoginDate.toISOString().slice(0, 10) < sevenDaysAgo) {
      noLoginDays.push({ id: m.id, name: m.name });
    }
    if (workloadLabel(students, demoStudents) === "High") {
      overloaded.push({ id: m.id, name: m.name });
    }
    if (type === "academic" && students === 0) {
      noStudents.push({ id: m.id, name: m.name });
    }
    if (type === "sales" && demoStudents === 0) {
      noLeads.push({ id: m.id, name: m.name });
    }
    if (type === "sales" && demoStudents > 0) {
      const convPct = Math.round((demoConverted / demoStudents) * 100);
      if (convPct < 10) lowConversion.push({ id: m.id, name: m.name, convPct });
    }
  }

  res.json({ noLoginDays, noStudents, noLeads, overloaded, lowConversion });
});

router.get("/admin/mentors/:id/profile", adminOnly, async (req, res) => {
  const mentorId = parseInt(String(req.params.id), 10);
  if (isNaN(mentorId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [mentor] = await db
    .select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      phone: usersTable.phone, mentorType: usersTable.mentorType,
      isActive: usersTable.isActive, createdAt: usersTable.createdAt,
      lastLoginAt: usersTable.lastLoginDate,
    })
    .from(usersTable)
    .where(eq(usersTable.id, mentorId));
  if (!mentor) { res.status(404).json({ error: "Mentor not found" }); return; }

  const type = mentor.mentorType ?? "academic";

  const [assignments, demoEnrollments, recentFollowUps, tasks, attStats, hwStats] = await Promise.all([
    db
      .select({
        id: mentorStudentAssignmentsTable.id,
        studentId: mentorStudentAssignmentsTable.studentId,
        studentName: usersTable.name,
        studentEmail: usersTable.email,
        studentGrade: usersTable.grade,
        leadStage: usersTable.leadStage,
        callStatus: usersTable.callStatus,
        lastLoginAt: usersTable.lastLoginDate,
        isActive: mentorStudentAssignmentsTable.isActive,
        assignedAt: mentorStudentAssignmentsTable.assignedAt,
      })
      .from(mentorStudentAssignmentsTable)
      .leftJoin(usersTable, eq(usersTable.id, mentorStudentAssignmentsTable.studentId))
      .where(eq(mentorStudentAssignmentsTable.mentorId, mentorId))
      .orderBy(desc(mentorStudentAssignmentsTable.assignedAt))
      .limit(100),

    db
      .select({
        id: demoBatchEnrollmentsTable.id,
        studentId: demoBatchEnrollmentsTable.studentId,
        studentName: usersTable.name,
        batchId: demoBatchEnrollmentsTable.batchId,
        enrollmentStatus: demoBatchEnrollmentsTable.enrollmentStatus,
        lastDayAttended: demoBatchEnrollmentsTable.lastDayAttended,
        enrolledAt: demoBatchEnrollmentsTable.enrolledAt,
      })
      .from(demoBatchEnrollmentsTable)
      .leftJoin(usersTable, eq(usersTable.id, demoBatchEnrollmentsTable.studentId))
      .where(eq(demoBatchEnrollmentsTable.assignedMentorId, mentorId))
      .orderBy(desc(demoBatchEnrollmentsTable.enrolledAt))
      .limit(100),

    db
      .select({
        id: mentorFollowUpsTable.id,
        studentId: mentorFollowUpsTable.studentId,
        studentName: usersTable.name,
        note: mentorFollowUpsTable.note,
        noteType: mentorFollowUpsTable.noteType,
        callStatus: mentorFollowUpsTable.callStatus,
        leadStatus: mentorFollowUpsTable.leadStatus,
        nextFollowUpDate: mentorFollowUpsTable.nextFollowUpDate,
        createdAt: mentorFollowUpsTable.createdAt,
      })
      .from(mentorFollowUpsTable)
      .leftJoin(usersTable, eq(usersTable.id, mentorFollowUpsTable.studentId))
      .where(eq(mentorFollowUpsTable.mentorId, mentorId))
      .orderBy(desc(mentorFollowUpsTable.createdAt))
      .limit(20),

    db
      .select({
        id: mentorTasksTable.id,
        title: mentorTasksTable.title,
        status: mentorTasksTable.status,
        dueDate: mentorTasksTable.dueDate,
      })
      .from(mentorTasksTable)
      .where(eq(mentorTasksTable.mentorId, mentorId))
      .orderBy(desc(mentorTasksTable.createdAt))
      .limit(10),

    db
      .select({ total: count(), present: sql<number>`SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)` })
      .from(mentorAttendanceTable)
      .where(eq(mentorAttendanceTable.mentorId, mentorId)),

    db
      .select({ total: count(), submitted: sql<number>`SUM(CASE WHEN ${homeworkSubmissionsTable.status} != 'pending' THEN 1 ELSE 0 END)` })
      .from(homeworkSubmissionsTable)
      .innerJoin(
        mentorStudentAssignmentsTable,
        and(
          eq(mentorStudentAssignmentsTable.studentId, homeworkSubmissionsTable.studentId),
          eq(mentorStudentAssignmentsTable.mentorId, mentorId),
          eq(mentorStudentAssignmentsTable.isActive, true),
        ),
      ),
  ]);

  const activeAssignments = assignments.filter((a) => a.isActive);
  const att = attStats[0];
  const hw = hwStats[0];
  const attPct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;
  const hwPct = hw && hw.total > 0 ? Math.round((hw.submitted / hw.total) * 100) : null;

  const demoConverted = demoEnrollments.filter((e) => e.enrollmentStatus === "converted").length;
  const acConverted = activeAssignments.filter((a) =>
    a.leadStage === "Converted" || a.leadStage === "Paid Student",
  ).length;
  const conversions = type === "sales" ? demoConverted : acConverted;
  const totalBase = type === "sales" ? demoEnrollments.length : activeAssignments.length;
  const convPct = totalBase > 0 ? Math.round((conversions / totalBase) * 100) : 0;
  const fuPct = recentFollowUps.length > 0 ? 0 : 0;
  const { score, label } = computeHealth(mentor.mentorType, attPct, hwPct, convPct, fuPct, activeAssignments.length, demoEnrollments.length);

  res.json({
    mentor,
    stats: {
      assignedStudents: activeAssignments.length,
      assignedDemoStudents: demoEnrollments.length,
      conversions,
      conversionPct: convPct,
      attendancePct: attPct,
      homeworkPct: hwPct,
      healthScore: score,
      healthLabel: label,
      totalFollowUps: recentFollowUps.length,
      totalTasks: tasks.length,
      doneTasks: tasks.filter((t) => t.status === "done").length,
    },
    assignments,
    demoEnrollments,
    recentFollowUps,
    tasks,
  });
});

// ── Grade Assignments ─────────────────────────────────────────────────────────
router.get("/admin/mentors/grade-assignments", adminOnly, async (req, res) => {
  try {
    const rows = await db
      .select({ grade: mentorGradeAssignmentsTable.grade, mentorId: mentorGradeAssignmentsTable.mentorId })
      .from(mentorGradeAssignmentsTable);
    const map = new Map<number, number[]>();
    for (const r of rows) {
      if (r.mentorId == null) continue;
      if (!map.has(r.mentorId)) map.set(r.mentorId, []);
      map.get(r.mentorId)!.push(r.grade);
    }
    const result = [...map.entries()].map(([mentorId, grades]) => ({ mentorId, grades: grades.sort((a, b) => a - b) }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "grade assignments error");
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
