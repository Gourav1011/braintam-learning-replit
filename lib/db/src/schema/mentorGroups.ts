import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mentorGroupsTable = pgTable("mentor_groups", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id"),
  sessionId: integer("session_id"),
  mentorId: integer("mentor_id"),
  mentorName: text("mentor_name").notNull(),
  groupName: text("group_name").notNull(),
  programType: text("program_type").notNull().default("demo"), // ignite | mastery | demo
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupStudentsTable = pgTable("group_students", {
  id: serial("id").primaryKey(),
  mentorGroupId: integer("mentor_group_id").notNull(),
  studentId: text("student_id").notNull(), // Clerk user ID or any unique identifier
  studentName: text("student_name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique("group_student_unique").on(t.mentorGroupId, t.studentId)]);

export const insertMentorGroupSchema = createInsertSchema(mentorGroupsTable).omit({ id: true, createdAt: true });
export const insertGroupStudentSchema = createInsertSchema(groupStudentsTable).omit({ id: true, createdAt: true });
export type InsertMentorGroup = z.infer<typeof insertMentorGroupSchema>;
export type InsertGroupStudent = z.infer<typeof insertGroupStudentSchema>;
export type MentorGroup = typeof mentorGroupsTable.$inferSelect;
export type GroupStudent = typeof groupStudentsTable.$inferSelect;
