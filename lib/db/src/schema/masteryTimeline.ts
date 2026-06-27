import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const masteryTimelineTable = pgTable("mastery_timeline", {
  id:                 serial("id").primaryKey(),
  masteryStudentId:   integer("mastery_student_id").notNull(),
  eventType:          text("event_type").notNull(),
  eventLabel:         text("event_label").notNull(),
  eventData:          text("event_data"),
  actorId:            integer("actor_id"),
  actorName:          text("actor_name"),
  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("mt_mastery_student_id_idx").on(t.masteryStudentId),
  index("mt_created_at_idx").on(t.createdAt),
]);

export const insertMasteryTimelineSchema = createInsertSchema(masteryTimelineTable)
  .omit({ id: true, createdAt: true });
export type InsertMasteryTimeline = z.infer<typeof insertMasteryTimelineSchema>;
export type MasteryTimeline = typeof masteryTimelineTable.$inferSelect;
