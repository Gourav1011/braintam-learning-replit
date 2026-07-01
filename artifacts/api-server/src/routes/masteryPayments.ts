import { Router } from "express";
import Razorpay from "razorpay";
import { db } from "@workspace/db";
import {
  masteryPaymentVerificationsTable,
  masteryStudentsTable,
  masteryTimelineTable,
  achievementTickersTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, and, sql, gte, or, sum } from "drizzle-orm";
import { requireRole } from "../middlewares/auth.js";
import { onMasteryPaymentComplete } from "../lib/masteryPaymentComplete.js";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");
const allStaff  = requireRole("mentor", "sales_mentor", "academic_mentor", "admin", "super_admin", "teacher");

function getRazorpay(): Razorpay | null {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── GET /api/admin/mastery/payments ───────────────────────────────────────────
router.get("/admin/mastery/payments", adminOnly, async (req, res) => {
  const { status, grade, search, mentorId, dateFrom, dateTo } = req.query as Record<string, string>;

  const rows = await db
    .select()
    .from(masteryPaymentVerificationsTable)
    .orderBy(desc(masteryPaymentVerificationsTable.uploadedAt));

  // Filter in JS (avoids complex conditional SQL)
  let filtered = rows;
  if (status && status !== "all") {
    filtered = filtered.filter(r => r.status === status);
  }
  if (grade) {
    const g = parseInt(grade, 10);
    if (!isNaN(g)) filtered = filtered.filter(r => r.studentGrade === g);
  }
  if (mentorId) {
    const mid = parseInt(mentorId, 10);
    if (!isNaN(mid)) filtered = filtered.filter(r => r.submittedById === mid);
  }
  if (dateFrom) {
    const from = new Date(dateFrom + "T00:00:00+05:30");
    if (!isNaN(from.getTime())) filtered = filtered.filter(r => new Date(r.uploadedAt) >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo + "T23:59:59+05:30");
    if (!isNaN(to.getTime())) filtered = filtered.filter(r => new Date(r.uploadedAt) <= to);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.studentName?.toLowerCase().includes(q) ||
      r.submittedByName?.toLowerCase().includes(q) ||
      r.utrNumber?.toLowerCase().includes(q) ||
      r.razorpayPaymentId?.toLowerCase().includes(q)
    );
  }

  const today = todayStart();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo   = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo  = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);

  const stats = {
    pendingVerification: rows.filter(r => r.status === "pending_verification").length,
    approvedToday:       rows.filter(r => r.status === "approved" && r.approvedAt && new Date(r.approvedAt) >= today).length,
    rejectedToday:       rows.filter(r => r.status === "rejected" && r.rejectedAt && new Date(r.rejectedAt) >= today).length,
    duplicateSuspected:  rows.filter(r => r.status === "duplicate_suspected").length,
    verificationFailed:  rows.filter(r => r.status === "verification_failed").length,
    totalThisMonth:      rows.filter(r => new Date(r.uploadedAt) >= monthAgo).length,
    archived:            rows.filter(r => r.status === "archived").length,
  };

  // Build mentor breakdown from ALL rows (not filtered)
  const mentorMap = new Map<number, { id: number; name: string; total: number; today: number; yesterday: number; week: number; month: number }>();
  for (const r of rows) {
    if (!r.submittedById) continue;
    const existing = mentorMap.get(r.submittedById) ?? {
      id: r.submittedById, name: r.submittedByName ?? "Unknown",
      total: 0, today: 0, yesterday: 0, week: 0, month: 0,
    };
    const d = new Date(r.uploadedAt);
    existing.total++;
    if (d >= today)     existing.today++;
    if (d >= yesterday && d < today) existing.yesterday++;
    if (d >= weekAgo)   existing.week++;
    if (d >= monthAgo)  existing.month++;
    mentorMap.set(r.submittedById, existing);
  }
  const mentors = Array.from(mentorMap.values()).sort((a, b) => b.total - a.total);

  res.json({ payments: filtered, stats, mentors });
});

