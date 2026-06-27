import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const achievementTickersTable = pgTable("achievement_tickers", {
  id:               serial("id").primaryKey(),
  mentorId:         integer("mentor_id").notNull(),
  mentorName:       text("mentor_name").notNull(),
  studentName:      text("student_name"),
  masteryStudentId: integer("mastery_student_id"),
  amount:           integer("amount"),
  eventSource:      text("event_source").notNull().default("admin_approval"),
  isShown:          boolean("is_shown").notNull().default(false),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("at_mentor_id_idx").on(t.mentorId),
  index("at_is_shown_idx").on(t.isShown),
  index("at_created_at_idx").on(t.createdAt),
]);

export const insertAchievementTickerSchema = createInsertSchema(achievementTickersTable)
  .omit({ id: true, createdAt: true });
export type InsertAchievementTicker = z.infer<typeof insertAchievementTickerSchema>;
export type AchievementTicker = typeof achievementTickersTable.$inferSelect;
