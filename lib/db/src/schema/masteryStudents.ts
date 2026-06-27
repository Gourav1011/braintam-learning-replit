import { pgTable, serial, integer, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const masteryStudentsTable = pgTable("mastery_students", {
  id:               serial("id").primaryKey(),
  igniteLeadId:     integer("ignite_lead_id"),
  studentId:        integer("student_id"),
  studentName:      text("student_name").notNull(),
  parentName:       text("parent_name"),
  phone:            text("phone").notNull(),
  alternatePhone:   text("alternate_phone"),
  email:            text("email"),
  grade:            integer("grade").notNull(),
  board:            text("board"),
  coursePlan:       text("course_plan"),
  courseDuration:   text("course_duration"),
  amountPaid:       integer("amount_paid").notNull().default(0),
  amountPending:    integer("amount_pending").notNull().default(0),
  paymentStatus:    text("payment_status").notNull().default("pending"),
  mentorId:         integer("mentor_id"),
  mentorName:       text("mentor_name"),
  academicYear:     text("academic_year"),
  admissionDate:    timestamp("admission_date", { withTimezone: true }).defaultNow().notNull(),
  source:           text("source").notNull().default("Ignite Conversion"),
  masteryStatus:    text("mastery_status").notNull().default("Active"),
  isNewAdmission:   boolean("is_new_admission").notNull().default(true),
  renewalDueDate:   timestamp("renewal_due_date", { withTimezone: true }),
  renewedAt:        timestamp("renewed_at", { withTimezone: true }),
  promotedGrade:    integer("promoted_grade"),
  notes:            text("notes"),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("ms_student_id_idx").on(t.studentId),
  index("ms_ignite_lead_id_idx").on(t.igniteLeadId),
  index("ms_mastery_status_idx").on(t.masteryStatus),
  index("ms_mentor_id_idx").on(t.mentorId),
  index("ms_admission_date_idx").on(t.admissionDate),
]);

export const insertMasteryStudentSchema = createInsertSchema(masteryStudentsTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMasteryStudent = z.infer<typeof insertMasteryStudentSchema>;
export type MasteryStudent = typeof masteryStudentsTable.$inferSelect;
