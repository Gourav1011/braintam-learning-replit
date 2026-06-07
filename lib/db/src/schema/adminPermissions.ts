import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const ALL_MODULES = [
  "Dashboard", "Analytics", "Course Analytics", "Teacher Analytics",
  "Learning Health", "Gamification", "BTL CRM",
  "Courses", "Demo Batches", "Live Classes",
  "Users", "Mentors", "Teachers", "Enrollments",
  "Announcements", "Banners", "Staff Attendance",
  "Operations Center", "Audit Logs", "Settings",
] as const;

export type PermissionModule = (typeof ALL_MODULES)[number];

export const adminPermissionsTable = pgTable("admin_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  module: text("module").notNull(),
  canView: boolean("can_view").notNull().default(true),
  canCreate: boolean("can_create").notNull().default(false),
  canEdit: boolean("can_edit").notNull().default(false),
  canArchive: boolean("can_archive").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AdminPermission = typeof adminPermissionsTable.$inferSelect;
export type InsertAdminPermission = typeof adminPermissionsTable.$inferInsert;
