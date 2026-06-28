import { pgTable, serial, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";

export const gradeMentorAssignmentsTable = pgTable("grade_mentor_assignments", {
  id: serial("id").primaryKey(),
  grade: integer("grade").notNull(),
  mentorId: integer("mentor_id").notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow(),
  assignedById: integer("assigned_by_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("uq_grade_mentor").on(t.grade, t.mentorId),
]);
