import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// status values: created | opened | paid | failed | expired | cancelled
export const paymentLinksTable = pgTable("payment_links", {
  id: serial("id").primaryKey(),
  generatedById: integer("generated_by_id"),
  mentorId: integer("mentor_id"),
  studentId: integer("student_id"),
  razorpayLinkId: text("razorpay_link_id").unique(),
  razorpayPaymentLinkId: text("razorpay_payment_link_id").unique(),
  shortUrl: text("short_url"),
  razorpayLinkUrl: text("razorpay_link_url"),
  amount: integer("amount").notNull(),
  paymentType: text("payment_type").notNull(),
  grade: integer("grade"),
  courseId: integer("course_id"),
  description: text("description"),
  status: text("status").notNull().default("created"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentLinkSchema = createInsertSchema(paymentLinksTable).omit({ id: true, createdAt: true });
export type InsertPaymentLink = z.infer<typeof insertPaymentLinkSchema>;
export type PaymentLink = typeof paymentLinksTable.$inferSelect;
