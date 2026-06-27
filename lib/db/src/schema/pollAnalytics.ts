import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pollAnalyticsTable = pgTable("poll_analytics", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  pollId: text("poll_id").notNull(),
  pollQuestion: text("poll_question").notNull(),
  correctOptionId: text("correct_option_id"),       // which option the teacher marked correct
  studentId: text("student_id").notNull(),
  studentName: text("student_name").notNull(),
  mentorGroupId: integer("mentor_group_id"),         // ← Sprint 1 addition
  optionId: text("option_id").notNull(),
  optionText: text("option_text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false), // ← Sprint 1 addition
  responseTimeMs: integer("response_time_ms"),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
});

export const leaderboardAnalyticsTable = pgTable("leaderboard_analytics", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  pollId: text("poll_id").notNull(),
  rank: integer("rank").notNull(),
  studentId: text("student_id").notNull(),
  studentName: text("student_name").notNull(),
  mentorGroupId: integer("mentor_group_id"),         // ← Sprint 1 addition
  optionId: text("option_id").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  responseTimeMs: integer("response_time_ms"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export const insertPollAnalyticsSchema = createInsertSchema(pollAnalyticsTable).omit({ id: true });
export const insertLeaderboardAnalyticsSchema = createInsertSchema(leaderboardAnalyticsTable).omit({ id: true });
export type InsertPollAnalytics = z.infer<typeof insertPollAnalyticsSchema>;
export type InsertLeaderboardAnalytics = z.infer<typeof insertLeaderboardAnalyticsSchema>;
export type PollAnalytics = typeof pollAnalyticsTable.$inferSelect;
export type LeaderboardAnalytics = typeof leaderboardAnalyticsTable.$inferSelect;
