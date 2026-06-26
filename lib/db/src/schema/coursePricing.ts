import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const coursePricingTable = pgTable("course_pricing", {
  id: serial("id").primaryKey(),
  grade: integer("grade").notNull().unique(),
  fullPrice: integer("full_price").notNull(),
  scholarshipPct: integer("scholarship_pct").notNull().default(0),
  finalPrice: integer("final_price").notNull(),
  status: text("status").notNull().default("active"),
  updatedById: integer("updated_by_id"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCoursePricingSchema = createInsertSchema(coursePricingTable).omit({ id: true, createdAt: true });
export type InsertCoursePricing = z.infer<typeof insertCoursePricingSchema>;
export type CoursePricing = typeof coursePricingTable.$inferSelect;
