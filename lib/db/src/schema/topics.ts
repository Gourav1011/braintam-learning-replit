import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  learningObjective: text("learning_objective"),
  topicStatus: text("topic_status").notNull().default("active"),
  order: integer("order").notNull().default(0),
  sequenceNo: integer("sequence_no"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTopicSchema = createInsertSchema(topicsTable).omit({ id: true, createdAt: true });
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topicsTable.$inferSelect;
