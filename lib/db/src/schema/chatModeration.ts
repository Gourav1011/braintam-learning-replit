import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Per-student chat moderation state — keyed by the socket/Clerk userId string
export const chatModerationTable = pgTable("chat_moderation", {
  id:                  serial("id").primaryKey(),
  studentId:           text("student_id").notNull().unique(),
  studentName:         text("student_name").notNull(),
  phone:               text("phone"),                                       // nullable — set when known from socket
  chatStatus:          text("chat_status").notNull().default("active"),    // 'active' | 'blocked'
  chatViolationCount:  integer("chat_violation_count").notNull().default(0),
  chatBlockedAt:       timestamp("chat_blocked_at"),
  chatBlockReason:     text("chat_block_reason"),
  updatedAt:           timestamp("updated_at").defaultNow().notNull(),
});

export const insertChatModerationSchema = createInsertSchema(chatModerationTable).omit({ id: true });
export type InsertChatModeration = z.infer<typeof insertChatModerationSchema>;
export type ChatModeration = typeof chatModerationTable.$inferSelect;
