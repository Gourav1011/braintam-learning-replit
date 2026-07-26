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
  studentTimelineTable,
  masteryStudentsTable,
  coursesTable,
} from "@workspace/db";
import { eq, and, desc, isNull } from "drizzle-orm";
import { onMasteryPaymentComplete } from "../lib/masteryPaymentComplete.js";
import { assignIgniteBatchAndCourse } from "../lib/assignIgniteBatch.js";
import { generatePasswordSetupToken } from "../lib/auth-token.js";

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
        // ── Ignite: mark lead as Converted ──────────────────────────────────
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

        // ── Mastery: check if this link belongs to a mastery student ─────────
        const [masteryRow] = await db
          .select({
            id:     masteryStudentsTable.id,
            amount: masteryStudentsTable.amountPaid,
          })
          .from(masteryStudentsTable)
          .where(eq(masteryStudentsTable.razorpayPaymentLinkId, rpLinkId))
          .limit(1);

        if (masteryRow) {
          // Use amount from payment_link entity if available
          const paidAmount = plEntity?.amount_paid
            ? Math.round(plEntity.amount_paid / 100)
            : masteryRow.amount;

          await onMasteryPaymentComplete({
            masteryStudentId: masteryRow.id,
            actorId:          0,
            actorName:        "Razorpay",
            amount:           paidAmount,
            eventSource:      "payment_link",
          }).catch(() => null);
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
    await ensureStudentCode(studentId);

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

    // ── 6b. Auto-assign batch + enrollment (non-fatal) ────────
    const [igniteRecord] = await db
      .select({ id: ignitePaidStudentsTable.id })
      .from(ignitePaidStudentsTable)
      .where(
        and(
          eq(ignitePaidStudentsTable.studentId, studentId),
          eq(ignitePaidStudentsTable.paymentId, paymentRow.id),
        ),
      )
      .limit(1);

    if (igniteRecord) {
      await assignIgniteBatchAndCourse(studentId, grade, igniteRecord.id).catch(() => null);
    }
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


// Assign a permanent BTL code to student records that do not have one.
// The actual name remains untouched; UI decides whether to show name or code.
async function ensureStudentCode(userId: number): Promise<string> {
  const studentCode = `BTL${String(userId).padStart(4, "0")}`;

  await db
    .update(usersTable)
    .set({
      studentCode,
      updatedAt: new Date(),
    })
    .where(and(
      eq(usersTable.id, userId),
      isNull(usersTable.studentCode),
    ));

  return studentCode;
}

// ── POST /api/payments/capture-lead ──────────────────────────
// Public Meta Ads lead capture. Saves a valid phone before Razorpay/order creation.
router.post("/payments/capture-lead", async (req, res) => {
  const {
    phone: rawPhone,
    grade: rawGrade,
    utm_source,
    utm_campaign,
    utm_adset,
    utm_ad,
  } = req.body as {
    phone?: string;
    grade?: unknown;
    utm_source?: string;
    utm_campaign?: string;
    utm_adset?: string;
    utm_ad?: string;
  };

  const phone = normalizePhone(String(rawPhone ?? ""));
  if (!phone) {
    res.status(400).json({ error: "Invalid mobile number." });
    return;
  }

  const grade = Number(rawGrade);
  if (!Number.isInteger(grade) || grade < 1 || grade > 10) {
    res.status(400).json({ error: "Grade must be between 1 and 10." });
    return;
  }

  try {
    const [existing] = await db
      .select({
        id: usersTable.id,
        accountType: usersTable.accountType,
        leadStage: usersTable.leadStage,
      })
      .from(usersTable)
      .where(eq(usersTable.phone, phone))
      .limit(1);

    if (existing) {
      // Only refresh website attribution while the record is still a lead.
      // Never overwrite attribution/grade of an enrolled student.
      if (existing.accountType === "lead") {
        const source =
          ["fb", "facebook"].includes((utm_source ?? "").toLowerCase())
            ? "Facebook"
            : ["ig", "instagram"].includes((utm_source ?? "").toLowerCase())
              ? "Instagram"
              : "Website";

        await db
          .update(usersTable)
          .set({
            grade,
            leadSource: source,
            isWebsiteLead: true,
            utmSource: utm_source ?? undefined,
            utmCampaign: utm_campaign ?? undefined,
            utmAdset: utm_adset ?? undefined,
            utmAd: utm_ad ?? undefined,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.id, existing.id));
      }

      res.json({ success: true, leadId: existing.id, existing: true });
      return;
    }

    const [lead] = await db
      .insert(usersTable)
      .values({
        name: `Website Lead (Grade ${grade})`,
        phone,
        grade,
        role: "student",
        accountType: "lead",
        leadStage: "new",
        leadSource:
          ["fb", "facebook"].includes((utm_source ?? "").toLowerCase())
            ? "Facebook"
            : ["ig", "instagram"].includes((utm_source ?? "").toLowerCase())
              ? "Instagram"
              : "Website",
        isWebsiteLead: true,
        utmSource: utm_source ?? null,
        utmCampaign: utm_campaign ?? null,
        utmAdset: utm_adset ?? null,
        utmAd: utm_ad ?? null,
        phoneVerified: false,
        assignmentStatus: "unassigned",
        isCurrentWeek: false,
        isDeleted: false,
        points: 0,
        streakDays: 0,
      })
      .returning({ id: usersTable.id });

    if (!lead) {
      res.status(500).json({ error: "Unable to create lead." });
      return;
    }

    // Website capture has no name yet. Give this lead a permanent,
    // unique Braintam lead code based on its database user ID.
    const studentCode = await ensureStudentCode(lead.id);

    res.status(201).json({
      success: true,
      leadId: lead.id,
      studentCode,
      existing: false,
    });
  } catch (err) {
    req.log.error({ err }, "PRE-PAYMENT LEAD CAPTURE ERROR");
    res.status(500).json({ error: "Failed to capture lead." });
  }
});

// ── POST /api/payments/create-demo-order ─────────────────────
// Phase 5A: Meta Ads → Website Enrollment flow.
// Accepts phone, grade + optional UTM params. Creates Razorpay order and stores UTMs.
router.post("/payments/create-demo-order", async (req, res) => {
  const {
    phone: rawPhone, grade: rawGrade,
    utm_source, utm_campaign, utm_adset, utm_ad,
  } = req.body as {
    phone?: string; grade?: unknown;
    utm_source?: string; utm_campaign?: string; utm_adset?: string; utm_ad?: string;
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

  const amountPaise = getDemoAmountPaise(grade);

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
      receipt: `btl_meta_${Date.now()}`,
      notes: {
        phone, grade: String(grade),
        utm_source: utm_source ?? "",
        utm_campaign: utm_campaign ?? "",
      },
    });
  } catch (err: unknown) {
    req.log.error({ err }, "RAZORPAY CREATE DEMO ORDER ERROR");
    res.status(502).json({ error: "Failed to create payment order. Please try again." });
    return;
  }

  await db.insert(paymentsTable).values({
    phone,
    grade,
    razorpayOrderId: order.id,
    amount: amountPaise,
    currency: "INR",
    paymentType: "demo_enrollment",
    status: "created",
    utmSource: utm_source ?? null,
    utmCampaign: utm_campaign ?? null,
    utmAdset: utm_adset ?? null,
    utmAd: utm_ad ?? null,
  });

  res.json({
    orderId: order.id,
    amount: amountPaise,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

// ── POST /api/payments/verify-demo-payment ────────────────────
// Phase 5A: verify Razorpay HMAC after payment success, then create/update Ignite CRM lead.
router.post("/payments/verify-demo-payment", async (req, res) => {
  const {
    razorpay_order_id, razorpay_payment_id, razorpay_signature,
    phone: rawPhone, grade: rawGrade,
    utm_source, utm_campaign, utm_adset, utm_ad,
  } = req.body as {
    razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string;
    phone?: string; grade?: unknown;
    utm_source?: string; utm_campaign?: string; utm_adset?: string; utm_ad?: string;
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: "Missing Razorpay payment fields." });
    return;
  }

  const phone = normalizePhone(String(rawPhone ?? ""));
  if (!phone) {
    res.status(400).json({ error: "Invalid mobile number." });
    return;
  }
  const grade = Number(rawGrade);
  if (!Number.isInteger(grade) || grade < 1 || grade > 10) {
    res.status(400).json({ error: "Grade must be between 1 and 10." });
    return;
  }

  // ── 1. Verify HMAC signature ──────────────────────────────
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.status(503).json({ error: "Payment service misconfigured." });
    return;
  }

  const expectedSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSig !== razorpay_signature) {
    await logEnrolmentError({
      errorType: "verify_signature_mismatch",
      errorMessage: "HMAC signature mismatch on verify-demo-payment",
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
    });
    res.status(400).json({ error: "Payment verification failed. Please contact support." });
    return;
  }

  // ── 2. Idempotency: skip if payment already fully processed ──
  const [existingPayment] = await db
    .select({ id: paymentsTable.id, status: paymentsTable.status })
    .from(paymentsTable)
    .where(eq(paymentsTable.razorpayOrderId, razorpay_order_id))
    .limit(1);

  if (existingPayment?.status === "captured") {
    const [existIgnite] = await db
      .select({ id: ignitePaidStudentsTable.id, studentId: ignitePaidStudentsTable.studentId })
      .from(ignitePaidStudentsTable)
      .where(eq(ignitePaidStudentsTable.paymentId, existingPayment.id))
      .limit(1);
    if (existIgnite) {
      const [existingStudent] = await db
        .select({ passwordHash: usersTable.passwordHash })
        .from(usersTable)
        .where(eq(usersTable.id, existIgnite.studentId))
        .limit(1);

      const needsPasswordSetup = !existingStudent?.passwordHash;

      res.json({
        success: true,
        leadId: existIgnite.studentId,
        paymentId: razorpay_payment_id,
        grade,
        needsPasswordSetup,
        setupToken: needsPasswordSetup
          ? generatePasswordSetupToken(existIgnite.studentId, existingPayment.id)
          : undefined,
      });
      return;
    }
  }

  // ── 3. Find or create user (demo_student) ────────────────
  let studentId: number;
  try {
    // Check for existing user by phone
    const [existingUser] = await db
      .select({ id: usersTable.id, accountType: usersTable.accountType })
      .from(usersTable)
      .where(eq(usersTable.phone, phone))
      .limit(1);

    if (existingUser) {
      studentId = existingUser.id;
      // Update existing user with latest payment + website lead info
      await db
        .update(usersTable)
        .set({
          accountType: existingUser.accountType === "paid_student" ? "paid_student" : "demo_student",
          leadStage: "Demo Paid",
          leadSource: "Meta Ads",
          isWebsiteLead: true,
          utmSource: utm_source ?? undefined,
          utmCampaign: utm_campaign ?? undefined,
          utmAdset: utm_adset ?? undefined,
          utmAd: utm_ad ?? undefined,
          phoneVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, studentId));
    } else {
      // Create new demo_student lead
      const [inserted] = await db
        .insert(usersTable)
        .values({
          name: `Student (Grade ${grade})`,
          phone,
          grade,
          role: "student",
          accountType: "demo_student",
          leadStage: "Demo Paid",
          leadSource: "Meta Ads",
          isWebsiteLead: true,
          utmSource: utm_source ?? null,
          utmCampaign: utm_campaign ?? null,
          utmAdset: utm_adset ?? null,
          utmAd: utm_ad ?? null,
          phoneVerified: true,
          points: 0,
          streakDays: 0,
        })
        .returning({ id: usersTable.id });

      if (!inserted) throw new Error("Failed to create user");
      studentId = inserted.id;
    }

    await ensureStudentCode(studentId);
  } catch (err: unknown) {
    await logEnrolmentError({
      errorType: "verify_user_create_fail",
      errorMessage: err instanceof Error ? err.message : "Unknown error creating user",
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
    });
    res.status(500).json({ error: "Failed to create lead. Please contact support." });
    return;
  }

  // ── 4. Upsert payment row (mark captured) ───────────────
  const paymentId = existingPayment?.id ?? null;
  let paymentRowId: number;

  if (paymentId) {
    await db
      .update(paymentsTable)
      .set({
        status: "captured",
        webhookVerified: true,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        studentId,
        utmSource: utm_source ?? undefined,
        utmCampaign: utm_campaign ?? undefined,
        utmAdset: utm_adset ?? undefined,
        utmAd: utm_ad ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(paymentsTable.razorpayOrderId, razorpay_order_id));
    paymentRowId = paymentId;
  } else {
    // Payment row missing (edge case) — create one now
    const amountPaise = getDemoAmountPaise(grade);
    const [newPayment] = await db
      .insert(paymentsTable)
      .values({
        phone,
        grade,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        amount: amountPaise,
        currency: "INR",
        paymentType: "demo_enrollment",
        status: "captured",
        webhookVerified: true,
        studentId,
        utmSource: utm_source ?? null,
        utmCampaign: utm_campaign ?? null,
        utmAdset: utm_adset ?? null,
        utmAd: utm_ad ?? null,
      })
      .returning({ id: paymentsTable.id });
    paymentRowId = newPayment.id;
  }

  // ── 5. Create ignite paid student record ─────────────────
  const amountPaise = getDemoAmountPaise(grade);
  await db
    .insert(ignitePaidStudentsTable)
    .values({
      studentId,
      paymentId: paymentRowId,
      grade,
      phone,
      amountPaise,
      paidAt: new Date(),
      assignmentStatus: "unassigned",
      courseType: "ignite",
      leadSource: "Meta Ads",
    })
    .onConflictDoNothing();

  // ── 5b. Auto-assign batch + enrollment (non-fatal) ────────
  const [verifyIgniteRecord] = await db
    .select({ id: ignitePaidStudentsTable.id })
    .from(ignitePaidStudentsTable)
    .where(
      and(
        eq(ignitePaidStudentsTable.studentId, studentId),
        eq(ignitePaidStudentsTable.paymentId, paymentRowId),
      ),
    )
    .limit(1);

  if (verifyIgniteRecord) {
    await assignIgniteBatchAndCourse(studentId, grade, verifyIgniteRecord.id).catch(() => null);
  }

  // ── 6. Add timeline entry ─────────────────────────────────
  try {
    await db.insert(studentTimelineTable).values({
      studentId,
      createdByName: "System",
      createdByRole: "system",
      noteType: "payment",
      remark: `Website Enrollment Completed — Platform: Meta Ads — Payment: Successful — Grade: Grade ${grade} — Order: ${razorpay_order_id}`,
      actionTaken: "Lead auto-created via website enrollment",
    });
  } catch {
    // Timeline failure is non-fatal
  }

  const [setupStudent] = await db
    .select({ passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.id, studentId))
    .limit(1);

  const needsPasswordSetup = !setupStudent?.passwordHash;

  res.json({
    success: true,
    leadId: studentId,
    paymentId: razorpay_payment_id,
    grade,
    needsPasswordSetup,
    setupToken: needsPasswordSetup
      ? generatePasswordSetupToken(studentId, paymentRowId)
      : undefined,
  });
});

