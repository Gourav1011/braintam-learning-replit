import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const doubtSessionsTable = pgTable("doubt_sessions", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  studentIds: text("student_ids").notNull().default("[]"),
  studentNames: text("student_names").notNull().default("[]"),
  scheduledDate: text("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  duration: integer("duration").notNull().default(60),
  platform: text("platform").notNull().default("Google Meet"),
  meetingLink: text("meeting_link"),
  topic: text("topic"),
  remarks: text("remarks"),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DoubtSession = typeof doubtSessionsTable.$inferSelect;
export type InsertDoubtSession = typeof doubtSessionsTable.$inferInsert;
