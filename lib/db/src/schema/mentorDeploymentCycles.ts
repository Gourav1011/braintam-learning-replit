import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const mentorDeploymentCyclesTable = pgTable("mentor_deployment_cycles", {
  id: serial("id").primaryKey(),
  weekLabel: text("week_label").notNull(),            // e.g. "Week 24 – Jun 2025"
  startDate: text("start_date").notNull(),             // ISO date "2025-06-23"
  status: text("status").notNull().default("active"),  // "active" | "archived"
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  archivedAt: timestamp("archived_at"),
});

export type MentorDeploymentCycle = typeof mentorDeploymentCyclesTable.$inferSelect;
export type InsertMentorDeploymentCycle = typeof mentorDeploymentCyclesTable.$inferInsert;
