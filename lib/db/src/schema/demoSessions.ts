import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const demoSessionsTable = pgTable("demo_sessions", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dayNumber: integer("day_number").notNull().default(1),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60),
  joinUrl: text("join_url"),
  recordingUrl: text("recording_url"),
  homeworkText: text("homework_text"),
  bannerUrl: text("banner_url"),
  status: text("status").notNull().default("upcoming"),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDemoSessionSchema = createInsertSchema(demoSessionsTable).omit({ id: true, createdAt: true });
export type InsertDemoSession = z.infer<typeof insertDemoSessionSchema>;
export type DemoSession = typeof demoSessionsTable.$inferSelect;
