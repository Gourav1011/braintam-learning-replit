import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const mentorGradeAssignmentsTable = pgTable("mentor_grade_assignments", {
  grade: integer("grade").primaryKey(),
  mentorId: integer("mentor_id"),
  mentorName: text("mentor_name"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
