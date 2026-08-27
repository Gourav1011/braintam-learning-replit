import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export async function ensureWorkplaceSchema(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS workplace_conversations (id serial PRIMARY KEY, type text NOT NULL DEFAULT 'direct', name text, created_by_id integer NOT NULL REFERENCES users(id), last_message_at timestamp NOT NULL DEFAULT now(), created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS workplace_members (id serial PRIMARY KEY, conversation_id integer NOT NULL REFERENCES workplace_conversations(id) ON DELETE CASCADE, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, is_admin boolean NOT NULL DEFAULT false, last_read_at timestamp, joined_at timestamp NOT NULL DEFAULT now(), UNIQUE(conversation_id, user_id))`,
    `CREATE TABLE IF NOT EXISTS workplace_messages (id serial PRIMARY KEY, conversation_id integer NOT NULL REFERENCES workplace_conversations(id) ON DELETE CASCADE, sender_id integer NOT NULL REFERENCES users(id), content text NOT NULL, mentions_json text, edited_at timestamp, deleted_at timestamp, deleted_by_id integer REFERENCES users(id) ON DELETE SET NULL, created_at timestamp NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS workplace_tasks (id serial PRIMARY KEY, conversation_id integer REFERENCES workplace_conversations(id) ON DELETE SET NULL, title text NOT NULL, description text, assignee_id integer NOT NULL REFERENCES users(id), assigned_by_id integer NOT NULL REFERENCES users(id), due_date date, priority text NOT NULL DEFAULT 'medium', status text NOT NULL DEFAULT 'pending', crm_reference_id text, completed_at timestamp, completed_by_id integer REFERENCES users(id) ON DELETE SET NULL, source_message_id integer REFERENCES workplace_messages(id) ON DELETE SET NULL, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS workplace_message_edits (id serial PRIMARY KEY, message_id integer NOT NULL REFERENCES workplace_messages(id) ON DELETE CASCADE, previous_content text NOT NULL, new_content text NOT NULL, editor_id integer NOT NULL REFERENCES users(id), created_at timestamp NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS workplace_task_remarks (id serial PRIMARY KEY, task_id integer NOT NULL REFERENCES workplace_tasks(id) ON DELETE CASCADE, author_id integer NOT NULL REFERENCES users(id), content text NOT NULL, mentions_json text, created_at timestamp NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS workplace_task_events (id serial PRIMARY KEY, task_id integer NOT NULL REFERENCES workplace_tasks(id) ON DELETE CASCADE, event_type text NOT NULL, actor_id integer REFERENCES users(id) ON DELETE SET NULL, old_assignee_id integer REFERENCES users(id) ON DELETE SET NULL, new_assignee_id integer REFERENCES users(id) ON DELETE SET NULL, old_status text, new_status text, note text, created_at timestamp NOT NULL DEFAULT now())`,
    `CREATE OR REPLACE FUNCTION workplace_message_edits_immutable() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'workplace message edit history is immutable'; END; $$ LANGUAGE plpgsql`,
    `DROP TRIGGER IF EXISTS workplace_message_edits_immutable_trigger ON workplace_message_edits`,
    `CREATE TRIGGER workplace_message_edits_immutable_trigger BEFORE UPDATE OR DELETE ON workplace_message_edits FOR EACH ROW EXECUTE FUNCTION workplace_message_edits_immutable()`,
    `CREATE TABLE IF NOT EXISTS workplace_notifications (id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE, type text NOT NULL, title text NOT NULL, body text NOT NULL, conversation_id integer REFERENCES workplace_conversations(id) ON DELETE CASCADE, task_id integer REFERENCES workplace_tasks(id) ON DELETE CASCADE, actor_id integer REFERENCES users(id) ON DELETE SET NULL, read_at timestamp, created_at timestamp NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS workplace_members_user_idx ON workplace_members(user_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS workplace_members_conversation_user_idx ON workplace_members(conversation_id, user_id)`,
    `CREATE INDEX IF NOT EXISTS workplace_messages_conversation_created_idx ON workplace_messages(conversation_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS workplace_messages_deleted_idx ON workplace_messages(conversation_id, deleted_at)`,
    `CREATE INDEX IF NOT EXISTS workplace_message_edits_message_created_idx ON workplace_message_edits(message_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS workplace_tasks_assignee_status_idx ON workplace_tasks(assignee_id, status)`,
    `CREATE INDEX IF NOT EXISTS workplace_tasks_conversation_idx ON workplace_tasks(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS workplace_task_remarks_task_created_idx ON workplace_task_remarks(task_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS workplace_task_events_task_created_idx ON workplace_task_events(task_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS workplace_notifications_user_read_idx ON workplace_notifications(user_id, read_at, created_at)`,
  ];
  // Existing installations predate the additive Workplace columns.
  statements.splice(5, 0,
    `ALTER TABLE workplace_messages ADD COLUMN IF NOT EXISTS edited_at timestamp`,
    `ALTER TABLE workplace_messages ADD COLUMN IF NOT EXISTS deleted_at timestamp`,
    `ALTER TABLE workplace_messages ADD COLUMN IF NOT EXISTS deleted_by_id integer REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE workplace_tasks ADD COLUMN IF NOT EXISTS completed_at timestamp`,
    `ALTER TABLE workplace_tasks ADD COLUMN IF NOT EXISTS completed_by_id integer REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE workplace_tasks ADD COLUMN IF NOT EXISTS source_message_id integer REFERENCES workplace_messages(id) ON DELETE SET NULL`,
  );
  // Existing runtime databases may predate the Ignite columns used by the
  // teacher dashboard, session list, and live-class queries.
  statements.unshift(
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS batch_id integer`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS course_subject_id integer`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS chapter_id integer`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS livekit_room_name text`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS slide_url text`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS archived_at timestamp`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS archived_by integer`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS class_type text NOT NULL DEFAULT 'mastery'`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS ignite_batch_id integer`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS day_number integer`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS homework_text text`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS homework_link text`,
    `ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS recording_url text`,
    `CREATE UNIQUE INDEX IF NOT EXISTS live_classes_livekit_room_name_unique ON live_classes(livekit_room_name)`,
  );
  for (const statement of statements) await db.execute(sql.raw(statement));
}