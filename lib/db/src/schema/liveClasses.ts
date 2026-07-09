import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const liveClassesTable = pgTable("live_classes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subjectId: integer("subject_id"),
  grade: integer("grade").notNull(),
  courseId: integer("course_id"),
  courseSubjectId: integer("course_subject_id"),
  chapterId: integer("chapter_id"),
  topicId: integer("topic_id"),
  teacherId: integer("teacher_id"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60),
  teacher: text("teacher").notNull(),
  teacherAvatar: text("teacher_avatar"),
  status: text("status").notNull().default("upcoming"),
  thumbnailUrl: text("thumbnail_url"),
  studentsJoined: integer("students_joined").default(0),
  joinUrl: text("join_url"),
  liveKitRoomName: text("livekit_room_name").unique(),
  isPublished: boolean("is_published").notNull().default(true),
  isArchived: boolean("is_archived").notNull().default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: integer("archived_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLiveClassSchema = createInsertSchema(liveClassesTable).omit({ id: true, createdAt: true });
export type InsertLiveClass = z.infer<typeof insertLiveClassSchema>;
export type LiveClass = typeof liveClassesTable.$inferSelect;