// ── POST /api/admin/mastery/payments ──────────────────────────────────────────
router.post("/admin/mastery/payments", adminOnly, async (req, res) => {
  const {
    masteryStudentId, studentId, studentName, studentGrade,
    amount, paymentMethod, utrNumber, razorpayPaymentId, screenshotsJson,
  } = req.body as Record<string, string | number | undefined>;

  if (!amount) {
    res.status(400).json({ error: "amount is required" });
    return;
  }

  const adminUser = req.authUser!;
  const [row] = await db
    .insert(masteryPaymentVerificationsTable)
    .values({
      masteryStudentId:  masteryStudentId ? Number(masteryStudentId) : null,
      studentId:         studentId         ? Number(studentId)        : null,
      studentName:       String(studentName ?? ""),
      studentGrade:      studentGrade       ? Number(studentGrade)    : null,
      submittedById:     adminUser.id,
      submittedByName:   adminUser.name ?? "Admin",
      amount:            Number(amount),
      paymentMethod:     String(paymentMethod ?? "upi"),
      utrNumber:         utrNumber         ? String(utrNumber)        : null,
      razorpayPaymentId: razorpayPaymentId ? String(razorpayPaymentId) : null,
      screenshotsJson:   screenshotsJson   ? String(screenshotsJson)  : null,
      status:            "pending_verification",
    })
    .returning();

  res.json(row);
});

// ── POST /api/mentor/mastery/payments ─────────────────────────────────────────
// Mentor/staff uploads payment on behalf of a mastery student
router.post("/mentor/mastery/payments", allStaff, async (req, res) => {
  const {
    masteryStudentId, studentId, studentName, studentGrade,
    amount, paymentMethod, utrNumber, razorpayPaymentId, screenshotsJson,
  } = req.body as Record<string, string | number | undefined>;

  if (!amount) {
    res.status(400).json({ error: "amount is required" });
    return;
  }

  const submitter = req.authUser!;

  // Duplicate reference check
  if (utrNumber) {
    const dup = await db
      .select({ id: masteryPaymentVerificationsTable.id, studentName: masteryPaymentVerificationsTable.studentName })
      .from(masteryPaymentVerificationsTable)
      .where(eq(masteryPaymentVerificationsTable.utrNumber, String(utrNumber)))
      .limit(1);
    if (dup.length > 0) {
      res.status(400).json({ error: "A payment with this UTR number already exists" });
      return;
    }
  }
  if (razorpayPaymentId) {
    const dup = await db
      .select({ id: masteryPaymentVerificationsTable.id, studentName: masteryPaymentVerificationsTable.studentName })
      .from(masteryPaymentVerificationsTable)
      .where(eq(masteryPaymentVerificationsTable.razorpayPaymentId, String(razorpayPaymentId)))
      .limit(1);
    if (dup.length > 0) {
      res.status(400).json({ error: "A payment with this Razorpay ID already exists" });
      return;
    }
  }

  const [row] = await db
    .insert(masteryPaymentVerificationsTable)
    .values({
      masteryStudentId:  masteryStudentId ? Number(masteryStudentId) : null,
      studentId:         studentId        ? Number(studentId)        : null,
      studentName:       String(studentName ?? ""),
      studentGrade:      studentGrade      ? Number(studentGrade)    : null,
      submittedById:     submitter.id,
      submittedByName:   submitter.name ?? "Staff",
      amount:            Number(amount),
      paymentMethod:     String(paymentMethod ?? "upi"),
      utrNumber:         utrNumber         ? String(utrNumber)         : null,
      razorpayPaymentId: razorpayPaymentId ? String(razorpayPaymentId) : null,
      screenshotsJson:   screenshotsJson   ? String(screenshotsJson)   : null,
      status:            "pending_verification",
    })
    .returning();

  res.json({ id: row.id, status: row.status });
});

