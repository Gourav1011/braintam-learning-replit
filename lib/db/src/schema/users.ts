import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoles = ["admin", "teacher", "mentor", "student"] as const;
export type UserRole = (typeof userRoles)[number];

export const accountTypes = ["lead", "demo_student", "paid_student", "teacher", "admin"] as const;
export type AccountType = (typeof accountTypes)[number];

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  phone: text("phone").unique(),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("student"),
  accountType: text("account_type").notNull().default("student"),
  grade: integer("grade").notNull().default(0),
  avatarUrl: text("avatar_url"),
  school: text("school"),
  state: text("state"),
  city: text("city"),
  board: text("board"),
  points: integer("points").notNull().default(0),
  rank: integer("rank"),
  streakDays: integer("streak_days").notNull().default(0),
  lastLoginDate: timestamp("last_login_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const otpTable = pgTable("otp", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
