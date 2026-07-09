import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teacherCoursesTable = pgTable("teacher_courses", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  courseId: integer("course_id").notNull(),
  // Nullable: null = teacher assigned to the whole course (legacy rows / whole-course assignment).
  // Set = teacher is the Subject Teacher for this specific course_subject only.
  courseSubjectId: integer("course_subject_id"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (t) => [unique().on(t.teacherId, t.courseId, t.courseSubjectId)]);

export const insertTeacherCourseSchema = createInsertSchema(teacherCoursesTable).omit({ id: true, assignedAt: true });
export type InsertTeacherCourse = z.infer<typeof insertTeacherCourseSchema>;
export type TeacherCourse = typeof teacherCoursesTable.$inferSelect;
