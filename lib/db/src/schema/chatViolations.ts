import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chatViolationsTable = pgTable("chat_violations", {
  id:            serial("id").primaryKey(),
  studentId:     text("student_id").notNull(),
  studentName:   text("student_name").notNull(),
  sessionId:     integer("session_id"),
  mentorGroupId: integer("mentor_group_id"),
  message:       text("message").notNull(),
  matchedWord:   text("matched_word").notNull(),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export const insertChatViolationSchema = createInsertSchema(chatViolationsTable).omit({ id: true, createdAt: true });
export type InsertChatViolation = z.infer<typeof insertChatViolationSchema>;
export type ChatViolation = typeof chatViolationsTable.$inferSelect;
