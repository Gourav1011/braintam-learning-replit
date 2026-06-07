import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),

  actorId: integer("actor_id"),
  actorName: text("actor_name").notNull(),
  actorRole: text("actor_role"),
  actorEmail: text("actor_email"),

  action: text("action").notNull(),
  actionLabel: text("action_label"),

  category: text("category").notNull().default("system"),
  module: text("module"),

  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  targetName: text("target_name").notNull(),

  beforeValue: jsonb("before_value"),
  afterValue: jsonb("after_value"),

  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  device: text("device"),
  browser: text("browser"),

  metadata: text("metadata"),

  organizationId: integer("organization_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
