import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const masteryNotificationsTable = pgTable("mastery_notifications", {
  id:               serial("id").primaryKey(),
  mentorId:         integer("mentor_id").notNull(),
  type:             text("type").notNull(),
  title:            text("title").notNull(),
  body:             text("body").notNull(),
  masteryStudentId: integer("mastery_student_id"),
  studentName:      text("student_name"),
  amount:           integer("amount"),
  isRead:           boolean("is_read").notNull().default(false),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("mn_mentor_id_idx").on(t.mentorId),
  index("mn_is_read_idx").on(t.isRead),
  index("mn_created_at_idx").on(t.createdAt),
]);

export const insertMasteryNotificationSchema = createInsertSchema(masteryNotificationsTable)
  .omit({ id: true, createdAt: true });
export type InsertMasteryNotification = z.infer<typeof insertMasteryNotificationSchema>;
export type MasteryNotification = typeof masteryNotificationsTable.$inferSelect;
