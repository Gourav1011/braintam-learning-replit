import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { requireRole } from "../middlewares/auth.js";
import {
  desc, asc, eq, ilike, or, and, gte, lte, count, sql,
} from "drizzle-orm";

const router = Router();
const adminOnly = requireRole("admin", "super_admin");

// ── GET /admin/cc/audit-logs ─────────────────────────────────────────────────────
router.get("/admin/cc/audit-logs", adminOnly, async (req, res) => {
  const {
    search = "",
    role   = "all",
    action = "all",
    module = "all",
    dateFrom = "",
    dateTo   = "",
    sort  = "createdAt",
    order = "desc",
    page  = "1",
    limit = "25",
  } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10) || 25));
  const offset   = (pageNum - 1) * pageSize;

  try {
    const conditions: ReturnType<typeof eq>[] = [];

    if (search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(auditLogsTable.actorName,  q),
          ilike(auditLogsTable.targetName, q),
          ilike(auditLogsTable.action,     q),
          ilike(auditLogsTable.actionLabel, q),
        )! as any,
      );
    }
    if (role   !== "all") conditions.push(eq(auditLogsTable.actorRole, role) as any);
    if (action !== "all") conditions.push(eq(auditLogsTable.action,    action) as any);
    if (module !== "all") conditions.push(eq(auditLogsTable.module,    module) as any);
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!isNaN(from.getTime())) conditions.push(gte(auditLogsTable.createdAt, from) as any);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (!isNaN(to.getTime())) conditions.push(lte(auditLogsTable.createdAt, to) as any);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortCol =
      sort === "actor"  ? auditLogsTable.actorName :
      sort === "action" ? auditLogsTable.action :
      sort === "module" ? auditLogsTable.module :
      auditLogsTable.createdAt;
    const orderFn = order === "asc" ? asc : desc;

    const [items, [{ total }], kpiRows] = await Promise.all([
      db.select({
        id:          auditLogsTable.id,
        actorId:     auditLogsTable.actorId,
        actorName:   auditLogsTable.actorName,
        actorRole:   auditLogsTable.actorRole,
        action:      auditLogsTable.action,
        actionLabel: auditLogsTable.actionLabel,
        category:    auditLogsTable.category,
        module:      auditLogsTable.module,
        targetType:  auditLogsTable.targetType,
        targetId:    auditLogsTable.targetId,
        targetName:  auditLogsTable.targetName,
        createdAt:   auditLogsTable.createdAt,
      }).from(auditLogsTable)
        .where(where)
        .orderBy(orderFn(sortCol as any))
        .limit(pageSize)
        .offset(offset),

      db.select({ total: count() }).from(auditLogsTable).where(where),

      // KPIs — unfiltered for the cards
      db.select({
        action: auditLogsTable.action,
        module: auditLogsTable.module,
        createdAt: auditLogsTable.createdAt,
      }).from(auditLogsTable),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEvents       = kpiRows.filter(r => new Date(r.createdAt) >= today).length;
    const roleChanges       = kpiRows.filter(r => r.action?.startsWith("role_")).length;
    const permChanges       = kpiRows.filter(r => r.action === "permission_updated").length;
    const staffChanges      = kpiRows.filter(r => r.module === "staff" || r.action?.startsWith("staff_")).length;
    const systemEvents      = kpiRows.filter(r => r.module === "system" || r.module === "roles").length;

    res.json({
      items,
      total,
      page: pageNum,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      kpis: {
        totalEvents:   kpiRows.length,
        todayEvents,
        roleChanges,
        permChanges,
        staffChanges,
        systemEvents,
      },
    });
  } catch (err) {
    req.log.error({ err }, "audit logs list error");
    res.status(500).json({ error: "Failed to load audit logs" });
  }
});

// ── GET /admin/cc/audit-logs/:id ─────────────────────────────────────────────────
router.get("/admin/cc/audit-logs/:id", adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [event] = await db.select().from(auditLogsTable).where(eq(auditLogsTable.id, id)).limit(1);
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    res.json({ event });
  } catch (err) {
    req.log.error({ err }, "audit log detail error");
    res.status(500).json({ error: "Failed to load event" });
  }
});

export default router;
