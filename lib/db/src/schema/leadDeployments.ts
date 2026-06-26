import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const leadDeploymentsTable = pgTable("lead_deployments", {
  id:            serial("id").primaryKey(),
  grade:         integer("grade"),
  createdById:   integer("created_by_id"),
  createdByName: text("created_by_name"),
  totalLeads:    integer("total_leads").notNull().default(0),
  mentorCount:   integer("mentor_count").notNull().default(0),
  status:        text("status").notNull().default("completed"),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export const leadDeploymentGroupsTable = pgTable("lead_deployment_groups", {
  id:           serial("id").primaryKey(),
  deploymentId: integer("deployment_id").notNull(),
  mentorId:     integer("mentor_id").notNull(),
  mentorName:   text("mentor_name"),
  leadCount:    integer("lead_count").notNull().default(0),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export type LeadDeployment = typeof leadDeploymentsTable.$inferSelect;
export type LeadDeploymentGroup = typeof leadDeploymentGroupsTable.$inferSelect;
