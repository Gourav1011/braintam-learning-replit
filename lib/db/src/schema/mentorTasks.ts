import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const mentorTasksTable = pgTable("mentor_tasks", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => usersTable.id),
  studentId: integer("student_id").references(() => usersTable.id),
  title: text("title").notNull(),
  taskType: text("task_type").notNull().default("general"),
  status: text("status").notNull().default("pending"),
  dueDate: text("due_date"),
  completedAt: timestamp("completed_at"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MentorTask = typeof mentorTasksTable.$inferSelect;
export type InsertMentorTask = typeof mentorTasksTable.$inferInsert;