// ── POST /api/payments/verify-full-payment ──────────────────
// Verify Razorpay checkout before activating Mastery enrollment.
router.post("/payments/verify-full-payment", async (req, res) => {
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
  } = req.body as {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  };

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    res.status(400).json({ error: "Missing payment verification details." });
    return;
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Payment service is not configured." });
    return;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "utf8");
  const supplied = Buffer.from(razorpay_signature, "utf8");

  if (
    expected.length !== supplied.length ||
    !crypto.timingSafeEqual(expected, supplied)
  ) {
    res.status(400).json({ error: "Payment verification failed." });
    return;
  }

  // The order must have been created by our Full Year checkout.
  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.razorpayOrderId, razorpay_order_id),
        eq(paymentsTable.paymentType, "full_enrollment"),
      ),
    )
    .limit(1);

  if (!payment) {
    res.status(404).json({ error: "Enrollment payment order not found." });
    return;
  }

  // Idempotency: a verified retry must not create another Mastery student.
  if (payment.status === "captured" && payment.studentId) {
    const [existingMastery] = await db
      .select({ id: masteryStudentsTable.id })
      .from(masteryStudentsTable)
      .where(eq(masteryStudentsTable.studentId, payment.studentId))
      .limit(1);

    res.json({
      success: true,
      studentId: payment.studentId,
      masteryStudentId: existingMastery?.id ?? null,
      alreadyProcessed: true,
    });
    return;
  }

  // Confirm Razorpay itself reports this payment as captured.
  let razorpay: Razorpay;
  try {
    razorpay = getRazorpay();
  } catch {
    res.status(503).json({ error: "Payment service is not configured." });
    return;
  }

  try {
    const rpPayment = await razorpay.payments.fetch(razorpay_payment_id);

    if (
      rpPayment.order_id !== razorpay_order_id ||
      rpPayment.status !== "captured"
    ) {
      res.status(409).json({
        error: "Payment has not been captured yet. Please try again shortly.",
      });
      return;
    }

    if (Number(rpPayment.amount) !== payment.amount) {
      res.status(409).json({ error: "Payment amount verification failed." });
      return;
    }
  } catch (err) {
    req.log.error({ err }, "RAZORPAY FULL PAYMENT FETCH ERROR");
    res.status(502).json({ error: "Unable to confirm payment with Razorpay." });
    return;
  }

  const phone = payment.phone;
  const grade = payment.grade;

  if (!phone || !grade) {
    res.status(500).json({ error: "Enrollment payment details are incomplete." });
    return;
  }

  // Find the student account created earlier, or create one for this purchase.
  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);

  if (!user) {
    const [created] = await db
      .insert(usersTable)
      .values({
        name: `Student (Grade ${grade})`,
        phone,
        grade,
        role: "student",
        accountType: "paid_student",
        leadStage: "converted",
        leadSource: "Website",
        isWebsiteLead: true,
        assignmentStatus: "converted",
        isCurrentWeek: false,
        points: 0,
        streakDays: 1,
      })
      .returning();

    user = created;
  } else {
    const [updated] = await db
      .update(usersTable)
      .set({
        grade,
        accountType: "paid_student",
        leadStage: "converted",
        assignmentStatus: "converted",
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    user = updated ?? user;
  }

  if (user) {
    await ensureStudentCode(user.id);
  }

  if (!user) {
    res.status(500).json({ error: "Unable to create student account." });
    return;
  }

  // Find or create the Mastery CRM student.
  let [masteryStudent] = await db
    .select()
    .from(masteryStudentsTable)
    .where(eq(masteryStudentsTable.studentId, user.id))
    .limit(1);

  const amountRupees = Math.round(payment.amount / 100);

  if (!masteryStudent) {
    const year = new Date().getFullYear();

    [masteryStudent] = await db
      .insert(masteryStudentsTable)
      .values({
        studentId: user.id,
        studentName: user.name,
        phone,
        email: user.email ?? null,
        grade,
        coursePlan: "Mastery Program",
        courseDuration: "Full Year",
        amountPaid: amountRupees,
        amountPending: 0,
        paymentStatus: "paid",
        academicYear: `${year}-${String(year + 1).slice(2)}`,
        admissionDate: new Date(),
        source: "Website Full Enrollment",
        masteryStatus: "Pending",
        isNewAdmission: true,
      })
      .returning();
  } else {
    [masteryStudent] = await db
      .update(masteryStudentsTable)
      .set({
        grade,
        amountPaid: amountRupees,
        amountPending: 0,
        paymentStatus: "paid",
        updatedAt: new Date(),
      })
      .where(eq(masteryStudentsTable.id, masteryStudent.id))
      .returning();
  }

  if (!masteryStudent) {
    res.status(500).json({ error: "Unable to create Mastery enrollment." });
    return;
  }

  await onMasteryPaymentComplete({
    masteryStudentId: masteryStudent.id,
    actorId: user.id,
    actorName: "Website Checkout",
    amount: amountRupees,
    eventSource: "payment_link",
  });

  await db
    .update(paymentsTable)
    .set({
      studentId: user.id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: "captured",
    })
    .where(eq(paymentsTable.id, payment.id));

  res.json({
    success: true,
    studentId: user.id,
    masteryStudentId: masteryStudent.id,
  });
});

