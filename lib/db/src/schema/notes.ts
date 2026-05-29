import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const topicNotesTable = pgTable("topic_notes", {
  id:           serial("id").primaryKey(),
  title:        text("title").notNull(),
  resourceType: text("resource_type").notNull().default("pdf"),
  url:          text("url").notNull(),
  description:  text("description"),
  topicId:      integer("topic_id"),
  chapterId:    integer("chapter_id"),
  courseId:     integer("course_id"),
  teacherId:    integer("teacher_id"),
  grade:        integer("grade"),
  isPublished:  boolean("is_published").notNull().default(true),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export const insertTopicNoteSchema = createInsertSchema(topicNotesTable).omit({ id: true, createdAt: true });
export type InsertTopicNote = z.infer<typeof insertTopicNoteSchema>;
export type TopicNote = typeof topicNotesTable.$inferSelect;
