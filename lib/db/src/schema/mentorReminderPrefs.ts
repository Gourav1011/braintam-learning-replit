import { pgTable, serial, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const mentorReminderPrefsTable = pgTable("mentor_reminder_prefs", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  remindersEnabled: boolean("reminders_enabled").notNull().default(true),
  digestMode: boolean("digest_mode").notNull().default(true),
  digestTime: text("digest_time").notNull().default("09:00"),
  lastReminderSentDate: text("last_reminder_sent_date"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MentorReminderPrefs = typeof mentorReminderPrefsTable.$inferSelect;
export type InsertMentorReminderPrefs = typeof mentorReminderPrefsTable.$inferInsert;
