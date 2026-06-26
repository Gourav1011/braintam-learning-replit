import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "@workspace/db";
import {
  usersTable,
  paymentsTable,
  enrolmentErrorsTable,
  ignitePaidStudentsTable,
  paymentLinksTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

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

// ── Grade-based pricing ───────────────────────────────────────
// Grade 1–2: ₹99, Grade 3–8: ₹39, Grade 9–10: ₹89
function getDemoAmountPaise(grade: number): number {
  if (grade <= 2) return 9900;  // ₹99
  if (grade <= 8) return 3900;  // ₹39
  return 8900;                  // ₹89 (grades 9–10)
}

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

  // Check existing account — surface for context only, do not block payment
  const [existingUser] = await db
    .select({ id: usersTable.id, accountType: usersTable.accountType, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);

  // Grade-based amount
  const amountPaise = getDemoAmountPaise(grade);

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
      amount: amountPaise,
      currency: "INR",
      receipt: `btl_demo_${Date.now()}`,
      notes: { phone, grade: String(grade) },
    });
  } catch (err: unknown) {
    req.log.error({ err }, "RAZORPAY CREATE ORDER ERROR");
    res.status(502).json({ error: "Failed to create payment order. Please try again." });
    return;
  }

  // Store pending payment row — phone, grade and amount anchored here for the webhook
  await db.insert(paymentsTable).values({
    phone,
    grade,
    razorpayOrderId: order.id,
    amount: amountPaise,
    currency: "INR",
    paymentType: "demo_enrollment",
    status: "created",
    studentId: existingUser?.id ?? null,
  });

  res.json({
    orderId: order.id,
    amount: amountPaise,
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

  // ── 2a. Long-term payment_link events ─────────────────────
  if (
    event === "payment_link.paid" ||
    event === "payment_link.expired" ||
    event === "payment_link.cancelled" ||
    event === "payment_link.partially_paid"
  ) {
    const plEntity = req.body?.payload?.payment_link?.entity;
    const rpLinkId: string | undefined = plEntity?.id;
    if (rpLinkId) {
      const statusMap: Record<string, string> = {
        "payment_link.paid":           "paid",
        "payment_link.expired":        "expired",
        "payment_link.cancelled":      "cancelled",
        "payment_link.partially_paid": "opened",
      };
      const newStatus = statusMap[event] ?? "opened";
      const updates: Record<string, unknown> = { status: newStatus };

      if (event === "payment_link.paid") {
        // Fetch link row to get studentId
        const [linkRow] = await db
          .select({ studentId: paymentLinksTable.studentId })
          .from(paymentLinksTable)
          .where(eq(paymentLinksTable.razorpayPaymentLinkId, rpLinkId))
          .limit(1);

        if (linkRow?.studentId) {
          await db
            .update(usersTable)
            .set({ leadStage: "Converted", updatedAt: new Date() })
            .where(eq(usersTable.id, linkRow.studentId));
        }
      }

      await db
        .update(paymentLinksTable)
        .set(updates)
        .where(eq(paymentLinksTable.razorpayPaymentLinkId, rpLinkId));
    }
    res.sendStatus(200);
    return;
  }

  if (
    event === "payment_link.created" ||
    event === "payment_link.reminder_sent"
  ) {
    // Update status to opened if not already paid
    const plEntity = req.body?.payload?.payment_link?.entity;
    const rpLinkId: string | undefined = plEntity?.id;
    if (rpLinkId && event === "payment_link.created") {
      await db
        .update(paymentLinksTable)
        .set({ status: "opened" })
        .where(
          and(
            eq(paymentLinksTable.razorpayPaymentLinkId, rpLinkId),
            eq(paymentLinksTable.status, "created"),
          ),
        );
    }
    res.sendStatus(200);
    return;
  }

  if (event !== "payment.captured") {
    // Acknowledge non-capture events silently
    res.sendStatus(200);
    return;
  }

  const paymentEntity = req.body?.payload?.payment?.entity;
  const orderId: string | undefined = paymentEntity?.order_id;
  const razorpayPaymentId: string | undefined = paymentEntity?.id;
  const razorpaySignature = receivedSignature;

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

  // ── 3. Idempotency — skip if already fully processed ─────
  const [existingPayment] = await db
    .select({ id: paymentsTable.id, status: paymentsTable.status })
    .from(paymentsTable)
    .where(eq(paymentsTable.razorpayOrderId, orderId))
    .limit(1);

  if (existingPayment?.status === "captured") {
    // Payment captured — but only skip if ignite record also exists.
    // Without this check a failed ignite insert leaves the student invisible.
    const [igniteRow] = await db
      .select({ id: ignitePaidStudentsTable.id })
      .from(ignitePaidStudentsTable)
      .where(eq(ignitePaidStudentsTable.paymentId, existingPayment.id))
      .limit(1);

    if (igniteRow) {
      // Truly fully processed — safe no-op
      res.sendStatus(200);
      return;
    }
    // Fall through to re-run steps 4-6 so the ignite record is created
  }

  // ── 4. Load phone + grade + stored amount from the payments row ─
  const [paymentRow] = await db
    .select({
      phone: paymentsTable.phone,
      grade: paymentsTable.grade,
      id: paymentsTable.id,
      amount: paymentsTable.amount,
    })
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

  // ── 5. Find or create student ─────────────────────────────
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

    // Ensure demo_student status on re-engaging accounts (e.g. lead → demo_student)
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

  // ── 6. Set leadStage + create Ignite paid student record ──
  try {
    await db
      .update(usersTable)
      .set({ leadStage: "Payment Completed", updatedAt: new Date() })
      .where(eq(usersTable.id, studentId));

    await db
      .insert(ignitePaidStudentsTable)
      .values({
        studentId,
        paymentId: paymentRow.id,
        grade,
        phone,
        amountPaise: paymentRow.amount,
        paidAt: new Date(),
        assignmentStatus: "unassigned",
        courseType: "ignite",
      })
      .onConflictDoNothing();
  } catch (err: unknown) {
    await logEnrolmentError({
      errorType: "ignite_record_fail",
      errorMessage: err instanceof Error ? err.message : "Unknown error creating Ignite paid student record",
      razorpayPaymentId,
      razorpayOrderId: orderId,
      rawPayload: req.body,
    });
  }

  // ── 7. Mark payment as captured ───────────────────────────
  await db
    .update(paymentsTable)
    .set({
      status: "captured",
      webhookVerified: true,
      razorpayPaymentId,
      razorpaySignature,
      studentId,
      rawWebhookPayload: req.body,
      updatedAt: new Date(),
    })
    .where(eq(paymentsTable.razorpayOrderId, orderId));

  // Always 200 — Razorpay must not retry
  res.sendStatus(200);
});

