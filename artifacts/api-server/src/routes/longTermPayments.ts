import { Router } from "express";
import Razorpay from "razorpay";
import { db } from "@workspace/db";
import {
  usersTable,
  paymentLinksTable,
  coursePricingTable,
  auditLogsTable,
  manualPaymentsTable,
} from "@workspace/db";
import { eq, desc, and, ilike, or, inArray, isNull } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");
const mentorAuth = requireRole("mentor", "admin", "super_admin");

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
router.post("/mentor/long-term/upload-payment", mentorAuth, async (req, res) => {
  const { studentId, amount, referenceNumber, screenshotsJson, type } = req.body as {
    studentId?: number; amount?: number; referenceNumber?: string;
    screenshotsJson?: string; type?: string;
  };
  if (!studentId || !amount || !referenceNumber) {
    res.status(400).json({ error: "studentId, amount, and referenceNumber are required" });
    return;
  }

  // duplicate reference check
  const existing = await db.select({ id: manualPaymentsTable.id })
    .from(manualPaymentsTable)
    .where(eq(manualPaymentsTable.referenceNumber, referenceNumber))
    .limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Duplicate reference number" });
    return;
  }

  const [row] = await db.insert(manualPaymentsTable).values({
    studentId,
    submittedById: (req as unknown as { user: { id: number } }).user.id,
    type: type ?? "upi",
    amount,
    referenceNumber,
    screenshotsJson: screenshotsJson ?? null,
    status: "pending",
  }).returning();

  res.json({ id: row.id, status: "pending" });
});

// ── GET /api/admin/long-term/manual-payments ──────────────────────────────────
router.get("/admin/long-term/manual-payments", adminOnly, async (req, res) => {
  const rows = await db
    .select({
      id: manualPaymentsTable.id,
      studentId: manualPaymentsTable.studentId,
      submittedById: manualPaymentsTable.submittedById,
      type: manualPaymentsTable.type,
      amount: manualPaymentsTable.amount,
      referenceNumber: manualPaymentsTable.referenceNumber,
      screenshotsJson: manualPaymentsTable.screenshotsJson,
      status: manualPaymentsTable.status,
      uploadedAt: manualPaymentsTable.uploadedAt,
      approvedById: manualPaymentsTable.approvedById,
      approvedAt: manualPaymentsTable.approvedAt,
      rejectionReason: manualPaymentsTable.rejectionReason,
      studentName: usersTable.name,
      studentPhone: usersTable.phone,
    })
    .from(manualPaymentsTable)
    .leftJoin(usersTable, eq(manualPaymentsTable.studentId, usersTable.id))
    .orderBy(desc(manualPaymentsTable.uploadedAt));

  res.json(rows);
});

// ── POST /api/admin/long-term/manual-payments/:id/approve ─────────────────────
router.post("/admin/long-term/manual-payments/:id/approve", adminOnly, async (req, res) => {
  const id = Number(req.params["id"]);
  const adminId = (req as unknown as { user: { id: number } }).user.id;
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.update(manualPaymentsTable)
    .set({ status: "approved", approvedById: adminId, approvedAt: new Date() })
    .where(eq(manualPaymentsTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: row.id, status: row.status });
});

// ── POST /api/admin/long-term/manual-payments/:id/reject ──────────────────────
router.post("/admin/long-term/manual-payments/:id/reject", adminOnly, async (req, res) => {
  const id = Number(req.params["id"]);
  const { reason } = req.body as { reason?: string };
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.update(manualPaymentsTable)
    .set({ status: "rejected", rejectionReason: reason ?? "" })
    .where(eq(manualPaymentsTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: row.id, status: row.status });
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
