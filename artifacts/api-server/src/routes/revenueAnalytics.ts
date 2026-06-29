import { Router } from "express";
import { db } from "@workspace/db";
import {
  paymentsTable,
  ignitePaidStudentsTable,
  masteryPaymentVerificationsTable,
  paymentLinksTable,
  masteryStudentsTable,
  usersTable,
} from "@workspace/db";
import { eq, sql, desc, and, gte, lte, gt } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");

// ── GET /admin/revenue-analytics (legacy Razorpay reconciliation) ─────────────
router.get("/admin/revenue-analytics", adminOnly, async (_req, res) => {
  const [
    capturedPayments,
    ignitePaid,
    masteryApproved,
    pendingLinksAgg,
    failedPayments,
    recentPayments,
    monthlyIgnite,
    byGradeIgnite,
    byTypePayments,
    pendingMasteryAgg,
  ] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(amount),0)`, count: sql<string>`count(*)` })
      .from(paymentsTable)
      .where(eq(paymentsTable.status, "captured")),
    db
      .select({ total: sql<string>`coalesce(sum(amount_paise),0)`, count: sql<string>`count(*)` })
      .from(ignitePaidStudentsTable),
    db
      .select({ total: sql<string>`coalesce(sum(amount),0)`, count: sql<string>`count(*)` })
      .from(masteryPaymentVerificationsTable)
      .where(eq(masteryPaymentVerificationsTable.status, "approved")),
    db
      .select({ total: sql<string>`coalesce(sum(amount),0)`, count: sql<string>`count(*)` })
      .from(paymentLinksTable)
      .where(sql`status in ('created', 'opened')`),
    db
      .select({ total: sql<string>`coalesce(sum(amount),0)`, count: sql<string>`count(*)` })
      .from(paymentsTable)
      .where(eq(paymentsTable.status, "failed")),
    db
      .select({
        id: paymentsTable.id,
        razorpayOrderId: paymentsTable.razorpayOrderId,
        razorpayPaymentId: paymentsTable.razorpayPaymentId,
        amount: paymentsTable.amount,
        status: paymentsTable.status,
        paymentType: paymentsTable.paymentType,
        grade: paymentsTable.grade,
        webhookVerified: paymentsTable.webhookVerified,
        createdAt: paymentsTable.createdAt,
      })
      .from(paymentsTable)
      .orderBy(desc(paymentsTable.createdAt))
      .limit(40),
    db
      .select({
        month: sql<string>`to_char(paid_at, 'YYYY-MM')`,
        amountPaise: sql<string>`coalesce(sum(amount_paise),0)`,
        count: sql<string>`count(*)`,
      })
      .from(ignitePaidStudentsTable)
      .where(sql`paid_at >= now() - interval '12 months'`)
      .groupBy(sql`to_char(paid_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(paid_at, 'YYYY-MM')`),
    db
      .select({
        grade: ignitePaidStudentsTable.grade,
        amountPaise: sql<string>`coalesce(sum(amount_paise),0)`,
        count: sql<string>`count(*)`,
      })
      .from(ignitePaidStudentsTable)
      .groupBy(ignitePaidStudentsTable.grade)
      .orderBy(ignitePaidStudentsTable.grade),
    db
      .select({
        type: paymentsTable.paymentType,
        amountPaise: sql<string>`coalesce(sum(amount),0)`,
        count: sql<string>`count(*)`,
      })
      .from(paymentsTable)
      .where(eq(paymentsTable.status, "captured"))
      .groupBy(paymentsTable.paymentType),
    db
      .select({ total: sql<string>`coalesce(sum(amount),0)`, count: sql<string>`count(*)` })
      .from(masteryPaymentVerificationsTable)
      .where(eq(masteryPaymentVerificationsTable.status, "pending_verification")),
  ]);

  res.json({
    summary: {
      razorpayCollectedPaise: Number(capturedPayments[0]?.total ?? 0),
      razorpayCount: Number(capturedPayments[0]?.count ?? 0),
      igniteCollectedPaise: Number(ignitePaid[0]?.total ?? 0),
      igniteCount: Number(ignitePaid[0]?.count ?? 0),
      masteryCollectedRupees: Number(masteryApproved[0]?.total ?? 0),
      masteryCount: Number(masteryApproved[0]?.count ?? 0),
      pendingLinksPaise: Number(pendingLinksAgg[0]?.total ?? 0),
      pendingLinksCount: Number(pendingLinksAgg[0]?.count ?? 0),
      failedPaise: Number(failedPayments[0]?.total ?? 0),
      failedCount: Number(failedPayments[0]?.count ?? 0),
      pendingMasteryRupees: Number(pendingMasteryAgg[0]?.total ?? 0),
      pendingMasteryCount: Number(pendingMasteryAgg[0]?.count ?? 0),
    },
    monthly: monthlyIgnite.map((r) => ({
      month: r.month,
      amountRupees: Math.round(Number(r.amountPaise) / 100),
      count: Number(r.count),
    })),
    byGrade: byGradeIgnite.map((r) => ({
      grade: r.grade,
      amountRupees: Math.round(Number(r.amountPaise) / 100),
      count: Number(r.count),
    })),
    byType: byTypePayments.map((r) => ({
      type: r.type,
      amountRupees: Math.round(Number(r.amountPaise) / 100),
      count: Number(r.count),
    })),
    recentPayments: recentPayments.map((r) => ({
      id: r.id,
      razorpayOrderId: r.razorpayOrderId,
      razorpayPaymentId: r.razorpayPaymentId,
      amountRupees: Math.round(r.amount / 100),
      status: r.status,
      paymentType: r.paymentType,
      grade: r.grade,
      webhookVerified: r.webhookVerified,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

// ── GET /admin/admissions-analytics?from=&to= ─────────────────────────────────
// Full Revenue & Admissions analytics dashboard data
router.get("/admin/admissions-analytics", adminOnly, async (req, res) => {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);

  const fromRaw = req.query.from as string | undefined;
  const toRaw   = req.query.to   as string | undefined;

  const from = fromRaw ? new Date(fromRaw) : defaultFrom;
  const to   = toRaw   ? new Date(toRaw)   : new Date(now);
  to.setHours(23, 59, 59, 999);

  const [
    igniteKpis,
    masteryKpis,
    masteryConvKpis,
    leadsCount,
    demoAttendedCount,
    enrolledCount,
    // Grade performance
    gradeIgnite,
    gradeMastery,
    gradeIgniteAttended,
    // Mentor performance from ignitePaid
    mentorIgnite,
    // Mentor performance from mastery
    mentorMastery,
    // Course performance
    coursePerf,
    // Revenue breakdown by grade (mastery)
    revByGradeMastery,
    // Revenue breakdown by grade (ignite)
    revByGradeIgnite,
    // Monthly trend (ignite)
    monthlyIgniteTrend,
    // Monthly trend (mastery)
    monthlyMasteryTrend,
    // Monthly leads (users)
    monthlyLeads,
    // Recent conversions
    recentConversions,
    // Pending mastery verifications
    pendingVerifications,
    // All-time funnel (ignite total)
    igniteTotalAllTime,
  ] = await Promise.all([
    // KPI: ignite revenue + count in range
    db
      .select({
        total: sql<string>`coalesce(sum(amount_paise),0)`,
        count: sql<string>`count(*)`,
      })
      .from(ignitePaidStudentsTable)
      .where(and(
        gte(ignitePaidStudentsTable.paidAt, from),
        lte(ignitePaidStudentsTable.paidAt, to),
      )),

    // KPI: mastery revenue + admissions in range
    db
      .select({
        total: sql<string>`coalesce(sum(amount_paid),0)`,
        count: sql<string>`count(*)`,
      })
      .from(masteryStudentsTable)
      .where(and(
        gte(masteryStudentsTable.admissionDate, from),
        lte(masteryStudentsTable.admissionDate, to),
      )),

    // KPI: mastery conversions from ignite in range
    db
      .select({ count: sql<string>`count(*)` })
      .from(masteryStudentsTable)
      .where(and(
        gte(masteryStudentsTable.admissionDate, from),
        lte(masteryStudentsTable.admissionDate, to),
        eq(masteryStudentsTable.source, "Ignite Conversion"),
      )),

    // Funnel: leads (all student users in range)
    db
      .select({ count: sql<string>`count(*)` })
      .from(usersTable)
      .where(and(
        eq(usersTable.role, "student"),
        gte(usersTable.createdAt, from),
        lte(usersTable.createdAt, to),
      )),

    // Funnel: demo attended (ignitePaid with classesAttended > 0)
    db
      .select({ count: sql<string>`count(*)` })
      .from(ignitePaidStudentsTable)
      .where(and(
        gte(ignitePaidStudentsTable.paidAt, from),
        lte(ignitePaidStudentsTable.paidAt, to),
        gt(ignitePaidStudentsTable.classesAttended, 0),
      )),

    // Funnel: enrolled (mastery Active)
    db
      .select({ count: sql<string>`count(*)` })
      .from(masteryStudentsTable)
      .where(and(
        gte(masteryStudentsTable.admissionDate, from),
        lte(masteryStudentsTable.admissionDate, to),
        eq(masteryStudentsTable.masteryStatus, "Active"),
      )),

    // Grade: ignite paid in range
    db
      .select({
        grade: ignitePaidStudentsTable.grade,
        count: sql<string>`count(*)`,
        revenue: sql<string>`coalesce(sum(amount_paise),0)`,
      })
      .from(ignitePaidStudentsTable)
      .where(and(
        gte(ignitePaidStudentsTable.paidAt, from),
        lte(ignitePaidStudentsTable.paidAt, to),
      ))
      .groupBy(ignitePaidStudentsTable.grade)
      .orderBy(ignitePaidStudentsTable.grade),

    // Grade: mastery in range
    db
      .select({
        grade: masteryStudentsTable.grade,
        count: sql<string>`count(*)`,
        revenue: sql<string>`coalesce(sum(amount_paid),0)`,
      })
      .from(masteryStudentsTable)
      .where(and(
        gte(masteryStudentsTable.admissionDate, from),
        lte(masteryStudentsTable.admissionDate, to),
      ))
      .groupBy(masteryStudentsTable.grade)
      .orderBy(masteryStudentsTable.grade),

    // Grade: attended in range
    db
      .select({
        grade: ignitePaidStudentsTable.grade,
        count: sql<string>`count(*)`,
      })
      .from(ignitePaidStudentsTable)
      .where(and(
        gte(ignitePaidStudentsTable.paidAt, from),
        lte(ignitePaidStudentsTable.paidAt, to),
        gt(ignitePaidStudentsTable.classesAttended, 0),
      ))
      .groupBy(ignitePaidStudentsTable.grade),

    // Mentor: ignite performance
    db
      .select({
        mentor: ignitePaidStudentsTable.assignedMentorName,
        count: sql<string>`count(*)`,
        revenue: sql<string>`coalesce(sum(amount_paise),0)`,
      })
      .from(ignitePaidStudentsTable)
      .where(and(
        gte(ignitePaidStudentsTable.paidAt, from),
        lte(ignitePaidStudentsTable.paidAt, to),
        sql`assigned_mentor_name is not null`,
      ))
      .groupBy(ignitePaidStudentsTable.assignedMentorName)
      .orderBy(desc(sql`count(*)`))
      .limit(10),

    // Mentor: mastery conversions
    db
      .select({
        mentor: masteryStudentsTable.mentorName,
        count: sql<string>`count(*)`,
        revenue: sql<string>`coalesce(sum(amount_paid),0)`,
      })
      .from(masteryStudentsTable)
      .where(and(
        gte(masteryStudentsTable.admissionDate, from),
        lte(masteryStudentsTable.admissionDate, to),
        sql`mentor_name is not null`,
      ))
      .groupBy(masteryStudentsTable.mentorName)
      .orderBy(desc(sql`count(*)`))
      .limit(10),

    // Course performance
    db
      .select({
        course: masteryStudentsTable.coursePlan,
        grade: masteryStudentsTable.grade,
        count: sql<string>`count(*)`,
        revenue: sql<string>`coalesce(sum(amount_paid),0)`,
      })
      .from(masteryStudentsTable)
      .where(and(
        gte(masteryStudentsTable.admissionDate, from),
        lte(masteryStudentsTable.admissionDate, to),
      ))
      .groupBy(masteryStudentsTable.coursePlan, masteryStudentsTable.grade)
      .orderBy(desc(sql`count(*)`))
      .limit(15),

    // Revenue breakdown by grade (mastery)
    db
      .select({
        grade: masteryStudentsTable.grade,
        revenue: sql<string>`coalesce(sum(amount_paid),0)`,
        count: sql<string>`count(*)`,
      })
      .from(masteryStudentsTable)
      .where(and(
        gte(masteryStudentsTable.admissionDate, from),
        lte(masteryStudentsTable.admissionDate, to),
      ))
      .groupBy(masteryStudentsTable.grade)
      .orderBy(masteryStudentsTable.grade),

    // Revenue breakdown by grade (ignite)
    db
      .select({
        grade: ignitePaidStudentsTable.grade,
        revenue: sql<string>`coalesce(sum(amount_paise),0)`,
        count: sql<string>`count(*)`,
      })
      .from(ignitePaidStudentsTable)
      .where(and(
        gte(ignitePaidStudentsTable.paidAt, from),
        lte(ignitePaidStudentsTable.paidAt, to),
      ))
      .groupBy(ignitePaidStudentsTable.grade)
      .orderBy(ignitePaidStudentsTable.grade),

    // Monthly ignite trend (within selected range, grouped by month)
    db
      .select({
        month: sql<string>`to_char(paid_at, 'YYYY-MM')`,
        revenue: sql<string>`coalesce(sum(amount_paise),0)`,
        count: sql<string>`count(*)`,
      })
      .from(ignitePaidStudentsTable)
      .where(and(
        gte(ignitePaidStudentsTable.paidAt, from),
        lte(ignitePaidStudentsTable.paidAt, to),
      ))
      .groupBy(sql`to_char(paid_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(paid_at, 'YYYY-MM')`),

    // Monthly mastery trend
    db
      .select({
        month: sql<string>`to_char(admission_date, 'YYYY-MM')`,
        revenue: sql<string>`coalesce(sum(amount_paid),0)`,
        count: sql<string>`count(*)`,
      })
      .from(masteryStudentsTable)
      .where(and(
        gte(masteryStudentsTable.admissionDate, from),
        lte(masteryStudentsTable.admissionDate, to),
      ))
      .groupBy(sql`to_char(admission_date, 'YYYY-MM')`)
      .orderBy(sql`to_char(admission_date, 'YYYY-MM')`),

    // Monthly leads (users created)
    db
      .select({
        month: sql<string>`to_char(created_at, 'YYYY-MM')`,
        count: sql<string>`count(*)`,
      })
      .from(usersTable)
      .where(and(
        eq(usersTable.role, "student"),
        gte(usersTable.createdAt, from),
        lte(usersTable.createdAt, to),
      ))
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM')`),

    // Recent conversions (mastery students)
    db
      .select({
        id: masteryStudentsTable.id,
        studentName: masteryStudentsTable.studentName,
        grade: masteryStudentsTable.grade,
        mentorName: masteryStudentsTable.mentorName,
        coursePlan: masteryStudentsTable.coursePlan,
        amountPaid: masteryStudentsTable.amountPaid,
        admissionDate: masteryStudentsTable.admissionDate,
        source: masteryStudentsTable.source,
      })
      .from(masteryStudentsTable)
      .where(and(
        gte(masteryStudentsTable.admissionDate, from),
        lte(masteryStudentsTable.admissionDate, to),
      ))
      .orderBy(desc(masteryStudentsTable.admissionDate))
      .limit(20),

    // Pending mastery verifications count
    db
      .select({ count: sql<string>`count(*)` })
      .from(masteryPaymentVerificationsTable)
      .where(eq(masteryPaymentVerificationsTable.status, "pending_verification")),

    // All-time ignite total (for funnel context when range leads < demoPaid)
    db
      .select({ count: sql<string>`count(*)` })
      .from(ignitePaidStudentsTable)
      .where(and(
        gte(ignitePaidStudentsTable.paidAt, from),
        lte(ignitePaidStudentsTable.paidAt, to),
      )),
  ]);

  // ── Compute KPIs ─────────────────────────────────────────────────────────────
  const igniteRevenueRs = Math.round(Number(igniteKpis[0]?.total ?? 0) / 100);
  const masteryRevenueRs = Number(masteryKpis[0]?.total ?? 0);
  const totalRevenue = igniteRevenueRs + masteryRevenueRs;

  const demoPaidCount = Number(igniteKpis[0]?.count ?? 0);
  const totalAdmissions = Number(masteryKpis[0]?.count ?? 0);
  const masteryConversions = Number(masteryConvKpis[0]?.count ?? 0);
  const leadsTotal = Number(leadsCount[0]?.count ?? 0);
  const demoAttended = Number(demoAttendedCount[0]?.count ?? 0);
  const enrolledActive = Number(enrolledCount[0]?.count ?? 0);
  const pendingMasteryCount = Number(pendingVerifications[0]?.count ?? 0);
  const igniteTotalCount = Number(igniteTotalAllTime[0]?.count ?? 0);

  const conversionRate = demoPaidCount > 0
    ? Math.round((masteryConversions / demoPaidCount) * 1000) / 10
    : 0;
  const avgRevenuePerAdmission = totalAdmissions > 0
    ? Math.round(totalRevenue / totalAdmissions)
    : 0;

  // ── Build funnel (ensure logical order: leads >= demoPaid >= demoAttended >= converted >= enrolled) ──
  const funnelLeads = Math.max(leadsTotal, igniteTotalCount);
  const funnel = [
    { stage: "Leads",         count: funnelLeads,      pct: 100 },
    { stage: "Demo Paid",     count: demoPaidCount,    pct: funnelLeads > 0 ? Math.round((demoPaidCount / funnelLeads) * 1000) / 10 : 0 },
    { stage: "Demo Attended", count: demoAttended,     pct: demoPaidCount > 0 ? Math.round((demoAttended / demoPaidCount) * 1000) / 10 : 0 },
    { stage: "Converted",     count: masteryConversions, pct: demoAttended > 0 ? Math.round((masteryConversions / demoAttended) * 1000) / 10 : 0 },
    { stage: "Enrolled",      count: enrolledActive,   pct: masteryConversions > 0 ? Math.round((enrolledActive / masteryConversions) * 1000) / 10 : 0 },
  ];

  // ── Grade performance ─────────────────────────────────────────────────────────
  const allGrades = new Set([
    ...gradeIgnite.map(g => g.grade),
    ...gradeMastery.map(g => g.grade),
  ]);
  const gradeIgniteMap = new Map(gradeIgnite.map(g => [g.grade, g]));
  const gradeMasteryMap = new Map(gradeMastery.map(g => [g.grade, g]));
  const gradeAttendedMap = new Map(gradeIgniteAttended.map(g => [g.grade, Number(g.count)]));

  const gradePerformance = [...allGrades].sort().map(grade => {
    const ig = gradeIgniteMap.get(grade);
    const ms = gradeMasteryMap.get(grade);
    const demoPaidG = Number(ig?.count ?? 0);
    const convertedG = Number(ms?.count ?? 0);
    const attendedG = gradeAttendedMap.get(grade) ?? 0;
    const revenueG = Math.round(Number(ig?.revenue ?? 0) / 100) + Number(ms?.revenue ?? 0);
    const convPct = demoPaidG > 0 ? Math.round((convertedG / demoPaidG) * 1000) / 10 : 0;
    return {
      grade,
      leads: demoPaidG,
      demoPaid: demoPaidG,
      demoAttended: attendedG,
      converted: convertedG,
      admissions: convertedG,
      revenue: revenueG,
      conversionPct: convPct,
    };
  });

  // ── Mentor performance ────────────────────────────────────────────────────────
  const mentorIgniteMap = new Map(mentorIgnite.map(m => [m.mentor, m]));
  const mentorMasteryMap = new Map(mentorMastery.map(m => [m.mentor, m]));
  const allMentors = new Set([
    ...mentorIgnite.map(m => m.mentor).filter(Boolean),
    ...mentorMastery.map(m => m.mentor).filter(Boolean),
  ]);

  const mentorPerformance = [...allMentors].map(mentor => {
    const ig = mentorIgniteMap.get(mentor);
    const ms = mentorMasteryMap.get(mentor);
    const assignedLeads = Number(ig?.count ?? 0);
    const converted = Number(ms?.count ?? 0);
    const revenue = Math.round(Number(ig?.revenue ?? 0) / 100) + Number(ms?.revenue ?? 0);
    const conversionRate = assignedLeads > 0
      ? Math.round((converted / assignedLeads) * 1000) / 10
      : 0;
    return { mentor: mentor ?? "Unknown", assignedLeads, demoPaid: assignedLeads, converted, admissions: converted, revenue, conversionRate };
  }).sort((a, b) => b.converted - a.converted).slice(0, 10);

  // ── Course performance ────────────────────────────────────────────────────────
  const coursePerformance = coursePerf.map(c => {
    const admissions = Number(c.count);
    const revenue = Number(c.revenue);
    const totalDemoPaidForGrade = gradeIgniteMap.get(c.grade) ? Number(gradeIgniteMap.get(c.grade)!.count) : 0;
    const convPct = totalDemoPaidForGrade > 0 ? Math.round((admissions / totalDemoPaidForGrade) * 1000) / 10 : 0;
    return {
      course: c.course ?? "Unspecified",
      grade: c.grade,
      admissions,
      students: admissions,
      revenue,
      conversionPct: convPct,
    };
  });

  // ── Revenue breakdown by grade ────────────────────────────────────────────────
  const revGradeMap = new Map<number, number>();
  for (const r of revByGradeMastery) {
    revGradeMap.set(r.grade, (revGradeMap.get(r.grade) ?? 0) + Number(r.revenue));
  }
  for (const r of revByGradeIgnite) {
    revGradeMap.set(r.grade, (revGradeMap.get(r.grade) ?? 0) + Math.round(Number(r.revenue) / 100));
  }
  const totalRevGrade = [...revGradeMap.values()].reduce((s, v) => s + v, 0) || 1;
  const revenueBreakdown = [...revGradeMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([grade, revenue]) => ({
      grade,
      revenue,
      pct: Math.round((revenue / totalRevGrade) * 1000) / 10,
    }));

  // ── Trend data ────────────────────────────────────────────────────────────────
  const allMonths = new Set([
    ...monthlyIgniteTrend.map(m => m.month),
    ...monthlyMasteryTrend.map(m => m.month),
    ...monthlyLeads.map(m => m.month),
  ]);
  const igniteMonthMap = new Map(monthlyIgniteTrend.map(m => [m.month, m]));
  const masteryMonthMap = new Map(monthlyMasteryTrend.map(m => [m.month, m]));
  const leadsMonthMap = new Map(monthlyLeads.map(m => [m.month, m]));

  const trendData = [...allMonths].sort().map(month => {
    const ig = igniteMonthMap.get(month);
    const ms = masteryMonthMap.get(month);
    const ld = leadsMonthMap.get(month);
    const igniteRev = Math.round(Number(ig?.revenue ?? 0) / 100);
    const masteryRev = Number(ms?.revenue ?? 0);
    return {
      month: month.slice(5), // MM
      fullMonth: month,
      revenue: igniteRev + masteryRev,
      admissions: Number(ms?.count ?? 0),
      leads: Number(ld?.count ?? 0),
      demoPaid: Number(ig?.count ?? 0),
      converted: Number(ms?.count ?? 0),
    };
  });

  // ── Quick insights ────────────────────────────────────────────────────────────
  const insights: string[] = [];
  if (gradePerformance.length > 0) {
    const topGrade = gradePerformance.reduce((a, b) => b.conversionPct > a.conversionPct ? b : a);
    if (topGrade.conversionPct > 0) {
      insights.push(`Grade ${topGrade.grade} has the highest conversion rate at ${topGrade.conversionPct}% conversion`);
    }
    const topRevGrade = gradePerformance.reduce((a, b) => b.revenue > a.revenue ? b : a);
    if (topRevGrade.revenue > 0) {
      insights.push(`Grade ${topRevGrade.grade} generated the highest revenue — ₹${topRevGrade.revenue.toLocaleString("en-IN")} total revenue`);
    }
  }
  if (mentorPerformance.length > 0) {
    const topMentor = mentorPerformance[0];
    if (topMentor.converted > 0) {
      insights.push(`${topMentor.mentor} has the most conversions — ${topMentor.converted} conversions`);
    }
  }
  if (trendData.length >= 2) {
    const last = trendData[trendData.length - 1];
    const prev = trendData[trendData.length - 2];
    if (prev.revenue > 0 && last.revenue !== prev.revenue) {
      const change = Math.round(((last.revenue - prev.revenue) / prev.revenue) * 100);
      const dir = change >= 0 ? "increased" : "decreased";
      insights.push(`Revenue ${dir} by ${Math.abs(change)}% compared to last month`);
    }
  }
  if (pendingMasteryCount > 0) {
    insights.push(`${pendingMasteryCount} pending mastery approvals — review in Payments tab`);
  }
  if (insights.length === 0) {
    insights.push("Add student and payment data to see actionable insights here.");
  }

  res.json({
    kpis: {
      totalRevenue,
      igniteRevenue: igniteRevenueRs,
      masteryRevenue: masteryRevenueRs,
      totalAdmissions,
      demoPaidStudents: demoPaidCount,
      masteryConversions,
      conversionRate,
      avgRevenuePerAdmission,
    },
    funnel,
    trendData,
    gradePerformance,
    mentorPerformance,
    coursePerformance,
    revenueBreakdown,
    recentConversions: recentConversions.map(r => ({
      id: r.id,
      studentName: r.studentName,
      grade: r.grade,
      mentorName: r.mentorName,
      coursePlan: r.coursePlan,
      amount: r.amountPaid,
      date: r.admissionDate.toISOString(),
      source: r.source,
    })),
    insights,
    period: { from: from.toISOString(), to: to.toISOString() },
  });
});

export default router;
