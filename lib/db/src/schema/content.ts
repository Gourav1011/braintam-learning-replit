import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentTypeEnum = pgEnum("content_type", [
  "LIVE_CLASS",
  "HOMEWORK",
  "RECORDING",
  "TEST",
  "ASSIGNMENT",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "UPCOMING",
  "LIVE",
  "COMPLETED",
  "RECORDING_AVAILABLE",
]);

/**
 * Unified Content Table
 * Single source of truth for all content types in the hierarchy:
 *   Course → Subject → Chapter → Topic → Content
 *
 * Each row represents one content item (live class, homework, test, etc.)
 * linked to a topic (and optionally up the chain to chapter/course/subject).
 */
export const contentTable = pgTable("content", {
  id: serial("id").primaryKey(),

  title: text("title").notNull(),
  description: text("description"),

  contentType:   contentTypeEnum("content_type").notNull(),
  contentStatus: contentStatusEnum("content_status").notNull().default("UPCOMING"),

  // ── Hierarchy links ────────────────────────────────────────────
  topicId:   integer("topic_id"),    // primary hierarchy anchor
  chapterId: integer("chapter_id"),
  courseId:  integer("course_id"),
  subjectId: integer("subject_id"),
  grade:     integer("grade").notNull(),

  // ── Scheduling / deadline ──────────────────────────────────────
  scheduledAt:  timestamp("scheduled_at"),   // when it goes live
  deadlineDate: timestamp("deadline_date"),  // submission cutoff (greys out after)
  duration:     integer("duration"),         // minutes

  // ── Resource links ─────────────────────────────────────────────
  joinUrl:       text("join_url"),        // LIVE_CLASS meeting link
  recordingUrl:  text("recording_url"),   // RECORDING / post-class VOD
  attachmentUrl: text("attachment_url"),  // HOMEWORK / ASSIGNMENT file

  // ── Grading ────────────────────────────────────────────────────
  maxMarks: integer("max_marks"),

  // ── Staff ──────────────────────────────────────────────────────
  teacherId: integer("teacher_id"),

  // ── Flags ──────────────────────────────────────────────────────
  isPublished: boolean("is_published").notNull().default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContentSchema = createInsertSchema(contentTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertContent = z.infer<typeof insertContentSchema>;
export type Content = typeof contentTable.$inferSelect;
