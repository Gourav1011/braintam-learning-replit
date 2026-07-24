import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const liveClassesTable = pgTable("live_classes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subjectId: integer("subject_id"),
  grade: integer("grade").notNull(),

  // Links the live class to the selected course/batch.
  // Required by Teacher Portal and existing production data.
  batchId: integer("batch_id"),

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
  slideUrl: text("slide_url"),
  isPublished: boolean("is_published").notNull().default(true),
  isArchived: boolean("is_archived").notNull().default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: integer("archived_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),

  // ── Unified classroom engine (Approach B migration) ──────────────────────────
  //
  // classType distinguishes the business program this classroom belongs to.
  // All existing rows default to 'mastery'. New Ignite sessions are written
  // here directly instead of demo_sessions, with classType = 'ignite'.
  // Future types: 'revision' | 'competition' | 'ptm' etc.
  classType: text("class_type").notNull().default("mastery"),

  // For Ignite sessions: FK back to demo_batches so the scheduling container
  // (grade, subject, week, mentor, batch code) is still accessible.
  // Null for all Mastery / non-Ignite sessions.
  igniteBatchId: integer("ignite_batch_id"),

  // Day number within an Ignite batch (1–5). Null for Mastery sessions.
  dayNumber: integer("day_number"),

  // Ignite-specific post-class content. Stored as columns (same pattern as
  // demo_sessions) so no schema join is needed to display them in the portal.
  homeworkText: text("homework_text"),
  homeworkLink: text("homework_link"),
  recordingUrl: text("recording_url"),
});

export const insertLiveClassSchema = createInsertSchema(liveClassesTable).omit({ id: true, createdAt: true });
export type InsertLiveClass = z.infer<typeof insertLiveClassSchema>;
export type LiveClass = typeof liveClassesTable.$inferSelect;
