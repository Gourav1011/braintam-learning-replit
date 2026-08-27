import { boolean, index, integer, pgTable, serial, text, timestamp, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const workplaceConversationTypes = ["direct", "group"] as const;
export const workplacePriorities = ["low", "medium", "high"] as const;
export const workplaceTaskStatuses = ["pending", "in_progress", "completed"] as const;

export const workplaceConversationsTable = pgTable("workplace_conversations", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("direct"),
  name: text("name"),
  createdById: integer("created_by_id").notNull().references(() => usersTable.id),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  lastMessageIndex: index("workplace_conversations_last_message_idx").on(table.lastMessageAt),
}));

export const workplaceMembersTable = pgTable("workplace_members", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => workplaceConversationsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  isAdmin: boolean("is_admin").notNull().default(false),
  lastReadAt: timestamp("last_read_at"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => ({
  conversationIndex: index("workplace_members_conversation_idx").on(table.conversationId),
  userIndex: index("workplace_members_user_idx").on(table.userId),
}));

export const workplaceMessagesTable = pgTable("workplace_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => workplaceConversationsTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  mentionsJson: text("mentions_json"),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
  deletedById: integer("deleted_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  conversationChronologyIndex: index("workplace_messages_conversation_created_idx").on(table.conversationId, table.createdAt),
  deletedIndex: index("workplace_messages_deleted_idx").on(table.conversationId, table.deletedAt),
}));

export const workplaceMessageEditsTable = pgTable("workplace_message_edits", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => workplaceMessagesTable.id, { onDelete: "cascade" }),
  previousContent: text("previous_content").notNull(),
  newContent: text("new_content").notNull(),
  editorId: integer("editor_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  messageChronologyIndex: index("workplace_message_edits_message_created_idx").on(table.messageId, table.createdAt),
}));

export const workplaceTasksTable = pgTable("workplace_tasks", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => workplaceConversationsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: integer("assignee_id").notNull().references(() => usersTable.id),
  assignedById: integer("assigned_by_id").notNull().references(() => usersTable.id),
  dueDate: date("due_date", { mode: "string" }),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  crmReferenceId: text("crm_reference_id"),
  completedAt: timestamp("completed_at"),
  completedById: integer("completed_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  sourceMessageId: integer("source_message_id").references(() => workplaceMessagesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  assigneeStatusIndex: index("workplace_tasks_assignee_status_idx").on(table.assigneeId, table.status),
  assignedByIndex: index("workplace_tasks_assigned_by_idx").on(table.assignedById),
  dueDateIndex: index("workplace_tasks_due_date_idx").on(table.dueDate),
  conversationIndex: index("workplace_tasks_conversation_idx").on(table.conversationId),
}));

export const workplaceTaskRemarksTable = pgTable("workplace_task_remarks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => workplaceTasksTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  mentionsJson: text("mentions_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  taskChronologyIndex: index("workplace_task_remarks_task_created_idx").on(table.taskId, table.createdAt),
}));

export const workplaceTaskEventsTable = pgTable("workplace_task_events", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => workplaceTasksTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  actorId: integer("actor_id").references(() => usersTable.id, { onDelete: "set null" }),
  oldAssigneeId: integer("old_assignee_id").references(() => usersTable.id, { onDelete: "set null" }),
  newAssigneeId: integer("new_assignee_id").references(() => usersTable.id, { onDelete: "set null" }),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  taskChronologyIndex: index("workplace_task_events_task_created_idx").on(table.taskId, table.createdAt),
}));

export const workplaceNotificationsTable = pgTable("workplace_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  conversationId: integer("conversation_id").references(() => workplaceConversationsTable.id, { onDelete: "cascade" }),
  taskId: integer("task_id").references(() => workplaceTasksTable.id, { onDelete: "cascade" }),
  actorId: integer("actor_id").references(() => usersTable.id, { onDelete: "set null" }),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userReadIndex: index("workplace_notifications_user_read_idx").on(table.userId, table.readAt, table.createdAt),
}));

export type WorkplaceConversation = typeof workplaceConversationsTable.$inferSelect;
export type WorkplaceMember = typeof workplaceMembersTable.$inferSelect;
export type WorkplaceMessage = typeof workplaceMessagesTable.$inferSelect;
export type WorkplaceMessageEdit = typeof workplaceMessageEditsTable.$inferSelect;
export type WorkplaceTask = typeof workplaceTasksTable.$inferSelect;
export type WorkplaceTaskRemark = typeof workplaceTaskRemarksTable.$inferSelect;
export type WorkplaceTaskEvent = typeof workplaceTaskEventsTable.$inferSelect;
export type WorkplaceNotification = typeof workplaceNotificationsTable.$inferSelect;