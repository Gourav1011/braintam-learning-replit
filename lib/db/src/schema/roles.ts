import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const rolesTable = pgTable("roles", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull().unique(),
  description: text("description"),
  isSystem:    boolean("is_system").notNull().default(false),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

export type Role = typeof rolesTable.$inferSelect;
export type InsertRole = typeof rolesTable.$inferInsert;
