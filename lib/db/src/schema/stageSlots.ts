import { pgTable, serial, text, integer, boolean, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stageSlotStatusEnum = pgEnum("stage_slot_status", ["invited", "active", "muted"]);

export const stageSlotsTable = pgTable(
  "session_stage_slots",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    studentId: text("student_id").notNull(),
    studentName: text("student_name").notNull(),
    mentorGroupId: text("mentor_group_id"),
    slotNumber: integer("slot_number").notNull(),
    status: stageSlotStatusEnum("status").default("invited").notNull(),
    isMuted: boolean("is_muted").default(true).notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("idx_stage_session_slot").on(t.sessionId, t.slotNumber),
    uniqueIndex("idx_stage_session_student").on(t.sessionId, t.studentId),
  ],
);

export const insertStageSlotSchema = createInsertSchema(stageSlotsTable).omit({ id: true, joinedAt: true });
export type InsertStageSlot = z.infer<typeof insertStageSlotSchema>;
export type StageSlot = typeof stageSlotsTable.$inferSelect;
