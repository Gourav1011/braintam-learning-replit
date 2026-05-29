import { pgTable, serial, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subjectId: integer("subject_id"),
  grade: integer("grade").notNull(),
  board: text("board"),
  academicYearId: integer("academic_year_id"),
  totalLessons: integer("total_lessons").notNull().default(0),
  thumbnailUrl: text("thumbnail_url").notNull(),
  description: text("description"),
  teacher: text("teacher"),
  rating: real("rating"),
  isPublished: boolean("is_published").notNull().default(true),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  duration: integer("duration").notNull(),
  order: integer("order").notNull(),
  videoUrl: text("video_url"),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
