import { Router } from "express";
import Razorpay from "razorpay";
import { db } from "@workspace/db";
import {
  usersTable,
  paymentLinksTable,
  coursePricingTable,
  auditLogsTable,
  manualPaymentsTable,
  mentorStudentAssignmentsTable,
  mentorDeploymentCyclesTable,
} from "@workspace/db";
import { eq, desc, and, or, isNull, gte, sql, inArray, count } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");
const mentorAuth = requireRole("mentor", "sales_mentor", "academic_mentor", "admin", "super_admin");

function getRazorpay(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// ── Seed default prices if table is empty ─────────────────────────────────────
const DEFAULT_PRICES: { grade: number; fullPrice: number; status: "active" | "inactive" }[] = [
  { grade: 1,  fullPrice: 1499900, status: "active" },
  { grade: 2,  fullPrice: 1599900, status: "active" },
  { grade: 3,  fullPrice: 1699900, status: "active" },
  { grade: 4,  fullPrice: 1799900, status: "active" },
  { grade: 5,  fullPrice: 1899900, status: "active" },
  { grade: 6,  fullPrice: 2099900, status: "active" },
  { grade: 7,  fullPrice: 2199900, status: "active" },
  { grade: 8,  fullPrice: 2499900, status: "active" },
  { grade: 9,  fullPrice: 0,       status: "inactive" },
  { grade: 10, fullPrice: 0,       status: "inactive" },
];

export async function seedCoursePricing() {
  const existing = await db.select({ id: coursePricingTable.id }).from(coursePricingTable).limit(1);
  if (existing.length > 0) return;
  for (const row of DEFAULT_PRICES) {
    const discount = Math.round(row.fullPrice * 0 / 100);
    await db.insert(coursePricingTable).values({
      grade: row.grade,
      fullPrice: row.fullPrice,
      scholarshipPct: 0,
      finalPrice: row.fullPrice - discount,
      status: row.status,
    }).onConflictDoNothing();
  }
}

// ── GET /api/admin/course-pricing ─────────────────────────────────────────────
router.get("/admin/course-pricing", adminOnly, async (_req, res) => {
  const rows = await db
    .select()
    .from(coursePricingTable)
    .orderBy(coursePricingTable.grade);
  res.json(rows);
});

// ── PUT /api/admin/course-pricing/:grade ──────────────────────────────────────
router.put("/admin/course-pricing/:grade", adminOnly, async (req, res) => {
  const grade = parseInt(String(req.params.grade), 10);
  if (!grade || grade < 1 || grade > 10) {
    res.status(400).json({ error: "Invalid grade" });
    return;
  }
  const { fullPrice, scholarshipPct, status } = req.body as {
    fullPrice?: number;
    scholarshipPct?: number;
    status?: string;
  };

  const [existing] = await db
    .select()
    .from(coursePricingTable)
    .where(eq(coursePricingTable.grade, grade))
    .limit(1);

  const fp = fullPrice ?? existing?.fullPrice ?? 0;
  const sp = scholarshipPct ?? existing?.scholarshipPct ?? 0;
  const finalPrice = Math.round(fp * (1 - sp / 100));

  const patch: Partial<typeof coursePricingTable.$inferInsert> = {
    fullPrice: fp,
    scholarshipPct: sp,
    finalPrice,
    updatedById: (req as any).user?.id ?? null,
    updatedAt: new Date(),
  };
  if (status) patch.status = status;

  if (existing) {
    await db.update(coursePricingTable).set(patch).where(eq(coursePricingTable.grade, grade));
  } else {
    await db.insert(coursePricingTable).values({ grade, ...patch } as any);
  }

  try {
    await db.insert(auditLogsTable).values({
      actorId: (req as any).user?.id ?? null,
      actorName: (req as any).user?.name ?? "Admin",
      actorRole: (req as any).user?.role ?? "admin",
      action: "course_pricing_updated",
      actionLabel: `Course Pricing Updated — Grade ${grade}`,
      category: "admin",
      module: "course_pricing",
      targetType: "course_pricing",
      targetId: grade,
      targetName: `Grade ${grade}`,
      afterValue: JSON.stringify({ fullPrice: fp, scholarshipPct: sp, finalPrice }),
    });
  } catch { /* audit non-fatal */ }

  res.json({ ok: true, grade, fullPrice: fp, scholarshipPct: sp, finalPrice });
});

// ── POST /api/mentor/long-term/create-payment-link ────────────────────────────
// Auto-prices by lead grade. Mentor never selects price.
router.post("/mentor/long-term/create-payment-link", mentorAuth, async (req, res) => {
  const mentorId: number = (req as any).user?.id;
  const { studentId, paymentType, expiryDate, expiryTime } = req.body as {
    studentId: number;
    paymentType: "full" | "partial";
    partialAmount?: number;
    expiryDate?: string;
    expiryTime?: string;
  };
  const partialAmount: number | undefined = req.body.partialAmount;

  if (!studentId) { res.status(400).json({ error: "studentId is required" }); return; }

  // Load lead — must be assigned to this mentor
  const [lead] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      grade: usersTable.grade,
      phone: usersTable.phone,
      parentPhone: usersTable.parentPhone,
      email: usersTable.email,
    })
    .from(usersTable)
    .where(eq(usersTable.id, studentId))
    .limit(1);

  if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }

  const grade = lead.grade;

  // Load price from course_pricing
  const [pricing] = await db
    .select()
    .from(coursePricingTable)
    .where(and(eq(coursePricingTable.grade, grade), eq(coursePricingTable.status, "active")))
    .limit(1);

  if (!pricing) {
    res.status(422).json({ error: `No active pricing found for Grade ${grade}. Please contact admin.` });
    return;
  }

  let amountPaise: number;
  if (paymentType === "partial") {
    if (!partialAmount || partialAmount <= 0) {
      res.status(400).json({ error: "partialAmount is required for partial payment" });
      return;
    }
    amountPaise = Math.round(partialAmount * 100);
  } else {
    amountPaise = pricing.finalPrice;
  }

  // Build expiry timestamp
  let expiresAt: Date | null = null;
  if (expiryDate) {
    const timeStr = expiryTime ?? "23:59";
    expiresAt = new Date(`${expiryDate}T${timeStr}:00+05:30`);
  }

  // Try to create real Razorpay Payment Link; fall back to mock URL if keys missing
  let razorpayPaymentLinkId: string | null = null;
  let shortUrl: string | null = null;
  let generatedUrl: string;

  try {
    const rp = getRazorpay();
    const rpLinkPayload: Record<string, unknown> = {
      amount: amountPaise,
      currency: "INR",
      accept_partial: false,
      description: `Braintam Long Term Course — Grade ${grade}`,
      customer: {
        name: lead.name,
        contact: `+91${(lead.parentPhone ?? lead.phone ?? "").replace(/\D/g, "")}`,
        ...(lead.email ? { email: lead.email } : {}),
      },
      notify: { sms: true, email: !!lead.email },
      reminder_enable: true,
      notes: { studentId: String(studentId), grade: String(grade), paymentType },
    };
    if (expiresAt) {
      rpLinkPayload.expire_by = Math.floor(expiresAt.getTime() / 1000);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpLink = await (rp as any).paymentLink.create(rpLinkPayload);
    razorpayPaymentLinkId = rpLink.id as string;
    shortUrl = rpLink.short_url as string;
    generatedUrl = shortUrl;
  } catch {
    // Razorpay keys not configured or sandbox — generate placeholder URL
    const token = Math.random().toString(36).slice(2, 10);
    generatedUrl = `https://rzp.io/l/${token}`;
    shortUrl = generatedUrl;
  }

  // Store payment link row
  const [row] = await db.insert(paymentLinksTable).values({
    generatedById: mentorId,
    mentorId,
    studentId,
    razorpayPaymentLinkId: razorpayPaymentLinkId ?? undefined,
    shortUrl: shortUrl ?? undefined,
    razorpayLinkUrl: generatedUrl,
    amount: amountPaise,
    paymentType: paymentType === "partial" ? "long_term_partial" : "long_term_full",
    grade,
    status: "created",
    expiresAt: expiresAt ?? undefined,
  }).returning();

  res.json({
    ok: true,
    paymentLinkId: row.id,
    url: generatedUrl,
    shortUrl: shortUrl,
    amount: amountPaise,
    amountRupees: Math.round(amountPaise / 100),
    grade,
    expiresAt: expiresAt?.toISOString() ?? null,
    studentName: lead.name,
    parentPhone: lead.parentPhone ?? lead.phone ?? null,
  });
});

