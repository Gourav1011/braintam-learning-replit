import { pgTable, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  liveClassId: integer("live_class_id").notNull(),
  studentId: integer("student_id").notNull(),
  present: boolean("present").notNull().default(true),
  markedAt: timestamp("marked_at").defaultNow().notNull(),
});

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, markedAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
