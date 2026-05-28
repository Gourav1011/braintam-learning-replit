import { pgTable, serial, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subjectId: integer("subject_id").notNull(),
  grade: integer("grade").notNull(),
  courseId: integer("course_id"),
  topicId: integer("topic_id"),
  teacherId: integer("teacher_id"),
  dueDate: timestamp("due_date").notNull(),
  deadlineDate: timestamp("deadline_date"),
  description: text("description"),
  maxMarks: real("max_marks").notNull().default(20),
  attachmentUrl: text("attachment_url"),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assignmentSubmissionsTable = pgTable("assignment_submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  studentId: integer("student_id").notNull(),
  answer: text("answer").notNull(),
  attachmentUrl: text("attachment_url"),
  status: text("status").notNull().default("submitted"),
  marks: real("marks"),
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({ id: true, createdAt: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;
