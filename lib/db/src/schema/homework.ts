import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const homeworkTable = pgTable("homework", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subjectId: integer("subject_id").notNull(),
  grade: integer("grade").notNull(),
  dueDate: timestamp("due_date").notNull(),
  description: text("description"),
  maxMarks: real("max_marks").notNull().default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const homeworkSubmissionsTable = pgTable("homework_submissions", {
  id: serial("id").primaryKey(),
  homeworkId: integer("homework_id").notNull(),
  studentId: integer("student_id").notNull(),
  answer: text("answer").notNull(),
  attachmentUrl: text("attachment_url"),
  status: text("status").notNull().default("submitted"),
  marks: real("marks"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertHomeworkSchema = createInsertSchema(homeworkTable).omit({ id: true, createdAt: true });
export type InsertHomework = z.infer<typeof insertHomeworkSchema>;
export type Homework = typeof homeworkTable.$inferSelect;
