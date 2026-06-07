import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const employeeCheckinsTable = pgTable("employee_checkins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  checkDate: text("check_date").notNull(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  device: text("device"),
  browser: text("browser"),
  workSummary: text("work_summary"),
  challenges: text("challenges"),
  pendingTasks: text("pending_tasks"),
  tomorrowPriorities: text("tomorrow_priorities"),
  studentsContacted: integer("students_contacted").default(0),
  callsCompleted: integer("calls_completed").default(0),
  followUpsCompleted: integer("follow_ups_completed").default(0),
  doubtSessionsConducted: integer("doubt_sessions_conducted").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EmployeeCheckin = typeof employeeCheckinsTable.$inferSelect;
export type InsertEmployeeCheckin = typeof employeeCheckinsTable.$inferInsert;
