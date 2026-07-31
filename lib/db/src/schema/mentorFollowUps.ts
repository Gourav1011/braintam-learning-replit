import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { mentorDeploymentCyclesTable } from "./mentorDeploymentCycles";

export const mentorFollowUpsTable = pgTable("mentor_follow_ups", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => usersTable.id),
  deploymentCycleId: integer("deployment_cycle_id").references(() => mentorDeploymentCyclesTable.id),
  studentId: integer("student_id").notNull().references(() => usersTable.id),
  noteType: text("note_type").notNull().default("general"),
  note: text("note").notNull(),
  callStatus: text("call_status"),
  whoPicked: text("who_picked"),           // Father | Mother | Student | Guardian | Other
  contactOutcome: text("contact_outcome"), // Interested | Not Interested | Need Callback | Demo Explained | Class Details Shared
  callTime: text("call_time"),
  calledBy: text("called_by"),
  calledByName: text("called_by_name"),
  leadStatus: text("lead_status"),
  nextFollowUpDate: text("next_follow_up_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mentorFollowUpEditsTable = pgTable("mentor_follow_up_edits", {
  id: serial("id").primaryKey(),
  followUpId: integer("follow_up_id").notNull().references(() => mentorFollowUpsTable.id, { onDelete: "cascade" }),
  editedById: integer("edited_by_id").notNull(),
  editedByName: text("edited_by_name").notNull(),
  editedByRole: text("edited_by_role").notNull().default("mentor"),
  previousNote: text("previous_note"),
  editRemark: text("edit_remark").notNull(),
  editedAt: timestamp("edited_at").defaultNow().notNull(),
});

export type MentorFollowUp = typeof mentorFollowUpsTable.$inferSelect;
export type InsertMentorFollowUp = typeof mentorFollowUpsTable.$inferInsert;
export type MentorFollowUpEdit = typeof mentorFollowUpEditsTable.$inferSelect;