// ── GET /mentor/mastery/payments ──────────────────────────────────────────────
// Limited mentor view — no fraud/duplicate details exposed
router.get("/mentor/mastery/payments", allStaff, async (req, res) => {
  const user = req.authUser!;
  const isAdmin = ["admin", "super_admin"].includes(user.role ?? "");

  const rows = await db
    .select({
      id:               masteryPaymentVerificationsTable.id,
      masteryStudentId: masteryPaymentVerificationsTable.masteryStudentId,
      studentName:      masteryPaymentVerificationsTable.studentName,
      studentGrade:     masteryPaymentVerificationsTable.studentGrade,
      amount:           masteryPaymentVerificationsTable.amount,
      paymentMethod:    masteryPaymentVerificationsTable.paymentMethod,
      utrNumber:        masteryPaymentVerificationsTable.utrNumber,
      razorpayPaymentId: masteryPaymentVerificationsTable.razorpayPaymentId,
      status:           masteryPaymentVerificationsTable.status,
      uploadedAt:       masteryPaymentVerificationsTable.uploadedAt,
      submittedByName:  masteryPaymentVerificationsTable.submittedByName,
      rejectionReason:  masteryPaymentVerificationsTable.rejectionReason,
      approvedAt:       masteryPaymentVerificationsTable.approvedAt,
    })
    .from(masteryPaymentVerificationsTable)
    .where(
      isAdmin
        ? undefined
        : eq(masteryPaymentVerificationsTable.submittedById, user.id)
    )
    .orderBy(desc(masteryPaymentVerificationsTable.uploadedAt));

  // Mentors see a sanitised status — map fraud statuses to generic "pending_verification"
  const sanitised = rows.map(r => {
    const safeStatus = ["pending_verification", "approved", "rejected"].includes(r.status)
      ? r.status
      : "pending_verification";
    return { ...r, status: safeStatus };
  });

  res.json(sanitised);
});

// ── GET /api/admin/mastery/payments/:id ───────────────────────────────────────
router.get("/admin/mastery/payments/:id", adminOnly, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select()
    .from(masteryPaymentVerificationsTable)
    .where(eq(masteryPaymentVerificationsTable.id, id))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

// ── POST /api/admin/mastery/payments/:id/verify-razorpay ─────────────────────
router.post("/admin/mastery/payments/:id/verify-razorpay", adminOnly, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select()
    .from(masteryPaymentVerificationsTable)
    .where(eq(masteryPaymentVerificationsTable.id, id))
    .limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const rpId = row.razorpayPaymentId;
  if (!rpId) {
    res.status(400).json({ error: "No Razorpay Payment ID on this record" });
    return;
  }

  const rp = getRazorpay();
  if (!rp) {
    res.status(400).json({ error: "Razorpay keys not configured" });
    return;
  }

  let fraudCheckResult: Record<string, unknown>;
  let newStatus: string;
  let razorpayVerified: boolean;

  try {
    const payment = await rp.payments.fetch(rpId);
    fraudCheckResult = {
      found:       true,
      paymentId:   payment.id,
      status:      payment.status,
      amount:      payment.amount,
      currency:    payment.currency,
      method:      payment.method,
      description: payment.description,
      checkedAt:   new Date().toISOString(),
    };

    // Check amount mismatch (Razorpay amounts in paise)
    const rpAmountRupees = Math.round((payment.amount as number) / 100);
    const ourAmountRupees = row.amount;
    if (Math.abs(rpAmountRupees - ourAmountRupees) > 5) {
      fraudCheckResult["amountMismatch"] = true;
      fraudCheckResult["razorpayAmountRupees"] = rpAmountRupees;
      fraudCheckResult["recordedAmountRupees"] = ourAmountRupees;
    }

    newStatus = payment.status === "captured" ? "pending_verification" : "verification_failed";
    razorpayVerified = payment.status === "captured";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fraudCheckResult = {
      found:      false,
      error:      msg,
      checkedAt:  new Date().toISOString(),
    };
    newStatus = "verification_failed";
    razorpayVerified = false;
  }

  const [updated] = await db
    .update(masteryPaymentVerificationsTable)
    .set({
      fraudCheckResult:      JSON.stringify(fraudCheckResult),
      razorpayVerified,
      status:                newStatus,
      verificationStartedAt: new Date(),
      updatedAt:             new Date(),
    })
    .where(eq(masteryPaymentVerificationsTable.id, id))
    .returning();

  res.json({ id: updated.id, status: updated.status, fraudCheckResult });
});

