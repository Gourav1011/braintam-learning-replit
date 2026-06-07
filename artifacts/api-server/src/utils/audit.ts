import { Request } from "express";
import { db, auditLogsTable } from "@workspace/db";

export interface LogActionOptions {
  actorId: number;
  actorName: string;
  actorRole?: string;
  actorEmail?: string;
  action: string;
  actionLabel?: string;
  category?: string;
  module?: string;
  targetType: string;
  targetId: number;
  targetName: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown> | string;
}

export interface LogFromReqOptions {
  req: Request;
  action: string;
  actionLabel?: string;
  category?: string;
  module?: string;
  targetType: string;
  targetId: number;
  targetName: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | string;
}

function parseUa(ua: string): { device: string; browser: string } {
  const tablet = /ipad|tablet/i.test(ua);
  const mobile = /mobile|android|iphone/i.test(ua);
  const device = tablet ? "tablet" : mobile ? "mobile" : "desktop";
  let browser = "Unknown";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua)) browser = "Opera";
  else if (/chrome\/([\d]+)/i.test(ua)) {
    const m = ua.match(/chrome\/([\d]+)/i);
    browser = `Chrome ${m?.[1] ?? ""}`;
  } else if (/firefox\/([\d]+)/i.test(ua)) {
    const m = ua.match(/firefox\/([\d]+)/i);
    browser = `Firefox ${m?.[1] ?? ""}`;
  } else if (/safari\//i.test(ua)) browser = "Safari";
  return { device, browser };
}

function getIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return (Array.isArray(xff) ? xff[0] : xff).split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

function serializeMeta(meta: Record<string, unknown> | string | null | undefined): string | null {
  if (meta == null) return null;
  return typeof meta === "string" ? meta : JSON.stringify(meta);
}

/**
 * Log from a request context — automatically extracts IP, UA, actor from req.authUser.
 * Use this for all new route handlers.
 */
export async function logFromReq(opts: LogFromReqOptions): Promise<void> {
  const { req } = opts;
  const ua = (req.headers["user-agent"] as string) ?? "";
  const { device, browser } = parseUa(ua);
  try {
    await db.insert(auditLogsTable).values({
      actorId: req.authUser?.id ?? null,
      actorName: req.authUser?.name ?? "System",
      actorRole: req.authUser?.role ?? null,
      actorEmail: req.authUser?.email ?? null,
      action: opts.action,
      actionLabel: opts.actionLabel ?? null,
      category: opts.category ?? "system",
      module: opts.module ?? null,
      targetType: opts.targetType,
      targetId: opts.targetId,
      targetName: opts.targetName,
      beforeValue: opts.before ?? null,
      afterValue: opts.after ?? null,
      ipAddress: getIp(req),
      userAgent: ua || null,
      device,
      browser,
      metadata: serializeMeta(opts.metadata),
    });
  } catch {
    // non-fatal
  }
}

/**
 * Backward-compatible positional logger — used by existing call sites.
 */
export async function logAction(opts: LogActionOptions): Promise<void> {
  const ua = opts.userAgent ?? "";
  const { device, browser } = parseUa(ua);
  try {
    await db.insert(auditLogsTable).values({
      actorId: opts.actorId,
      actorName: opts.actorName,
      actorRole: opts.actorRole ?? null,
      actorEmail: opts.actorEmail ?? null,
      action: opts.action,
      actionLabel: opts.actionLabel ?? null,
      category: opts.category ?? "system",
      module: opts.module ?? null,
      targetType: opts.targetType,
      targetId: opts.targetId,
      targetName: opts.targetName,
      beforeValue: opts.before ?? null,
      afterValue: opts.after ?? null,
      ipAddress: opts.ipAddress ?? null,
      userAgent: ua || null,
      device,
      browser,
      metadata: serializeMeta(opts.metadata),
    });
  } catch {
    // non-fatal
  }
}
