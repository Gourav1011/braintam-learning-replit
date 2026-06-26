import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const leadStatusHistoryTable = pgTable("lead_status_history", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => usersTable.id),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  changedById: integer("changed_by_id").references(() => usersTable.id),
  changedByName: text("changed_by_name").notNull(),
  changedByRole: text("changed_by_role").notNull().default("mentor"),
  remarks: text("remarks"),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

export type LeadStatusHistory = typeof leadStatusHistoryTable.$inferSelect;
export type InsertLeadStatusHistory = typeof leadStatusHistoryTable.$inferInsert;