// ── POST /api/admin/mastery/payments/:id/approve ─────────────────────────────
router.post("/admin/mastery/payments/:id/approve", adminOnly, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const admin = req.authUser!;
  const [row] = await db
    .update(masteryPaymentVerificationsTable)
    .set({
      status:        "approved",
      approvedAt:    new Date(),
      approvedById:  admin.id,
      approvedByName: admin.name ?? "Admin",
      updatedAt:     new Date(),
    })
    .where(eq(masteryPaymentVerificationsTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  // ── Trigger payment complete chain if student exists ──────────────────────
  // Per spec: admin approval → student activated, course assigned, mentor notified,
  // achievement ticker created, leaderboard updated.
  if (row.masteryStudentId) {
    // Check if total approved payments complete the course fee
    // For now: any approval triggers activation (admin controls this decision)
    onMasteryPaymentComplete({
      masteryStudentId: row.masteryStudentId,
      actorId:          admin.id,
      actorName:        admin.name ?? "Admin",
      amount:           row.amount,
      eventSource:      "admin_approval",
    }).catch((err: unknown) => {
      req.log.error({ err }, "onMasteryPaymentComplete failed after approve");
    });
  }

  res.json({ id: row.id, status: row.status });
});

// ── GET /api/mentor/mastery/achievement-tickers ───────────────────────────────
router.get("/mentor/mastery/achievement-tickers", allStaff, async (req, res) => {
  const user = req.authUser!;
  const isAdmin = ["admin", "super_admin"].includes(user.role ?? "");

  // Admins don't see achievement tickers (per spec)
  if (isAdmin) { res.json([]); return; }

  const rows = await db
    .select()
    .from(achievementTickersTable)
    .where(
      and(
        eq(achievementTickersTable.mentorId, user.id),
        eq(achievementTickersTable.isShown, false)
      )
    )
    .orderBy(achievementTickersTable.createdAt);

  res.json(rows);
});

// ── POST /api/mentor/mastery/achievement-tickers/:id/shown ────────────────────
router.post("/mentor/mastery/achievement-tickers/:id/shown", allStaff, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .update(achievementTickersTable)
    .set({ isShown: true })
    .where(eq(achievementTickersTable.id, id));

  res.json({ ok: true });
});

// ── GET /api/admin/mastery/payment-leaderboard ────────────────────────────────
router.get("/admin/mastery/payment-leaderboard", adminOnly, async (_req, res) => {
  const mentors = await db
    .select({ id: usersTable.id, name: usersTable.name, mentorType: usersTable.mentorType })
    .from(usersTable)
    .where(and(eq(usersTable.role, "mentor"), eq(usersTable.isActive, true)));

  const tickers = await db
    .select({
      mentorId:  achievementTickersTable.mentorId,
    })
    .from(achievementTickersTable);

  const countMap = tickers.reduce<Record<number, number>>((acc, t) => {
    acc[t.mentorId] = (acc[t.mentorId] ?? 0) + 1;
    return acc;
  }, {});

  const leaderboard = mentors
    .map((m, idx) => ({
      mentorId:          m.id,
      mentorName:        m.name,
      mentorType:        m.mentorType,
      successfulPayments: countMap[m.id] ?? 0,
    }))
    .filter(m => m.successfulPayments > 0)
    .sort((a, b) => b.successfulPayments - a.successfulPayments)
    .map((m, i) => ({ ...m, rank: i + 1 }));

  res.json(leaderboard);
});

