import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const liveClassesTable = pgTable("live_classes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subjectId: integer("subject_id").notNull(),
  grade: integer("grade").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60),
  teacher: text("teacher").notNull(),
  teacherAvatar: text("teacher_avatar"),
  status: text("status").notNull().default("upcoming"),
  thumbnailUrl: text("thumbnail_url"),
  studentsJoined: integer("students_joined").default(0),
  joinUrl: text("join_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLiveClassSchema = createInsertSchema(liveClassesTable).omit({ id: true, createdAt: true });
export type InsertLiveClass = z.infer<typeof insertLiveClassSchema>;
export type LiveClass = typeof liveClassesTable.$inferSelect;
