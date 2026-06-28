import { Router } from "express";
import { db } from "@workspace/db";
import {
  paymentsTable,
  ignitePaidStudentsTable,
  masteryPaymentVerificationsTable,
  paymentLinksTable,
  manualPaymentsTable,
} from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");

// GET /admin/revenue-analytics
// Returns aggregated revenue data: KPIs, monthly trend, grade breakdown, recent Razorpay payments
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
    // Razorpay captured payments
    db
      .select({ total: sql<string>`coalesce(sum(amount),0)`, count: sql<string>`count(*)` })
      .from(paymentsTable)
      .where(eq(paymentsTable.status, "captured")),

    // Ignite paid students (amountPaise)
    db
      .select({ total: sql<string>`coalesce(sum(amount_paise),0)`, count: sql<string>`count(*)` })
      .from(ignitePaidStudentsTable),

    // Mastery approved verifications (amount in rupees)
    db
      .select({ total: sql<string>`coalesce(sum(amount),0)`, count: sql<string>`count(*)` })
      .from(masteryPaymentVerificationsTable)
      .where(eq(masteryPaymentVerificationsTable.status, "approved")),

    // Pending payment links (created or opened)
    db
      .select({ total: sql<string>`coalesce(sum(amount),0)`, count: sql<string>`count(*)` })
      .from(paymentLinksTable)
      .where(sql`status in ('created', 'opened')`),

    // Failed Razorpay payments
    db
      .select({ total: sql<string>`coalesce(sum(amount),0)`, count: sql<string>`count(*)` })
      .from(paymentsTable)
      .where(eq(paymentsTable.status, "failed")),

    // Last 40 Razorpay orders for reconciliation
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

    // Monthly ignite revenue trend (last 12 months)
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

    // Grade-wise ignite revenue
    db
      .select({
        grade: ignitePaidStudentsTable.grade,
        amountPaise: sql<string>`coalesce(sum(amount_paise),0)`,
        count: sql<string>`count(*)`,
      })
      .from(ignitePaidStudentsTable)
      .groupBy(ignitePaidStudentsTable.grade)
      .orderBy(ignitePaidStudentsTable.grade),

    // Payment type breakdown (Razorpay captured)
    db
      .select({
        type: paymentsTable.paymentType,
        amountPaise: sql<string>`coalesce(sum(amount),0)`,
        count: sql<string>`count(*)`,
      })
      .from(paymentsTable)
      .where(eq(paymentsTable.status, "captured"))
      .groupBy(paymentsTable.paymentType),

    // Pending mastery verifications
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

export default router;