// ── POST /api/admin/mastery/payments/:id/reject ──────────────────────────────
router.post("/admin/mastery/payments/:id/reject", adminOnly, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { reason } = req.body as { reason?: string };
  const [row] = await db
    .update(masteryPaymentVerificationsTable)
    .set({
      status:          "rejected",
      rejectionReason: reason ?? "",
      rejectedAt:      new Date(),
      updatedAt:       new Date(),
    })
    .where(eq(masteryPaymentVerificationsTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: row.id, status: row.status });
});

// ── POST /api/admin/mastery/payments/:id/flag-duplicate ──────────────────────
// ── POST /api/admin/mastery/payments/:id/archive ──────────────────────────────
router.post("/admin/mastery/payments/:id/archive", adminOnly, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const admin = req.authUser!;
  const [row] = await db
    .update(masteryPaymentVerificationsTable)
    .set({
      status:        "archived",
      verificationNotes: `Archived by ${admin.name ?? "Admin"} on ${new Date().toISOString()}`,
      updatedAt:     new Date(),
    })
    .where(eq(masteryPaymentVerificationsTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: row.id, status: row.status });
});

router.post("/admin/mastery/payments/:id/flag-duplicate", adminOnly, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const record = await db
    .select()
    .from(masteryPaymentVerificationsTable)
    .where(eq(masteryPaymentVerificationsTable.id, id))
    .limit(1);
  if (!record[0]) { res.status(404).json({ error: "Not found" }); return; }
  const row = record[0];

  // Find duplicates by UTR or Razorpay ID
  const dupes: Array<{
    id: number;
    studentName: string | null;
    studentGrade: number | null;
    amount: number;
    uploadedAt: Date;
    utrNumber: string | null;
    razorpayPaymentId: string | null;
  }> = [];

  const conditions = [];
  if (row.utrNumber) {
    conditions.push(eq(masteryPaymentVerificationsTable.utrNumber, row.utrNumber));
  }
  if (row.razorpayPaymentId) {
    conditions.push(eq(masteryPaymentVerificationsTable.razorpayPaymentId, row.razorpayPaymentId));
  }

  if (conditions.length > 0) {
    const matches = await db
      .select({
        id:               masteryPaymentVerificationsTable.id,
        studentName:      masteryPaymentVerificationsTable.studentName,
        studentGrade:     masteryPaymentVerificationsTable.studentGrade,
        amount:           masteryPaymentVerificationsTable.amount,
        uploadedAt:       masteryPaymentVerificationsTable.uploadedAt,
        utrNumber:        masteryPaymentVerificationsTable.utrNumber,
        razorpayPaymentId: masteryPaymentVerificationsTable.razorpayPaymentId,
      })
      .from(masteryPaymentVerificationsTable)
      .where(or(...conditions));

    dupes.push(
      ...matches.filter(m => m.id !== id)
    );
  }

  const duplicateInfo = {
    flaggedAt:  new Date().toISOString(),
    duplicates: dupes,
  };

  const [updated] = await db
    .update(masteryPaymentVerificationsTable)
    .set({
      status:        "duplicate_suspected",
      isDuplicate:   true,
      duplicateInfo: JSON.stringify(duplicateInfo),
      updatedAt:     new Date(),
    })
    .where(eq(masteryPaymentVerificationsTable.id, id))
    .returning();

  res.json({ id: updated.id, status: updated.status, duplicateInfo });
});

