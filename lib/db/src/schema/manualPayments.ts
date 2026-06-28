import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const manualPaymentsTable = pgTable("manual_payments", {
  id:                  serial("id").primaryKey(),
  studentId:           integer("student_id"),
  submittedById:       integer("submitted_by_id"),
  // upi | bank | cash | cheque
  type:                text("type").notNull(),
  amount:              integer("amount").notNull(), // in rupees
  referenceNumber:     text("reference_number").unique(),
  paymentDate:         timestamp("payment_date"),
  remarks:             text("remarks"),
  proofUrl:            text("proof_url"),
  screenshotsJson:     text("screenshots_json"),
  status:              text("status").notNull().default("pending"), // pending | approved | rejected
  // Duplicate detection
  isDuplicate:         boolean("is_duplicate").notNull().default(false),
  duplicateType:       text("duplicate_type"),       // hard | soft
  duplicateScore:      integer("duplicate_score"),   // 0–100
  duplicatePaymentId:  integer("duplicate_payment_id"), // matching payment id
  // Receipt
  receiptNumber:       text("receipt_number").unique(),
  installmentNumber:   integer("installment_number").default(1),
  // Archive (never delete)
  isArchived:          boolean("is_archived").notNull().default(false),
  archivedAt:          timestamp("archived_at"),
  // Timestamps
  uploadedAt:          timestamp("uploaded_at").defaultNow().notNull(),
  approvedById:        integer("approved_by_id"),
  approvedAt:          timestamp("approved_at"),
  rejectionReason:     text("rejection_reason"),
});

export const insertManualPaymentSchema = createInsertSchema(manualPaymentsTable).omit({ id: true, uploadedAt: true });
export type InsertManualPayment = z.infer<typeof insertManualPaymentSchema>;
export type ManualPayment = typeof manualPaymentsTable.$inferSelect;
