import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const demoBatchesTable = pgTable("demo_batches", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  teacherId: integer("teacher_id"),
  teacherName: text("teacher_name"),
  bannerUrl: text("banner_url"),
  joinLink: text("join_link"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default("upcoming"),
  isActive: boolean("is_active").notNull().default(true),
  isPublic: boolean("is_public").notNull().default(true),
  grade: integer("grade"),
  subject: text("subject"),
  totalDays: integer("total_days").notNull().default(5),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDemoBatchSchema = createInsertSchema(demoBatchesTable).omit({ id: true, createdAt: true });
export type InsertDemoBatch = z.infer<typeof insertDemoBatchSchema>;
export type DemoBatch = typeof demoBatchesTable.$inferSelect;