// ── POST /api/admin/mastery/students/:id/create-payment-link ─────────────────
// Generate a Razorpay Payment Link for a mastery student (Flow A)
router.post("/admin/mastery/students/:id/create-payment-link", adminOnly, async (req, res) => {
  const studentId = parseInt(req.params["id"] as string, 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [student] = await db
    .select()
    .from(masteryStudentsTable)
    .where(eq(masteryStudentsTable.id, studentId))
    .limit(1);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const { amount, description } = req.body as { amount?: number; description?: string };
  if (!amount || amount < 1) { res.status(400).json({ error: "amount (rupees) is required" }); return; }

  const rp = getRazorpay();
  if (!rp) { res.status(503).json({ error: "Razorpay keys not configured" }); return; }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const link: any = await rp.paymentLink.create({
      amount:      amount * 100, // paise
      currency:    "INR",
      description: description ?? `Mastery Course — Grade ${student.grade} — ${student.studentName}`,
      customer:    {
        name:  student.studentName,
        contact: `+91${student.phone}`,
        email: student.email ?? undefined,
      },
      notify:      { sms: true, email: !!student.email },
      reminder_enable: true,
      notes: {
        masteryStudentId: String(studentId),
        grade:            String(student.grade ?? ""),
        studentName:      student.studentName,
      },
      callback_url:    undefined,
      callback_method: undefined,
    });

    // Store link on the student record
    await db
      .update(masteryStudentsTable)
      .set({
        razorpayPaymentLinkId:  link.id,
        razorpayPaymentLinkUrl: link.short_url ?? link.id,
        paymentLinkCreatedAt:   new Date(),
        updatedAt:              new Date(),
      })
      .where(eq(masteryStudentsTable.id, studentId));

    res.json({
      linkId:   link.id,
      shortUrl: link.short_url,
      amount:   link.amount / 100,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Razorpay error";
    res.status(502).json({ error: `Failed to create payment link: ${msg}` });
  }
});

// ── POST /api/admin/mastery/payments/:id/refund ───────────────────────────────
router.post("/admin/mastery/payments/:id/refund", adminOnly, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const admin = req.authUser!;
  const [row] = await db
    .update(masteryPaymentVerificationsTable)
    .set({
      status:          "refunded",
      refundedAt:      new Date(),
      refundedByName:  admin.name ?? "Admin",
      updatedAt:       new Date(),
    })
    .where(eq(masteryPaymentVerificationsTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: row.id, status: row.status });
});

// ── GET /api/admin/mastery/payments/:id/check-duplicate ─────────────────────
// Proactive duplicate check before approving
router.get("/admin/mastery/payments/:id/check-duplicate", adminOnly, async (req, res) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select()
    .from(masteryPaymentVerificationsTable)
    .where(eq(masteryPaymentVerificationsTable.id, id))
    .limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const conditions = [];
  if (row.utrNumber)         conditions.push(eq(masteryPaymentVerificationsTable.utrNumber, row.utrNumber));
  if (row.razorpayPaymentId) conditions.push(eq(masteryPaymentVerificationsTable.razorpayPaymentId, row.razorpayPaymentId));

  if (conditions.length === 0) {
    res.json({ isDuplicate: false, duplicates: [] });
    return;
  }

  const matches = await db
    .select({
      id:               masteryPaymentVerificationsTable.id,
      studentName:      masteryPaymentVerificationsTable.studentName,
      studentGrade:     masteryPaymentVerificationsTable.studentGrade,
      amount:           masteryPaymentVerificationsTable.amount,
      uploadedAt:       masteryPaymentVerificationsTable.uploadedAt,
      status:           masteryPaymentVerificationsTable.status,
      utrNumber:        masteryPaymentVerificationsTable.utrNumber,
      razorpayPaymentId: masteryPaymentVerificationsTable.razorpayPaymentId,
    })
    .from(masteryPaymentVerificationsTable)
    .where(or(...conditions));

  const duplicates = matches.filter(m => m.id !== id);
  res.json({ isDuplicate: duplicates.length > 0, duplicates });
});

