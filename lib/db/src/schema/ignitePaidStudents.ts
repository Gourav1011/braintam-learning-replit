import { pgTable, serial, integer, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ignitePaidStudentsTable = pgTable("ignite_paid_students", {
  id:                 serial("id").primaryKey(),
  studentId:          integer("student_id").notNull(),
  paymentId:          integer("payment_id").notNull(),
  grade:              integer("grade").notNull(),
  phone:              text("phone").notNull(),
  amountPaise:        integer("amount_paise").notNull(),
  paidAt:             timestamp("paid_at").notNull(),
  assignmentStatus:   text("assignment_status").notNull().default("unassigned"),
  assignedBatchId:    integer("assigned_batch_id"),
  assignedMentorId:   integer("assigned_mentor_id"),
  assignedMentorName: text("assigned_mentor_name"),
  assignedById:       integer("assigned_by_id"),
  assignedAt:         timestamp("assigned_at"),
  notes:              text("notes"),
  courseType:         text("course_type").notNull().default("ignite"),
  leadSource:         text("lead_source"),
  // batch_assigned stage
  batchName:          text("batch_name"),
  batchStartDate:     timestamp("batch_start_date"),
  teacherName:        text("teacher_name"),
  assignedByName:     text("assigned_by_name"),
  // demo_started / demo_completed stage
  demoStartDate:      timestamp("demo_start_date"),
  attendancePct:      integer("attendance_pct"),
  classesAttended:    integer("classes_attended"),
  homeworkPct:        integer("homework_pct"),
  // demo_completed stage
  completionDate:     timestamp("completion_date"),
  conversionRecommendation: text("conversion_recommendation"),
  // converted stage
  convertedDate:      timestamp("converted_date"),
  coursePurchased:    text("course_purchased"),
  courseValue:        integer("course_value"),
  convertedBy:        text("converted_by"),
  // dropped stage
  droppedDate:        timestamp("dropped_date"),
  dropReason:         text("drop_reason"),
  createdAt:          timestamp("created_at").defaultNow().notNull(),
  updatedAt:          timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  unique().on(t.studentId, t.paymentId),
  index("ips_student_id_idx").on(t.studentId),
  index("ips_assignment_status_idx").on(t.assignmentStatus),
  index("ips_paid_at_idx").on(t.paidAt),
  index("ips_assigned_mentor_id_idx").on(t.assignedMentorId),
]);

export const insertIgnitePaidStudentSchema = createInsertSchema(ignitePaidStudentsTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIgnitePaidStudent = z.infer<typeof insertIgnitePaidStudentSchema>;
export type IgnitePaidStudent = typeof ignitePaidStudentsTable.$inferSelect;
