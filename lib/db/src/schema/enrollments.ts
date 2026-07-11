import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const enrollmentsTable = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  courseId: integer("course_id").notNull(),
  batchId: integer("batch_id"),
  enrolledBy: integer("enrolled_by"),
  enrollmentType: text("enrollment_type").notNull().default("mastery"),
  academicYear: text("academic_year"),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  // Lifecycle status: 'active' | 'completed' | 'archived'
  // Never delete — mark completed when a student finishes or moves to a new grade.
  status: text("status").notNull().default("active"),
  completedAt: timestamp("completed_at"),
  completionNote: text("completion_note"),
}, (t) => [unique().on(t.studentId, t.courseId)]);

export const insertEnrollmentSchema = createInsertSchema(enrollmentsTable).omit({ id: true, enrolledAt: true });
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollmentsTable.$inferSelect;
