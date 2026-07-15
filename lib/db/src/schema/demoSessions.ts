import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const demoSessionsTable = pgTable("demo_sessions", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dayNumber: integer("day_number").notNull().default(1),
  subject: text("subject"),
  teacherId: integer("teacher_id"),
  teacherName: text("teacher_name"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60),
  joinUrl: text("join_url"),

  // PDF/presentation uploaded for this auto-generated Ignite session.
  // The classroom loads this file automatically for teacher and students.
  slideUrl: text("slide_url"),

  recordingUrl: text("recording_url"),
  homeworkText: text("homework_text"),
  homeworkLink: text("homework_link"),
  bannerUrl: text("banner_url"),
  status: text("status").notNull().default("scheduled"),

  // Actual classroom timing.
  // startedAt is saved when the teacher starts the class.
  // endedAt is saved when the teacher ends the class.
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),

  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDemoSessionSchema = createInsertSchema(demoSessionsTable).omit({ id: true, createdAt: true });
export type InsertDemoSession = z.infer<typeof insertDemoSessionSchema>;
export type DemoSession = typeof demoSessionsTable.$inferSelect;
