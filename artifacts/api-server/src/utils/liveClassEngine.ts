import type { LiveClass } from "@workspace/db";

export type LiveClassStatus = "UPCOMING" | "LIVE" | "COMPLETED";

/**
 * Computes the real-time status of a live class by comparing its scheduled
 * window against the current clock.
 *
 * Window:
 *   UPCOMING  — now is before scheduledAt
 *   LIVE      — now is within [scheduledAt, scheduledAt + duration minutes)
 *   COMPLETED — now is after the window
 */
export function getLiveClassStatus(lc: Pick<LiveClass, "scheduledAt" | "duration">): LiveClassStatus {
  const now = new Date();
  const start = new Date(lc.scheduledAt);
  const end = new Date(start.getTime() + lc.duration * 60_000);

  if (now < start) return "UPCOMING";
  if (now >= start && now < end) return "LIVE";
  return "COMPLETED";
}

/**
 * Enriches a LiveClass row with a computed `computedStatus` field.
 * Does not mutate the DB — use this in API responses.
 */
export function enrichLiveClass<T extends Pick<LiveClass, "scheduledAt" | "duration">>(
  lc: T,
): T & { computedStatus: LiveClassStatus } {
  return { ...lc, computedStatus: getLiveClassStatus(lc) };
}
