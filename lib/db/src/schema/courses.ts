import { pgTable, serial, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subjectId: integer("subject_id"),
  grade: integer("grade").notNull(),
  board: text("board"),
  academicYearId: integer("academic_year_id"),
  courseType: text("course_type").notNull().default("mastery"),
  totalLessons: integer("total_lessons").notNull().default(0),
  thumbnailUrl: text("thumbnail_url").notNull().default(""),
  description: text("description"),
  teacher: text("teacher"),
  rating: real("rating"),
  isPublished: boolean("is_published").notNull().default(true),
  status: text("status").notNull().default("active"),
  isArchived: boolean("is_archived").notNull().default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: integer("archived_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Extended Mastery fields
  duration: text("duration"),
  originalPrice: integer("original_price"),
  scholarshipPrice: integer("scholarship_price"),
  registrationFee: integer("registration_fee"),
  paymentPlansJson: text("payment_plans_json"),
  studentCapacity: integer("student_capacity"),
  bannerUrl: text("banner_url"),
  brochureUrl: text("brochure_url"),
  mentorIdsJson: text("mentor_ids_json"),
  // Course instance fields (supports multiple intakes per grade)
  instanceName: text("instance_name"),          // e.g. "Course A", "2026 Intake" — auto-generated, admin-editable
  admissionStatus: text("admission_status").notNull().default("active"), // 'active' | 'closed'
  // Academic schedule
  startDate: text("start_date"),
  endDate: text("end_date"),
});

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  duration: integer("duration").notNull(),
  order: integer("order").notNull(),
  videoUrl: text("video_url"),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
