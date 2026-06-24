import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const enrollmentsTable = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  courseId: integer("course_id").notNull(),
  enrolledBy: integer("enrolled_by"),
  enrollmentType: text("enrollment_type").notNull().default("mastery"),
  academicYear: text("academic_year"),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
}, (t) => [unique().on(t.studentId, t.courseId)]);

export const insertEnrollmentSchema = createInsertSchema(enrollmentsTable).omit({ id: true, enrolledAt: true });
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollmentsTable.$inferSelect;
