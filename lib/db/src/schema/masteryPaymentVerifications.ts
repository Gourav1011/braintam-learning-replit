import { pgTable, serial, integer, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const masteryPaymentVerificationsTable = pgTable("mastery_payment_verifications", {
  id:                 serial("id").primaryKey(),
  masteryStudentId:   integer("mastery_student_id"),
  studentId:          integer("student_id"),
  studentName:        text("student_name"),
  studentGrade:       integer("student_grade"),
  submittedById:      integer("submitted_by_id"),
  submittedByName:    text("submitted_by_name"),
  amount:             integer("amount").notNull(),
  paymentMethod:      text("payment_method").notNull().default("upi"),
  utrNumber:          text("utr_number"),
  razorpayPaymentId:  text("razorpay_payment_id"),
  screenshotsJson:    text("screenshots_json"),
  status:             text("status").notNull().default("pending_verification"),
  // Admin-only fraud / duplicate fields
  isDuplicate:        boolean("is_duplicate").notNull().default(false),
  duplicateInfo:      text("duplicate_info"),     // JSON - admin only
  fraudCheckResult:   text("fraud_check_result"), // JSON - admin only
  razorpayVerified:   boolean("razorpay_verified"),
  verificationNotes:  text("verification_notes"),
  // Timeline
  uploadedAt:         timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  verificationStartedAt: timestamp("verification_started_at", { withTimezone: true }),
  approvedAt:         timestamp("approved_at", { withTimezone: true }),
  rejectedAt:         timestamp("rejected_at", { withTimezone: true }),
  rejectionReason:    text("rejection_reason"),
  approvedById:       integer("approved_by_id"),
  approvedByName:     text("approved_by_name"),
  refundedAt:         timestamp("refunded_at", { withTimezone: true }),
  refundedByName:     text("refunded_by_name"),
  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("mpv_student_id_idx").on(t.studentId),
  index("mpv_mastery_student_id_idx").on(t.masteryStudentId),
  index("mpv_status_idx").on(t.status),
  index("mpv_utr_idx").on(t.utrNumber),
  index("mpv_razorpay_idx").on(t.razorpayPaymentId),
  index("mpv_uploaded_at_idx").on(t.uploadedAt),
]);

export const insertMasteryPaymentVerificationSchema = createInsertSchema(masteryPaymentVerificationsTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMasteryPaymentVerification = z.infer<typeof insertMasteryPaymentVerificationSchema>;
export type MasteryPaymentVerification = typeof masteryPaymentVerificationsTable.$inferSelect;
