import { db, auditLogsTable } from "@workspace/db";

export interface LogActionOptions {
  actorId: number;
  actorName: string;
  action: string;
  targetType: string;
  targetId: number;
  targetName: string;
  metadata?: Record<string, unknown> | string;
}

/**
 * Shared audit logger — call from any route handler to record admin/teacher
 * actions in the audit_logs table.
 *
 * Always non-fatal: a write failure is swallowed so it never breaks the
 * primary action.
 */
export async function logAction(opts: LogActionOptions): Promise<void> {
  try {
    const meta =
      opts.metadata == null
        ? null
        : typeof opts.metadata === "string"
          ? opts.metadata
          : JSON.stringify(opts.metadata);

    await db.insert(auditLogsTable).values({
      actorId:    opts.actorId,
      actorName:  opts.actorName,
      action:     opts.action,
      targetType: opts.targetType,
      targetId:   opts.targetId,
      targetName: opts.targetName,
      metadata:   meta,
    });
  } catch {
    // non-fatal — audit failures must never break the main response
  }
}
