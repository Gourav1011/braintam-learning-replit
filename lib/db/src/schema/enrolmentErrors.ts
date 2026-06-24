import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const enrolmentErrorsTable = pgTable("enrolment_errors", {
  id: serial("id").primaryKey(),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpayOrderId: text("razorpay_order_id"),
  errorType: text("error_type").notNull(),
  errorMessage: text("error_message"),
  rawPayload: jsonb("raw_payload"),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedById: integer("resolved_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEnrolmentErrorSchema = createInsertSchema(enrolmentErrorsTable).omit({ id: true, createdAt: true });
export type InsertEnrolmentError = z.infer<typeof insertEnrolmentErrorSchema>;
export type EnrolmentError = typeof enrolmentErrorsTable.$inferSelect;
