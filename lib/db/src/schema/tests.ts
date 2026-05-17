import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const testsTable = pgTable("tests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subjectId: integer("subject_id").notNull(),
  grade: integer("grade").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(30),
  totalQuestions: integer("total_questions").notNull().default(10),
  status: text("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull(),
  text: text("text").notNull(),
  options: text("options").array().notNull(),
  correctOption: integer("correct_option").notNull(),
  order: integer("order").notNull(),
  imageUrl: text("image_url"),
});

export const testSubmissionsTable = pgTable("test_submissions", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull(),
  studentId: integer("student_id").notNull(),
  answers: text("answers").notNull(),
  score: real("score"),
  maxScore: real("max_score"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertTestSchema = createInsertSchema(testsTable).omit({ id: true, createdAt: true });
export type InsertTest = z.infer<typeof insertTestSchema>;
export type Test = typeof testsTable.$inferSelect;
