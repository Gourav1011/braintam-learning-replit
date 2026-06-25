import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const rolePermissionsTable = pgTable("role_permissions", {
  id:           serial("id").primaryKey(),
  roleId:       integer("role_id").notNull(),
  permissionId: integer("permission_id").notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique().on(t.roleId, t.permissionId)]);

export type RolePermission = typeof rolePermissionsTable.$inferSelect;