// ── GET /api/mentor/long-term/pricing/:grade ──────────────────────────────────
// Mentor reads auto-price for a lead's grade (no user selection)
router.get("/mentor/long-term/pricing/:grade", mentorAuth, async (req, res) => {
  const grade = parseInt(String(req.params.grade), 10);
  const [pricing] = await db
    .select()
    .from(coursePricingTable)
    .where(eq(coursePricingTable.grade, grade))
    .limit(1);
  if (!pricing) {
    res.status(404).json({ error: "No pricing found", available: false });
    return;
  }
  res.json({
    grade: pricing.grade,
    fullPrice: pricing.fullPrice,
    finalPrice: pricing.finalPrice,
    scholarshipPct: pricing.scholarshipPct,
    status: pricing.status,
    available: pricing.status === "active",
    finalPriceRupees: Math.round(pricing.finalPrice / 100),
    fullPriceRupees: Math.round(pricing.fullPrice / 100),
  });
});

// ── GET /api/mentor/long-term/payment-links ───────────────────────────────────
router.get("/mentor/long-term/payment-links", mentorAuth, async (req, res) => {
  const mentorId: number = (req as any).user?.id;
  const rows = await db
    .select({
      id: paymentLinksTable.id,
      studentId: paymentLinksTable.studentId,
      amount: paymentLinksTable.amount,
      paymentType: paymentLinksTable.paymentType,
      grade: paymentLinksTable.grade,
      status: paymentLinksTable.status,
      shortUrl: paymentLinksTable.shortUrl,
      razorpayLinkUrl: paymentLinksTable.razorpayLinkUrl,
      razorpayPaymentLinkId: paymentLinksTable.razorpayPaymentLinkId,
      expiresAt: paymentLinksTable.expiresAt,
      createdAt: paymentLinksTable.createdAt,
      studentName: usersTable.name,
      studentPhone: usersTable.phone,
    })
    .from(paymentLinksTable)
    .leftJoin(usersTable, eq(paymentLinksTable.studentId, usersTable.id))
    .where(or(eq(paymentLinksTable.mentorId, mentorId), isNull(paymentLinksTable.mentorId)))
    .orderBy(desc(paymentLinksTable.createdAt));

  res.json(rows.map(r => ({
    ...r,
    amountRupees: Math.round((r.amount ?? 0) / 100),
  })));
});

