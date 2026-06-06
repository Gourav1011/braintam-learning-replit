import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { liveClassesTable } from "./liveClasses";

export const mentorAttendanceTable = pgTable("mentor_attendance", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => usersTable.id),
  studentId: integer("student_id").notNull().references(() => usersTable.id),
  liveClassId: integer("live_class_id").references(() => liveClassesTable.id),
  attendanceDate: text("attendance_date").notNull(),
  status: text("status").notNull().default("unknown"),
  callStatus: text("call_status"),
  callTime: text("call_time"),
  calledBy: text("called_by"),
  calledByName: text("called_by_name"),
  remark: text("remark"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MentorAttendance = typeof mentorAttendanceTable.$inferSelect;
export type InsertMentorAttendance = typeof mentorAttendanceTable.$inferInsert;
