import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chaptersTable = pgTable("chapters", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id"),
  grade: integer("grade").notNull(),
  courseId: integer("course_id"),
  courseSubjectId: integer("course_subject_id"),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  sequenceNo: integer("sequence_no"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChapterSchema = createInsertSchema(chaptersTable).omit({ id: true, createdAt: true });
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type Chapter = typeof chaptersTable.$inferSelect;
