import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const courseSubjectsTable = pgTable("course_subjects", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCourseSubjectSchema = createInsertSchema(courseSubjectsTable).omit({ id: true, createdAt: true });
export type InsertCourseSubject = z.infer<typeof insertCourseSubjectSchema>;
export type CourseSubject = typeof courseSubjectsTable.$inferSelect;
