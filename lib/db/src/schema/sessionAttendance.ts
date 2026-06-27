import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Status is NEVER stored — it is always derived:
//   ABSENT    → joined_at IS NULL
//   LIVE      → last_seen_at within 15 seconds of now
//   BACKSTAGE → joined_at IS NOT NULL AND last_seen_at > 15 seconds ago
export const sessionAttendanceTable = pgTable("session_attendance", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  studentId: text("student_id").notNull(),
  studentName: text("student_name").notNull(),
  mentorGroupId: integer("mentor_group_id"),
  role: text("role").notNull().default("student"),
  joinedAt: timestamp("joined_at"),
  lastSeenAt: timestamp("last_seen_at"),
  leftAt: timestamp("left_at"),
  totalDurationSeconds: integer("total_duration_seconds").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique("session_student_unique").on(t.sessionId, t.studentId)]);

export const insertSessionAttendanceSchema = createInsertSchema(sessionAttendanceTable).omit({ id: true, createdAt: true });
export type InsertSessionAttendance = z.infer<typeof insertSessionAttendanceSchema>;
export type SessionAttendance = typeof sessionAttendanceTable.$inferSelect;
