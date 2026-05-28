import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pointsActionTypeEnum = pgEnum("points_action_type", [
  "LOGIN",               // +2  daily login
  "CORRECT_ANSWER",      // +10 correct test/quiz answer
  "WRONG_ANSWER",        // -2  wrong answer
  "HOMEWORK_SUBMITTED",  // +5  on-time submission
  "HOMEWORK_GRADED",     // variable, set by teacher
  "TEST_COMPLETED",      // +15 finishing a test
  "TEST_PASSED",         // +25 passing score (≥60%)
  "ASSIGNMENT_SUBMITTED",// +5  on-time assignment
  "COURSE_ENROLLED",     // +3  enrolment bonus
  "DEMO_ATTENDED",       // +8  attended a demo batch session
  "STREAK_BONUS",        // +20 7-day login streak
  "PENALTY",             // negative, e.g. late submission
  "ADMIN_ADJUSTMENT",    // manual admin grant/deduct
]);

/**
 * Points Ledger — full transaction history for the gamification engine.
 *
 * Every point change (earn or deduct) is recorded as a row.
 * The current balance is the SUM(amount) for a userId.
 * This replaces the flat `points` column on the users table.
 */
export const pointsLedgerTable = pgTable("points_ledger", {
  id: serial("id").primaryKey(),

  userId:        integer("user_id").notNull(),
  amount:        integer("amount").notNull(),        // positive = earned, negative = deducted
  actionType:    pointsActionTypeEnum("action_type").notNull(),
  referenceId:   integer("reference_id"),            // e.g. homeworkId, testId, contentId
  referenceType: text("reference_type"),             // e.g. "homework", "test", "content"
  note:          text("note"),                       // human-readable reason

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPointsLedgerSchema = createInsertSchema(pointsLedgerTable).omit({
  id: true, createdAt: true,
});
export type InsertPointsLedger = z.infer<typeof insertPointsLedgerSchema>;
export type PointsLedger = typeof pointsLedgerTable.$inferSelect;
