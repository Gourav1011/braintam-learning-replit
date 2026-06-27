import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const masteryDeploymentBatchesTable = pgTable("mastery_deployment_batches", {
  id:              serial("id").primaryKey(),
  batchCode:       text("batch_code").notNull().unique(),
  grade:           integer("grade"),
  mentorIdsJson:   text("mentor_ids_json"),
  studentIdsJson:  text("student_ids_json"),
  distributionJson: text("distribution_json"),
  totalStudents:   integer("total_students").notNull().default(0),
  totalMentors:    integer("total_mentors").notNull().default(0),
  deployedById:    integer("deployed_by_id"),
  deployedByName:  text("deployed_by_name"),
  notes:           text("notes"),
  status:          text("status").notNull().default("completed"),
  createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("mdb_grade_idx").on(t.grade),
  index("mdb_created_at_idx").on(t.createdAt),
]);

export const insertMasteryDeploymentBatchSchema = createInsertSchema(masteryDeploymentBatchesTable)
  .omit({ id: true, createdAt: true });
export type InsertMasteryDeploymentBatch = z.infer<typeof insertMasteryDeploymentBatchSchema>;
export type MasteryDeploymentBatch = typeof masteryDeploymentBatchesTable.$inferSelect;