// ── POST /api/payments/create-full-order ─────────────────────
// Self-service full-year course enrollment checkout.
// program: "foundation" | "mastery" | "elite"
const FULL_PROGRAM_PRICES: Record<string, { amountPaise: number; name: string }> = {
  foundation: { amountPaise: 3999900, name: "Foundation Program" }, // ₹39,999
  mastery:    { amountPaise: 4999900, name: "Mastery Program" },    // ₹49,999
  elite:      { amountPaise: 5999900, name: "Elite Program" },      // ₹59,999
};

router.post("/payments/create-full-order", async (req, res) => {
  const { phone: rawPhone, grade: rawGrade, program: rawProgram, name: rawName } = req.body as {
    phone?: string; grade?: unknown; program?: string; name?: string;
  };

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
  const program = String(rawProgram ?? "").toLowerCase();
  const programInfo = FULL_PROGRAM_PRICES[program];
  if (!programInfo) {
    res.status(400).json({ error: "Invalid program. Must be foundation, mastery, or elite." });
    return;
  }

  const [existingUser] = await db
    .select({ id: usersTable.id, accountType: usersTable.accountType, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);

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
      amount: programInfo.amountPaise,
      currency: "INR",
      receipt: `btl_full_${Date.now()}`,
      notes: { phone, grade: String(grade), program, studentName: rawName ?? "" },
    });
  } catch (err: unknown) {
    req.log.error({ err }, "RAZORPAY CREATE FULL ORDER ERROR");
    res.status(502).json({ error: "Failed to create payment order. Please try again." });
    return;
  }

  await db.insert(paymentsTable).values({
    phone,
    grade,
    razorpayOrderId: order.id,
    amount: programInfo.amountPaise,
    currency: "INR",
    paymentType: "full_enrollment",
    status: "created",
    studentId: existingUser?.id ?? null,
  });

  res.json({
    orderId: order.id,
    amount: programInfo.amountPaise,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID,
    programName: programInfo.name,
    existingAccount: existingUser
      ? { accountType: existingUser.accountType, name: existingUser.name }
      : null,
  });
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