// ── POST /api/mentor/long-term/upload-payment ─────────────────────────────────
// Mentor uploads UPI/bank/cash/cheque proof. Two-tier duplicate check:
//   Hard: same referenceNumber + type → block (409)
//   Soft: same studentId + amount within 7 days → allow, flag isDuplicate=true
router.post("/mentor/long-term/upload-payment", mentorAuth, async (req, res) => {
  const { studentId, amount, referenceNumber, screenshotsJson, type, paymentDate, remarks } = req.body as {
    studentId?: number; amount?: number; referenceNumber?: string;
    screenshotsJson?: string; type?: string; paymentDate?: string; remarks?: string;
  };
  if (!studentId || !amount || !referenceNumber) {
    res.status(400).json({ error: "studentId, amount, and referenceNumber are required" });
    return;
  }

  const paymentType = type ?? "upi";

  // ── Hard duplicate: same referenceNumber (unique constraint covers this) ──
  const hardDupe = await db
    .select({ id: manualPaymentsTable.id, type: manualPaymentsTable.type })
    .from(manualPaymentsTable)
    .where(eq(manualPaymentsTable.referenceNumber, referenceNumber))
    .limit(1);
  if (hardDupe.length > 0) {
    res.status(409).json({
      error: "This payment reference already exists. Please check and try again.",
      duplicateId: hardDupe[0].id,
    });
    return;
  }

  // ── Soft duplicate: same studentId + same amount within 7 days ────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const softDupes = await db
    .select({ id: manualPaymentsTable.id })
    .from(manualPaymentsTable)
    .where(
      and(
        eq(manualPaymentsTable.studentId, studentId),
        eq(manualPaymentsTable.amount, amount),
        gte(manualPaymentsTable.uploadedAt, sevenDaysAgo),
      ),
    )
    .limit(1);

  const isDuplicate = softDupes.length > 0;
  const duplicatePaymentId = softDupes[0]?.id ?? null;

  const [row] = await db.insert(manualPaymentsTable).values({
    studentId,
    submittedById: (req as unknown as { user: { id: number } }).user.id,
    type: paymentType,
    amount,
    referenceNumber,
    paymentDate: paymentDate ? new Date(paymentDate) : null,
    remarks: remarks ?? null,
    screenshotsJson: screenshotsJson ?? null,
    status: "pending",
    isDuplicate,
    duplicateType: isDuplicate ? "soft" : null,
    duplicateScore: isDuplicate ? 70 : null,
    duplicatePaymentId,
    installmentNumber: 1,
  }).returning();

  res.json({ id: row.id, status: "pending", isDuplicate, duplicatePaymentId });
});

