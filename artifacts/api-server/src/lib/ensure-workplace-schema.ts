import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export async function ensureWorkplaceSchema(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS workplace_conversations (id serial PRIMARY KEY, type text NOT NULL DEFAULT 'direct', name text, created_by_id integer NOT NULL REFERENCES users(id), last_message_at timestamp NOT NULL DEFAULT now(), created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS workplace_members (id serial PRIMARY KEY, conversation_id integer NOT NULL REFERENCES workplace_conversations(id) ON DELETE CASCADE, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, is_admin boolean NOT NULL DEFAULT false, last_read_at timestamp, joined_at timestamp NOT NULL DEFAULT now(), UNIQUE(conversation_id, user_id))`,
    `CREATE TABLE IF NOT EXISTS workplace_messages (id serial PRIMARY KEY, conversation_id integer NOT NULL REFERENCES workplace_conversations(id) ON DELETE CASCADE, sender_id integer NOT NULL REFERENCES users(id), content text NOT NULL, mentions_json text, created_at timestamp NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS workplace_tasks (id serial PRIMARY KEY, conversation_id integer REFERENCES workplace_conversations(id) ON DELETE SET NULL, title text NOT NULL, description text, assignee_id integer NOT NULL REFERENCES users(id), assigned_by_id integer NOT NULL REFERENCES users(id), due_date date, priority text NOT NULL DEFAULT 'medium', status text NOT NULL DEFAULT 'pending', crm_reference_id text, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS workplace_notifications (id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, type text NOT NULL, title text NOT NULL, body text NOT NULL, conversation_id integer REFERENCES workplace_conversations(id) ON DELETE CASCADE, task_id integer REFERENCES workplace_tasks(id) ON DELETE CASCADE, actor_id integer REFERENCES users(id) ON DELETE SET NULL, read_at timestamp, created_at timestamp NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS workplace_members_user_idx ON workplace_members(user_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS workplace_members_conversation_user_idx ON workplace_members(conversation_id, user_id)`,
    `CREATE INDEX IF NOT EXISTS workplace_messages_conversation_created_idx ON workplace_messages(conversation_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS workplace_tasks_assignee_status_idx ON workplace_tasks(assignee_id, status)`,
    `CREATE INDEX IF NOT EXISTS workplace_notifications_user_read_idx ON workplace_notifications(user_id, read_at, created_at)`,
  ];
  for (const statement of statements) await db.execute(sql.raw(statement));
}