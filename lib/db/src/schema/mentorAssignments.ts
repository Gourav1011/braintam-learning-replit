import { pgTable, serial, integer, timestamp, boolean, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const mentorStudentAssignmentsTable = pgTable("mentor_student_assignments", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => usersTable.id),
  studentId: integer("student_id").notNull().references(() => usersTable.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export type MentorStudentAssignment = typeof mentorStudentAssignmentsTable.$inferSelect;
export type InsertMentorStudentAssignment = typeof mentorStudentAssignmentsTable.$inferInsert;
