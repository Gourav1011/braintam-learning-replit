import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const mentorReassignmentHistoryTable = pgTable("mentor_reassignment_history", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => usersTable.id),
  previousMentorId: integer("previous_mentor_id").references(() => usersTable.id),
  previousMentorName: text("previous_mentor_name"),
  newMentorId: integer("new_mentor_id").references(() => usersTable.id),
  newMentorName: text("new_mentor_name").notNull(),
  reassignedById: integer("reassigned_by_id").references(() => usersTable.id),
  reassignedByName: text("reassigned_by_name").notNull(),
  reason: text("reason"),
  reassignedAt: timestamp("reassigned_at").defaultNow().notNull(),
});

export type MentorReassignmentHistory = typeof mentorReassignmentHistoryTable.$inferSelect;
export type InsertMentorReassignmentHistory = typeof mentorReassignmentHistoryTable.$inferInsert;
