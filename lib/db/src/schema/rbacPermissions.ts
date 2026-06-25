import { pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const RBAC_MODULES = [
  "Dashboard",
  "Students",
  "Courses",
  "Live Classes",
  "Payments",
  "Reports",
  "Settings",
  "Command Center",
  "Staff Management",
  "Mentor Management",
  "Teacher Management",
  "Ignite",
  "Mastery",
  "Leads",
  "Demo Batches",
  "Audit Logs",
] as const;

export const RBAC_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "assign",
  "approve",
  "export",
  "manage",
] as const;

export type RbacModule = (typeof RBAC_MODULES)[number];
export type RbacAction = (typeof RBAC_ACTIONS)[number];

export const rbacPermissionsTable = pgTable("rbac_permissions", {
  id:          serial("id").primaryKey(),
  module:      text("module").notNull(),
  action:      text("action").notNull(),
  description: text("description"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique().on(t.module, t.action)]);

export type RbacPermission = typeof rbacPermissionsTable.$inferSelect;
