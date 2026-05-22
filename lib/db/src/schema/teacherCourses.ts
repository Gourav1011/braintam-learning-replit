import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teacherCoursesTable = pgTable("teacher_courses", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  courseId: integer("course_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (t) => [unique().on(t.teacherId, t.courseId)]);

export const insertTeacherCourseSchema = createInsertSchema(teacherCoursesTable).omit({ id: true, assignedAt: true });
export type InsertTeacherCourse = z.infer<typeof insertTeacherCourseSchema>;
export type TeacherCourse = typeof teacherCoursesTable.$inferSelect;
