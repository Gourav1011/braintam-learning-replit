import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoles = ["super_admin", "admin", "teacher", "mentor", "sales_mentor", "student"] as const;
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
  leadStage: text("lead_stage"),
  mentorType: text("mentor_type"), // 'sales' | 'academic' — null for non-mentors
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  callStatus: text("call_status"),            // Need To Call | Picked | Busy | Call Back | Not Connected
  interestLevel: text("interest_level"),      // Low | Moderate | High | Very High
  displayName: text("display_name"),
  referenceGrade: integer("reference_grade"),
  weakSubject: text("weak_subject"),
  strongSubject: text("strong_subject"),
  repeatedCustomer: boolean("repeated_customer").notNull().default(false),
  nextFollowUpAt: text("next_follow_up_at"),  // YYYY-MM-DD
  nextFollowUpTime: text("next_follow_up_time"), // HH:MM
  lastCallAt: timestamp("last_call_at"),
  busyReason: text("busy_reason"),
  altPhone: text("alt_phone"),
  leadSource: text("lead_source"),
  notes: text("notes"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by"),
  assignedMentorId: integer("assigned_mentor_id"),
  assignedAt: timestamp("assigned_at"),
  assignmentWeek: text("assignment_week"),
  assignmentMonth: text("assignment_month"),
  assignedById: integer("assigned_by_id"),
  isCurrentWeek: boolean("is_current_week").notNull().default(false),
  assignmentStatus: text("assignment_status"),
  isArchived: boolean("is_archived").notNull().default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: integer("archived_by"),
  lostReason: text("lost_reason"),
  lostAt: timestamp("lost_at"),
  lostBy: integer("lost_by"),
  disabledAt: timestamp("disabled_at"),
  disabledBy: integer("disabled_by"),
  disabledReason: text("disabled_reason"),
  organizationId: integer("organization_id"),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  department: text("department"),
  // Lead Deployment Engine
  deploymentStatus: text("deployment_status"),   // Undeployed | Assigned | Reassigned | Converted
  deploymentBatchId: integer("deployment_batch_id"),
  // Website enrollment / Meta Ads tracking
  isWebsiteLead: boolean("is_website_lead").notNull().default(false),
  utmSource: text("utm_source"),
  utmCampaign: text("utm_campaign"),
  utmAdset: text("utm_adset"),
  utmAd: text("utm_ad"),
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
