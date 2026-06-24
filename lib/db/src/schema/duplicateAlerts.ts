import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const duplicateAlertsTable = pgTable("duplicate_alerts", {
  id: serial("id").primaryKey(),
  newPaymentId: integer("new_payment_id"),
  matchingPaymentId: integer("matching_payment_id"),
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  reviewedById: integer("reviewed_by_id"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDuplicateAlertSchema = createInsertSchema(duplicateAlertsTable).omit({ id: true, createdAt: true });
export type InsertDuplicateAlert = z.infer<typeof insertDuplicateAlertSchema>;
export type DuplicateAlert = typeof duplicateAlertsTable.$inferSelect;
