import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const studentTimelineTable = pgTable("student_timeline", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => usersTable.id),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdByName: text("created_by_name").notNull(),
  createdByRole: text("created_by_role").notNull(),
  noteType: text("note_type").notNull().default("general"),
  remark: text("remark").notNull(),
  followUpDate: text("follow_up_date"),
  actionTaken: text("action_taken"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StudentTimeline = typeof studentTimelineTable.$inferSelect;
export type InsertStudentTimeline = typeof studentTimelineTable.$inferInsert;