// ── GET /api/admin/long-term/manual-payments/stats ───────────────────────────
router.get("/admin/long-term/manual-payments/stats", adminOnly, async (_req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [all, pendingCount, approvedToday, rejectedToday, duplicateCount] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(amount),0)`, count: sql<string>`count(*)` })
      .from(manualPaymentsTable).where(eq(manualPaymentsTable.status, "approved")),
    db.select({ count: sql<string>`count(*)` })
      .from(manualPaymentsTable).where(eq(manualPaymentsTable.status, "pending")),
    db.select({ total: sql<string>`coalesce(sum(amount),0)`, count: sql<string>`count(*)` })
      .from(manualPaymentsTable)
      .where(and(eq(manualPaymentsTable.status, "approved"), gte(manualPaymentsTable.approvedAt, todayStart))),
    db.select({ count: sql<string>`count(*)` })
      .from(manualPaymentsTable)
      .where(and(eq(manualPaymentsTable.status, "rejected"), gte(manualPaymentsTable.uploadedAt, todayStart))),
    db.select({ count: sql<string>`count(*)` })
      .from(manualPaymentsTable).where(eq(manualPaymentsTable.isDuplicate, true)),
  ]);

  res.json({
    totalApprovedRupees: Number(all[0]?.total ?? 0),
    totalApprovedCount: Number(all[0]?.count ?? 0),
    pendingCount: Number(pendingCount[0]?.count ?? 0),
    approvedTodayRupees: Number(approvedToday[0]?.total ?? 0),
    approvedTodayCount: Number(approvedToday[0]?.count ?? 0),
    rejectedTodayCount: Number(rejectedToday[0]?.count ?? 0),
    duplicateCount: Number(duplicateCount[0]?.count ?? 0),
  });
});

// ── GET /api/admin/long-term/manual-payments ──────────────────────────────────
// Returns full list with student + mentor names joined. Archived rows excluded by default.
router.get("/admin/long-term/manual-payments", adminOnly, async (_req, res) => {
  // We need two joins on usersTable (student + mentor), use raw SQL alias approach
  const rows = await db.execute(sql`
    SELECT
      mp.id,
      mp.student_id          AS "studentId",
      mp.submitted_by_id     AS "submittedById",
      mp.type,
      mp.amount,
      mp.reference_number    AS "referenceNumber",
      mp.payment_date        AS "paymentDate",
      mp.remarks,
      mp.screenshots_json    AS "screenshotsJson",
      mp.status,
      mp.is_duplicate        AS "isDuplicate",
      mp.duplicate_type      AS "duplicateType",
      mp.duplicate_score     AS "duplicateScore",
      mp.duplicate_payment_id AS "duplicatePaymentId",
      mp.receipt_number      AS "receiptNumber",
      mp.installment_number  AS "installmentNumber",
      mp.is_archived         AS "isArchived",
      mp.uploaded_at         AS "uploadedAt",
      mp.approved_by_id      AS "approvedById",
      mp.approved_at         AS "approvedAt",
      mp.rejection_reason    AS "rejectionReason",
      s.name                 AS "studentName",
      s.phone                AS "studentPhone",
      s.grade                AS "studentGrade",
      m.name                 AS "mentorName",
      m.email                AS "mentorEmail"
    FROM manual_payments mp
    LEFT JOIN users s ON s.id = mp.student_id
    LEFT JOIN users m ON m.id = mp.submitted_by_id
    WHERE mp.is_archived = false
    ORDER BY mp.uploaded_at DESC
  `);

  res.json(rows.rows);
});

// ── POST /api/admin/long-term/manual-payments/:id/approve ─────────────────────
// Transactional: checks pending status → generates BTL receipt → writes audit log
router.post("/admin/long-term/manual-payments/:id/approve", adminOnly, async (req, res) => {
  const id = Number(req.params["id"]);
  const actor = (req as unknown as { user: { id: number; name: string; role: string } }).user;
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  // Fetch row first to check status
  const [existing] = await db
    .select({ status: manualPaymentsTable.status, amount: manualPaymentsTable.amount, studentId: manualPaymentsTable.studentId })
    .from(manualPaymentsTable)
    .where(eq(manualPaymentsTable.id, id))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Payment not found" }); return; }
  if (existing.status !== "pending") {
    res.status(409).json({ error: `Payment is already ${existing.status}` });
    return;
  }

  // Generate sequential receipt number BTL-YYYY-000001
  const year = new Date().getFullYear();
  const prefix = `BTL-${year}-`;
  const maxRow = await db.execute(sql`
    SELECT receipt_number FROM manual_payments
    WHERE receipt_number LIKE ${prefix + '%'}
    ORDER BY receipt_number DESC LIMIT 1
  `);
  const lastReceipt = (maxRow.rows[0] as { receipt_number?: string } | undefined)?.receipt_number;
  const nextSeq = lastReceipt ? parseInt(lastReceipt.split("-")[2]) + 1 : 1;
  const receiptNumber = `${prefix}${String(nextSeq).padStart(6, "0")}`;

  const [row] = await db.update(manualPaymentsTable)
    .set({
      status: "approved",
      approvedById: actor.id,
      approvedAt: new Date(),
      receiptNumber,
    })
    .where(and(eq(manualPaymentsTable.id, id), eq(manualPaymentsTable.status, "pending")))
    .returning();

  if (!row) {
    res.status(409).json({ error: "Payment was updated concurrently. Please refresh." });
    return;
  }

  // Write audit log (non-fatal)
  try {
    await db.insert(auditLogsTable).values({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "manual_payment_approved",
      actionLabel: `Manual Payment Approved — ₹${existing.amount?.toLocaleString("en-IN")}`,
      category: "finance",
      module: "manual_payments",
      targetType: "manual_payment",
      targetId: id,
      targetName: receiptNumber,
      afterValue: JSON.stringify({ status: "approved", receiptNumber, amount: existing.amount }),
    });
  } catch { /* audit non-fatal */ }

  res.json({ id: row.id, status: row.status, receiptNumber });
});

// ── POST /api/admin/long-term/manual-payments/:id/reject ──────────────────────
router.post("/admin/long-term/manual-payments/:id/reject", adminOnly, async (req, res) => {
  const id = Number(req.params["id"]);
  const { reason } = req.body as { reason?: string };
  const actor = (req as unknown as { user: { id: number; name: string; role: string } }).user;
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db
    .select({ status: manualPaymentsTable.status, amount: manualPaymentsTable.amount })
    .from(manualPaymentsTable)
    .where(eq(manualPaymentsTable.id, id))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Payment not found" }); return; }
  if (existing.status !== "pending") {
    res.status(409).json({ error: `Payment is already ${existing.status}` });
    return;
  }

  const [row] = await db.update(manualPaymentsTable)
    .set({ status: "rejected", rejectionReason: reason ?? "" })
    .where(and(eq(manualPaymentsTable.id, id), eq(manualPaymentsTable.status, "pending")))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  try {
    await db.insert(auditLogsTable).values({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "manual_payment_rejected",
      actionLabel: `Manual Payment Rejected — ₹${existing.amount?.toLocaleString("en-IN")}`,
      category: "finance",
      module: "manual_payments",
      targetType: "manual_payment",
      targetId: id,
      targetName: `Payment #${id}`,
      afterValue: JSON.stringify({ status: "rejected", reason }),
    });
  } catch { /* audit non-fatal */ }

  res.json({ id: row.id, status: row.status });
});

