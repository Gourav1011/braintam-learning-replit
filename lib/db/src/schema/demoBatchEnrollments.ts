import { pgTable, serial, integer, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const demoBatchEnrollmentsTable = pgTable("demo_batch_enrollments", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull(),
  studentId: integer("student_id").notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  enrollmentStatus: text("enrollment_status").notNull().default("active"),
  lastDayAttended: integer("last_day_attended").default(0),
  assignedMentorId: integer("assigned_mentor_id"),
  assignedMentorName: text("assigned_mentor_name"),
});

export const insertDemoBatchEnrollmentSchema = createInsertSchema(demoBatchEnrollmentsTable).omit({
  id: true,
  enrolledAt: true,
});
export type InsertDemoBatchEnrollment = z.infer<typeof insertDemoBatchEnrollmentSchema>;
export type DemoBatchEnrollment = typeof demoBatchEnrollmentsTable.$inferSelect;
