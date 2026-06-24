import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "@workspace/db";
import {
  usersTable,
  paymentsTable,
  demoBatchesTable,
  demoBatchEnrollmentsTable,
  enrolmentErrorsTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

// ── Phone normalization ───────────────────────────────────────
// Stores 10-digit Indian mobile numbers only.
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let normalized: string;
  if (digits.length === 12 && digits.startsWith("91")) normalized = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) normalized = digits.slice(1);
  else normalized = digits;
  // Must be exactly 10 digits starting with 6–9
  return /^[6-9]\d{9}$/.test(normalized) ? normalized : null;
}

// ── Razorpay client (lazy — validates env on first use) ───────
function getRazorpay(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// ── Amount ────────────────────────────────────────────────────
const DEMO_AMOUNT_PAISE = 4900; // ₹49

// ── POST /api/payments/create-order ──────────────────────────
// Public endpoint — no auth required.
// Creates a Razorpay order and stores a pending payments row.
router.post("/payments/create-order", async (req, res) => {
  const { phone: rawPhone, grade: rawGrade } = req.body as { phone?: string; grade?: unknown };

  // Validate inputs
  const phone = normalizePhone(String(rawPhone ?? ""));
  if (!phone) {
    res.status(400).json({ error: "Invalid mobile number. Enter a 10-digit Indian mobile number." });
    return;
  }
  const grade = Number(rawGrade);
  if (!Number.isInteger(grade) || grade < 1 || grade > 10) {
    res.status(400).json({ error: "Grade must be between 1 and 10." });
    return;
  }

  // Check existing account status
  const [existingUser] = await db
    .select({ id: usersTable.id, accountType: usersTable.accountType, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);

  if (existingUser) {
    // Check if already in an active demo batch
    const activeBatchEnrollment = await db
      .select({ id: demoBatchEnrollmentsTable.id })
      .from(demoBatchEnrollmentsTable)
      .where(
        and(
          eq(demoBatchEnrollmentsTable.studentId, existingUser.id),
          inArray(demoBatchEnrollmentsTable.enrollmentStatus, ["active", "converted"]),
        ),
      )
      .limit(1);

    if (activeBatchEnrollment.length > 0) {
      res.status(409).json({
        error: "already_enrolled",
        message: "This mobile number is already enrolled in an active demo batch. Please contact support.",
        accountType: existingUser.accountType,
      });
      return;
    }

    // Exists but not in an active batch — surface for review, allow payment
    // (lead re-engaging, dropped student re-enrolling, etc.)
  }

  // Create Razorpay order
  let razorpay: Razorpay;
  try {
    razorpay = getRazorpay();
  } catch {
    res.status(503).json({ error: "Payment service is not configured. Please try again later." });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let order: any;
  try {
    order = await razorpay.orders.create({
      amount: DEMO_AMOUNT_PAISE,
      currency: "INR",
      receipt: `btl_demo_${Date.now()}`,
      notes: { phone, grade: String(grade) },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: "Failed to create payment order. Please try again.", detail: msg });
    return;
  }

  // Store pending payment row — phone and grade are anchored here for the webhook
  await db.insert(paymentsTable).values({
    phone,
    grade,
    razorpayOrderId: order.id,
    amount: DEMO_AMOUNT_PAISE,
    currency: "INR",
    paymentType: "demo_enrollment",
    status: "created",
    studentId: existingUser?.id ?? null,
  });

  res.json({
    orderId: order.id,
    amount: DEMO_AMOUNT_PAISE,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID,
    // Surfaced to allow frontend to show context if account already exists
    existingAccount: existingUser
      ? { accountType: existingUser.accountType, name: existingUser.name }
      : null,
  });
});

// ── POST /api/payments/webhook ────────────────────────────────
// Unauthenticated — verified by Razorpay HMAC signature only.
// Always returns HTTP 200 so Razorpay does not retry.
router.post("/payments/webhook", async (req, res) => {
  // ── 1. Signature verification ─────────────────────────────
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Misconfigured — log and acknowledge to prevent retry flood
    await logEnrolmentError({
      errorType: "webhook_config_missing",
      errorMessage: "RAZORPAY_WEBHOOK_SECRET is not set",
      rawPayload: req.body,
    });
    res.sendStatus(200);
    return;
  }

  const receivedSignature = req.headers["x-razorpay-signature"] as string | undefined;
  const rawBody: Buffer | undefined = (req as any).rawBody;

  if (!receivedSignature || !rawBody) {
    await logEnrolmentError({
      errorType: "signature_missing",
      errorMessage: "Missing signature header or raw body",
      rawPayload: req.body,
    });
    res.sendStatus(200);
    return;
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== receivedSignature) {
    await logEnrolmentError({
      errorType: "signature_mismatch",
      errorMessage: "HMAC signature verification failed",
      rawPayload: req.body,
    });
    res.sendStatus(200);
    return;
  }

  // ── 2. Event type filter ──────────────────────────────────
  const event = req.body?.event as string | undefined;
  if (event !== "payment.captured") {
    // Acknowledge non-capture events silently
    res.sendStatus(200);
    return;
  }

  const paymentEntity = req.body?.payload?.payment?.entity;
  const orderId: string | undefined = paymentEntity?.order_id;
  const razorpayPaymentId: string | undefined = paymentEntity?.id;
  const razorpaySignature = receivedSignature;
  const capturedAmount: number | undefined = paymentEntity?.amount;

  if (!orderId || !razorpayPaymentId) {
    await logEnrolmentError({
      errorType: "webhook_payload_invalid",
      errorMessage: "Missing order_id or payment id in payload",
      razorpayOrderId: orderId,
      rawPayload: req.body,
    });
    res.sendStatus(200);
    return;
  }

  // ── 3. Idempotency — skip if already processed ────────────
  const [existingPayment] = await db
    .select({ id: paymentsTable.id, status: paymentsTable.status })
    .from(paymentsTable)
    .where(eq(paymentsTable.razorpayOrderId, orderId))
    .limit(1);

  if (existingPayment?.status === "captured") {
    // Already fully processed — safe no-op
    res.sendStatus(200);
    return;
  }

  // ── 4. Amount verification ────────────────────────────────
  if (capturedAmount !== undefined && capturedAmount !== DEMO_AMOUNT_PAISE) {
    await logEnrolmentError({
      errorType: "amount_mismatch",
      errorMessage: `Expected ${DEMO_AMOUNT_PAISE} paise, got ${capturedAmount}`,
      razorpayPaymentId,
      razorpayOrderId: orderId,
      rawPayload: req.body,
    });
    res.sendStatus(200);
    return;
  }

  // ── 5. Load phone + grade from the payments row ───────────
  const [paymentRow] = await db
    .select({ phone: paymentsTable.phone, grade: paymentsTable.grade, id: paymentsTable.id })
    .from(paymentsTable)
    .where(eq(paymentsTable.razorpayOrderId, orderId))
    .limit(1);

  if (!paymentRow?.phone || paymentRow.grade == null) {
    await logEnrolmentError({
      errorType: "payment_row_missing",
      errorMessage: "No payments row found for this order_id, or phone/grade missing",
      razorpayPaymentId,
      razorpayOrderId: orderId,
      rawPayload: req.body,
    });
    res.sendStatus(200);
    return;
  }

  const { phone, grade } = paymentRow;
  let studentId: number;

  // ── 6. Find or create student ─────────────────────────────
  try {
    // INSERT ... ON CONFLICT DO NOTHING handles race conditions safely
    await db
      .insert(usersTable)
      .values({
        name: `Student (Grade ${grade})`,
        phone,
        grade,
        role: "student",
        accountType: "demo_student",
        phoneVerified: true,
        points: 0,
        streakDays: 0,
      })
      .onConflictDoNothing();

    const [student] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.phone, phone))
      .limit(1);

    if (!student) throw new Error("Student not found after insert");
    studentId = student.id;

    // Ensure demo_student status on re-enrolling accounts (e.g. lead → demo_student)
    await db
      .update(usersTable)
      .set({ accountType: "demo_student", phoneVerified: true })
      .where(and(eq(usersTable.id, studentId), eq(usersTable.accountType, "lead")));
  } catch (err: unknown) {
    await logEnrolmentError({
      errorType: "user_create_fail",
      errorMessage: err instanceof Error ? err.message : "Unknown error creating user",
      razorpayPaymentId,
      razorpayOrderId: orderId,
      rawPayload: req.body,
    });
    res.sendStatus(200);
    return;
  }

  // ── 7. Find active batch for the grade ────────────────────
  let batchId: number | null = null;
  try {
    const [batch] = await db
      .select({ id: demoBatchesTable.id })
      .from(demoBatchesTable)
      .where(
        and(
          eq(demoBatchesTable.grade, grade),
          eq(demoBatchesTable.isActive, true),
          inArray(demoBatchesTable.status, ["upcoming", "active"]),
        ),
      )
      .orderBy(demoBatchesTable.startDate, demoBatchesTable.createdAt)
      .limit(1);

    if (batch) {
      batchId = batch.id;
      // Enroll — ON CONFLICT DO NOTHING handles already-enrolled students safely
      await db
        .insert(demoBatchEnrollmentsTable)
        .values({ batchId, studentId, enrollmentStatus: "active" })
        .onConflictDoNothing();
    } else {
      // No active batch — log for admin resolution, student account still created
      await logEnrolmentError({
        errorType: "no_active_batch",
        errorMessage: `No active demo batch found for grade ${grade}`,
        razorpayPaymentId,
        razorpayOrderId: orderId,
        rawPayload: { grade, phone, studentId },
      });
    }
  } catch (err: unknown) {
    await logEnrolmentError({
      errorType: "enroll_fail",
      errorMessage: err instanceof Error ? err.message : "Unknown error during batch enrollment",
      razorpayPaymentId,
      razorpayOrderId: orderId,
      rawPayload: req.body,
    });
  }

  // ── 8. Mark payment as captured ───────────────────────────
  await db
    .update(paymentsTable)
    .set({
      status: "captured",
      webhookVerified: true,
      razorpayPaymentId,
      razorpaySignature,
      studentId,
      batchId,
      rawWebhookPayload: req.body,
      updatedAt: new Date(),
    })
    .where(eq(paymentsTable.razorpayOrderId, orderId));

  // Always 200 — Razorpay must not retry
  res.sendStatus(200);
});

// ── Helper: log enrolment errors ──────────────────────────────
async function logEnrolmentError(opts: {
  errorType: string;
  errorMessage: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  rawPayload?: unknown;
}) {
  try {
    await db.insert(enrolmentErrorsTable).values({
      errorType: opts.errorType,
      errorMessage: opts.errorMessage,
      razorpayPaymentId: opts.razorpayPaymentId ?? null,
      razorpayOrderId: opts.razorpayOrderId ?? null,
      rawPayload: opts.rawPayload ?? null,
    });
  } catch {
    // Never let error logging crash the webhook handler
  }
}

export default router;
