import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const mentorEodReportsTable = pgTable("mentor_eod_reports", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => usersTable.id),
  reportDate: text("report_date").notNull(),
  studentsContacted: integer("students_contacted").notNull().default(0),
  callsCompleted: integer("calls_completed").notNull().default(0),
  followUpsCompleted: integer("follow_ups_completed").notNull().default(0),
  followUpsPending: integer("follow_ups_pending").notNull().default(0),
  doubtSessionsConducted: integer("doubt_sessions_conducted").notNull().default(0),
  classesObserved: integer("classes_observed").notNull().default(0),
  challengesFaced: text("challenges_faced"),
  studentsNeedingAttention: text("students_needing_attention"),
  parentConcerns: text("parent_concerns"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MentorEodReport = typeof mentorEodReportsTable.$inferSelect;
export type InsertMentorEodReport = typeof mentorEodReportsTable.$inferInsert;
