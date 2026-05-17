import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const animatedVideosTable = pgTable("animated_videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subjectId: integer("subject_id").notNull(),
  grade: integer("grade").notNull(),
  videoUrl: text("video_url").notNull(),
  duration: integer("duration").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  description: text("description"),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnimatedVideoSchema = createInsertSchema(animatedVideosTable).omit({ id: true, createdAt: true });
export type InsertAnimatedVideo = z.infer<typeof insertAnimatedVideoSchema>;
export type AnimatedVideo = typeof animatedVideosTable.$inferSelect;
