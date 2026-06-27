import { pgTable, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { mentorDeploymentCyclesTable } from "./mentorDeploymentCycles";

export const mentorStudentAssignmentsTable = pgTable("mentor_student_assignments", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => usersTable.id),
  studentId: integer("student_id").notNull().references(() => usersTable.id),
  deploymentCycleId: integer("deployment_cycle_id").references(() => mentorDeploymentCyclesTable.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export type MentorStudentAssignment = typeof mentorStudentAssignmentsTable.$inferSelect;
export type InsertMentorStudentAssignment = typeof mentorStudentAssignmentsTable.$inferInsert;
