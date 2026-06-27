import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blockedWordsTable = pgTable("blocked_words", {
  id:        serial("id").primaryKey(),
  word:      text("word").notNull().unique(),
  isActive:  boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBlockedWordSchema = createInsertSchema(blockedWordsTable).omit({ id: true, createdAt: true });
export type InsertBlockedWord = z.infer<typeof insertBlockedWordSchema>;
export type BlockedWord = typeof blockedWordsTable.$inferSelect;
