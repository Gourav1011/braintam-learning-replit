import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

// In-memory ring buffer — last 2000 events per process lifetime
const MAX_EVENTS = 2000;
const eventLog: Array<{
  ts: string;
  event: string;
  sessionId: string;
  userId: string;
  role: string;
  metadata: Record<string, unknown>;
}> = [];

// POST /api/analytics/event
router.post("/analytics/event", (req, res) => {
  const { event, sessionId, userId, role, metadata = {} } = req.body as {
    event: string;
    sessionId: string;
    userId: string;
    role: string;
    metadata?: Record<string, unknown>;
  };

  if (!event || !sessionId) {
    return res.status(400).json({ error: "event and sessionId are required" });
  }

  const entry = { ts: new Date().toISOString(), event, sessionId, userId, role, metadata };

  // Structured log — searchable in production logs
  logger.info(
    { analyticsEvent: event, sessionId, userId, role, metadata },
    "payment_analytics"
  );

  // Ring buffer
  if (eventLog.length >= MAX_EVENTS) eventLog.shift();
  eventLog.push(entry);

  return res.json({ ok: true });
});

// GET /api/analytics/events?sessionId=xxx  (staff/admin use only)
router.get("/analytics/events", (req, res) => {
  const { sessionId } = req.query as { sessionId?: string };
  const results = sessionId
    ? eventLog.filter(e => e.sessionId === sessionId)
    : eventLog.slice(-200);
  res.json({ events: results, total: results.length });
});

export default router;