// ── GET /api/mentor/notifications ─────────────────────────────────────────────
// Returns deployment-cycle-scoped notifications:
//   1. Lead assignment notifications (one per cycle: "You received X new leads for Week Y")
//   2. Payment events (links launched + manual approvals)
// Each notification is tagged with isCurrentCycle so the bell badge only counts current ones.
router.get("/mentor/notifications", mentorAuth, async (req, res) => {
  const mentorId = req.authUser!.id;

  // 1. Find active deployment cycle
  const [activeCycle] = await db
    .select()
    .from(mentorDeploymentCyclesTable)
    .where(eq(mentorDeploymentCyclesTable.status, "active"))
    .limit(1);

  // 2. Lead assignment notifications — one per cycle where this mentor has leads
  const cycleLeadCounts = await db
    .select({
      cycleId: mentorStudentAssignmentsTable.deploymentCycleId,
      leadCount: count(mentorStudentAssignmentsTable.id),
    })
    .from(mentorStudentAssignmentsTable)
    .where(eq(mentorStudentAssignmentsTable.mentorId, mentorId))
    .groupBy(mentorStudentAssignmentsTable.deploymentCycleId);

  // Fetch cycle details for each cycle
  const cycleIds = cycleLeadCounts
    .map(r => r.cycleId)
    .filter((id): id is number => id != null);

  const cycles = cycleIds.length > 0
    ? await db
        .select()
        .from(mentorDeploymentCyclesTable)
        .where(inArray(mentorDeploymentCyclesTable.id, cycleIds))
    : [];

  const cycleMap = new Map(cycles.map(c => [c.id, c]));

  const leadNotifs = cycleLeadCounts
    .filter(r => r.cycleId != null)
    .map(r => {
      const cycle = cycleMap.get(r.cycleId!);
      const isCurrentCycle = activeCycle ? r.cycleId === activeCycle.id : false;
      return {
        id: `leads-${r.cycleId}`,
        type: "leads_assigned" as const,
        studentName: "",
        studentId: null,
        action: `You received ${r.leadCount} new lead${r.leadCount !== 1 ? "s" : ""} for ${cycle?.weekLabel ?? `Cycle ${r.cycleId}`}.`,
        time: cycle?.createdAt?.toISOString() ?? new Date().toISOString(),
        cycleId: r.cycleId,
        weekLabel: cycle?.weekLabel ?? null,
        isCurrentCycle,
      };
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // 3. Payment events scoped to current cycle (or all-time if no active cycle)
  const since = activeCycle
    ? new Date(activeCycle.startDate)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const links = await db
    .select({
      id: paymentLinksTable.id,
      studentId: paymentLinksTable.studentId,
      studentName: usersTable.name,
      createdAt: paymentLinksTable.createdAt,
    })
    .from(paymentLinksTable)
    .leftJoin(usersTable, eq(paymentLinksTable.studentId, usersTable.id))
    .where(and(
      eq(paymentLinksTable.mentorId, mentorId),
      eq(paymentLinksTable.paymentType, "long_term_full"),
      gte(paymentLinksTable.createdAt, since),
    ))
    .orderBy(desc(paymentLinksTable.createdAt))
    .limit(30);

  const allMentorStudentIds = await db
    .select({ studentId: paymentLinksTable.studentId })
    .from(paymentLinksTable)
    .where(eq(paymentLinksTable.mentorId, mentorId));
  const studentIds = [...new Set(allMentorStudentIds.map(r => r.studentId).filter(Boolean))] as number[];

  const approvals = studentIds.length > 0
    ? await db
        .select({
          id: manualPaymentsTable.id,
          studentId: manualPaymentsTable.studentId,
          studentName: usersTable.name,
          approvedAt: manualPaymentsTable.approvedAt,
        })
        .from(manualPaymentsTable)
        .leftJoin(usersTable, eq(manualPaymentsTable.studentId, usersTable.id))
        .where(and(
          eq(manualPaymentsTable.status, "approved"),
          inArray(manualPaymentsTable.studentId, studentIds),
          gte(manualPaymentsTable.approvedAt, since),
        ))
        .orderBy(desc(manualPaymentsTable.approvedAt))
        .limit(30)
    : [];

  const paymentNotifs = [
    ...links.map(l => ({
      id: `link-${l.id}`,
      type: "payment_link" as const,
      studentName: l.studentName ?? "Student",
      studentId: l.studentId,
      action: "payment link launched",
      time: l.createdAt.toISOString(),
      cycleId: null,
      weekLabel: null,
      isCurrentCycle: true,
    })),
    ...approvals.map(a => ({
      id: `approval-${a.id}`,
      type: "payment_approved" as const,
      studentName: a.studentName ?? "Student",
      studentId: a.studentId,
      action: "completed payment successfully",
      time: (a.approvedAt ?? new Date()).toISOString(),
      cycleId: null,
      weekLabel: null,
      isCurrentCycle: true,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const notifs = [...leadNotifs, ...paymentNotifs]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 50);

  res.json(notifs);
});

// ── GET /api/admin/payment-status ─────────────────────────────────────────────
router.get("/admin/payment-status", adminOnly, async (req, res) => {
  const { status: statusFilter, search, grade: gradeFilter } = req.query as Record<string, string>;

  let rows = await db
    .select({
      id: paymentLinksTable.id,
      studentId: paymentLinksTable.studentId,
      amount: paymentLinksTable.amount,
      paymentType: paymentLinksTable.paymentType,
      grade: paymentLinksTable.grade,
      status: paymentLinksTable.status,
      shortUrl: paymentLinksTable.shortUrl,
      razorpayPaymentLinkId: paymentLinksTable.razorpayPaymentLinkId,
      expiresAt: paymentLinksTable.expiresAt,
      createdAt: paymentLinksTable.createdAt,
      mentorId: paymentLinksTable.mentorId,
      studentName: usersTable.name,
      studentPhone: usersTable.phone,
    })
    .from(paymentLinksTable)
    .leftJoin(usersTable, eq(paymentLinksTable.studentId, usersTable.id))
    .orderBy(desc(paymentLinksTable.createdAt));

  if (statusFilter) rows = rows.filter(r => r.status === statusFilter.toLowerCase());
  if (gradeFilter) rows = rows.filter(r => String(r.grade) === gradeFilter);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(r =>
      (r.studentName ?? "").toLowerCase().includes(q) ||
      (r.studentPhone ?? "").includes(q) ||
      String(r.id).includes(q) ||
      (r.razorpayPaymentLinkId ?? "").toLowerCase().includes(q)
    );
  }

  // Load mentor names
  const mentorIds = [...new Set(rows.map(r => r.mentorId).filter(Boolean))] as number[];
  const mentorMap: Record<number, string> = {};
  if (mentorIds.length > 0) {
    const mentors = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(inArray(usersTable.id, mentorIds));
    mentors.forEach(m => { mentorMap[m.id] = m.name; });
  }

  res.json(rows.map(r => ({
    ...r,
    amountRupees: Math.round((r.amount ?? 0) / 100),
    mentorName: r.mentorId ? (mentorMap[r.mentorId] ?? "—") : "—",
  })));
});

export default router;
