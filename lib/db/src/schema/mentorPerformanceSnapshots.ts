import { pgTable, serial, integer, text, real, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Permanent snapshot store for Ignite mentor performance rankings.
 * Period types: "weekly" | "monthly" | "yearly"
 * Period keys:  "2026-W24" | "2026-06" | "2026"
 * Snapshots are never deleted — ex-employee records are kept forever.
 */
export const mentorPerformanceSnapshotsTable = pgTable("mentor_performance_snapshots", {
  id:                  serial("id").primaryKey(),
  periodType:          text("period_type").notNull(),          // weekly | monthly | yearly
  periodKey:           text("period_key").notNull(),           // e.g. 2026-W24 | 2026-06 | 2026
  periodLabel:         text("period_label"),                   // e.g. "Week 24, 2026"
  mentorId:            integer("mentor_id").notNull(),
  mentorName:          text("mentor_name").notNull(),
  mentorEmail:         text("mentor_email"),
  isActive:            text("is_active").notNull().default("active"), // active | inactive
  assignedLeads:       integer("assigned_leads").notNull().default(0),
  successfulCalls:     integer("successful_calls").notNull().default(0),
  pendingCalls:        integer("pending_calls").notNull().default(0),
  noResponseLeads:     integer("no_response_leads").notNull().default(0),
  demoAttendancePct:   real("demo_attendance_pct").notNull().default(0),
  homeworkCompletionPct: real("homework_completion_pct").notNull().default(0),
  successfulPayments:  integer("successful_payments").notNull().default(0),
  conversionPct:       real("conversion_pct").notNull().default(0),
  nonActiveLeads:      integer("non_active_leads").notNull().default(0),
  rank:                integer("rank").notNull().default(0),
  snapshotNote:        text("snapshot_note"),
  savedById:           integer("saved_by_id"),
  savedByName:         text("saved_by_name"),
  createdAt:           timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("mps_period_type_idx").on(t.periodType),
  index("mps_period_key_idx").on(t.periodKey),
  index("mps_mentor_id_idx").on(t.mentorId),
  unique("mps_period_mentor_unique").on(t.periodType, t.periodKey, t.mentorId),
]);

export const insertMentorPerformanceSnapshotSchema = createInsertSchema(mentorPerformanceSnapshotsTable)
  .omit({ id: true, createdAt: true });
export type InsertMentorPerformanceSnapshot = z.infer<typeof insertMentorPerformanceSnapshotSchema>;
export type MentorPerformanceSnapshot = typeof mentorPerformanceSnapshotsTable.$inferSelect;
