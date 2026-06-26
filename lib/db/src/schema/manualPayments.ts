import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const manualPaymentsTable = pgTable("manual_payments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id"),
  submittedById: integer("submitted_by_id"),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  referenceNumber: text("reference_number").unique(),
  proofUrl: text("proof_url"),
  screenshotsJson: text("screenshots_json"),
  status: text("status").notNull().default("pending"),
  isDuplicate: boolean("is_duplicate").notNull().default(false),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  approvedById: integer("approved_by_id"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
});

export const insertManualPaymentSchema = createInsertSchema(manualPaymentsTable).omit({ id: true, uploadedAt: true });
export type InsertManualPayment = z.infer<typeof insertManualPaymentSchema>;
export type ManualPayment = typeof manualPaymentsTable.$inferSelect;