// ── POST /api/payments/create-full-order ─────────────────────
// Self-service full-year course enrollment checkout.
// program: "foundation" | "mastery" | "elite"
// Grade-specific pricing must match GRADE_PRICES in enroll-full.tsx exactly.
const FULL_PROGRAM_NAMES: Record<string, string> = {
  foundation: "Foundation Program",
  mastery:    "Mastery Program",
  elite:      "Elite Program",
};
const FULL_GRADE_PRICES: Record<number, number> = {
  1: 2999800, // ₹29,998
  2: 3199800, // ₹31,998
  3: 3399800, // ₹33,998
  4: 3599800, // ₹35,998
  5: 3799800, // ₹37,998
  6: 4199800, // ₹41,998
  7: 4399800, // ₹43,998
  8: 4999800, // ₹49,998
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
  const programName = FULL_PROGRAM_NAMES[program];
  if (!programName) {
    res.status(400).json({ error: "Invalid program. Must be foundation, mastery, or elite." });
    return;
  }
  // Prefer DB-configured price; fall back to hardcoded table.
  const [dbCourse] = await db.select({ originalPrice: coursesTable.originalPrice })
    .from(coursesTable)
    .where(and(
      eq(coursesTable.grade, grade),
      eq(coursesTable.courseType, "mastery"),
      eq(coursesTable.isArchived, false),
    ))
    .orderBy(desc(coursesTable.id))
    .limit(1);

  const amountPaise = dbCourse?.originalPrice
    ? dbCourse.originalPrice * 100  // DB stores rupees, Razorpay needs paise
    : FULL_GRADE_PRICES[grade];
  if (!amountPaise) {
    res.status(400).json({ error: "No pricing available for this grade." });
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
      amount: amountPaise,
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
    amount: amountPaise,
    currency: "INR",
    paymentType: "full_enrollment",
    status: "created",
    studentId: existingUser?.id ?? null,
  });

  res.json({
    orderId: order.id,
    amount: amountPaise,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID,
    programName,
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
