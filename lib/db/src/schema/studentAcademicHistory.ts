import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentAcademicHistoryTable = pgTable("student_academic_history", {
  id:               serial("id").primaryKey(),
  masteryStudentId: integer("mastery_student_id").notNull(),
  studentName:      text("student_name"),
  academicYear:     text("academic_year").notNull(),
  grade:            integer("grade").notNull(),
  mentorId:         integer("mentor_id"),
  mentorName:       text("mentor_name"),
  status:           text("status").notNull().default("Active"),
  promotionDate:    timestamp("promotion_date", { withTimezone: true }),
  amountPaid:       integer("amount_paid"),
  coursePlan:       text("course_plan"),
  notes:            text("notes"),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("sah_mastery_student_id_idx").on(t.masteryStudentId),
  index("sah_academic_year_idx").on(t.academicYear),
  index("sah_grade_idx").on(t.grade),
]);

export const insertStudentAcademicHistorySchema = createInsertSchema(studentAcademicHistoryTable)
  .omit({ id: true, createdAt: true });
export type InsertStudentAcademicHistory = z.infer<typeof insertStudentAcademicHistorySchema>;
export type StudentAcademicHistory = typeof studentAcademicHistoryTable.$inferSelect;