// ── GET /api/admin/mastery/revenue ────────────────────────────────────────────
router.get("/admin/mastery/revenue", adminOnly, async (req, res) => {
  const { grade, mentorId, dateFrom, dateTo, academicYear } = req.query as Record<string, string>;

  const rows = await db
    .select()
    .from(masteryStudentsTable)
    .orderBy(desc(masteryStudentsTable.admissionDate));

  let filtered = rows;
  if (grade)        { const g = parseInt(grade, 10); if (!isNaN(g)) filtered = filtered.filter(r => r.grade === g); }
  if (mentorId)     { const mid = parseInt(mentorId, 10); if (!isNaN(mid)) filtered = filtered.filter(r => r.mentorId === mid); }
  if (academicYear) { filtered = filtered.filter(r => r.academicYear === academicYear); }
  if (dateFrom)     { const from = new Date(dateFrom + "T00:00:00+05:30"); if (!isNaN(from.getTime())) filtered = filtered.filter(r => new Date(r.admissionDate) >= from); }
  if (dateTo)       { const to   = new Date(dateTo   + "T23:59:59+05:30"); if (!isNaN(to.getTime()))   filtered = filtered.filter(r => new Date(r.admissionDate) <= to);   }

  const now       = new Date();
  const today     = todayStart();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo   = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo  = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);
  const yearAgo   = new Date(today); yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const sumAmt    = (list: typeof filtered) => list.reduce((s, r) => s + r.amountPaid, 0);
  const sumPend   = (list: typeof filtered) => list.reduce((s, r) => s + r.amountPending, 0);
  const inRange   = (list: typeof filtered, from: Date, to?: Date) =>
    list.filter(r => { const d = new Date(r.admissionDate); return d >= from && (!to || d < to); });

  const summary = {
    totalStudents:  filtered.length,
    totalRevenue:   sumAmt(filtered),
    totalPending:   sumPend(filtered),
    today:     { students: inRange(filtered, today).length,     revenue: sumAmt(inRange(filtered, today)) },
    yesterday: { students: inRange(filtered, yesterday, today).length, revenue: sumAmt(inRange(filtered, yesterday, today)) },
    week:      { students: inRange(filtered, weekAgo).length,   revenue: sumAmt(inRange(filtered, weekAgo)) },
    month:     { students: inRange(filtered, monthAgo).length,  revenue: sumAmt(inRange(filtered, monthAgo)) },
    year:      { students: inRange(filtered, yearAgo).length,   revenue: sumAmt(inRange(filtered, yearAgo)) },
  };

  // Grade breakdown
  const gradeMap = new Map<number, { grade: number; students: number; revenue: number; pending: number }>();
  for (const r of filtered) {
    const e = gradeMap.get(r.grade) ?? { grade: r.grade, students: 0, revenue: 0, pending: 0 };
    e.students++; e.revenue += r.amountPaid; e.pending += r.amountPending;
    gradeMap.set(r.grade, e);
  }
  const byGrade = Array.from(gradeMap.values()).sort((a, b) => a.grade - b.grade);

  // Mentor breakdown
  const mentorMap = new Map<string, { mentorId: number | null; mentorName: string; students: number; revenue: number; pending: number }>();
  for (const r of filtered) {
    const key = String(r.mentorId ?? r.mentorName ?? "Unknown");
    const e = mentorMap.get(key) ?? { mentorId: r.mentorId, mentorName: r.mentorName ?? "Unknown", students: 0, revenue: 0, pending: 0 };
    e.students++; e.revenue += r.amountPaid; e.pending += r.amountPending;
    mentorMap.set(key, e);
  }
  const byMentor = Array.from(mentorMap.values()).sort((a, b) => b.revenue - a.revenue);

  // Academic years list from all rows
  const academicYears = [...new Set(rows.map(r => r.academicYear).filter(Boolean))].sort().reverse() as string[];

  res.json({ summary, byGrade, byMentor, students: filtered, academicYears });
});

export default router;
