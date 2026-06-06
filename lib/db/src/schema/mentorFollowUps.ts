import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const mentorFollowUpsTable = pgTable("mentor_follow_ups", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => usersTable.id),
  studentId: integer("student_id").notNull().references(() => usersTable.id),
  noteType: text("note_type").notNull().default("general"),
  note: text("note").notNull(),
  callStatus: text("call_status"),
  callTime: text("call_time"),
  calledBy: text("called_by"),
  calledByName: text("called_by_name"),
  leadStatus: text("lead_status"),
  nextFollowUpDate: text("next_follow_up_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MentorFollowUp = typeof mentorFollowUpsTable.$inferSelect;
export type InsertMentorFollowUp = typeof mentorFollowUpsTable.$inferInsert;
