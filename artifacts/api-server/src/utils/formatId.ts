/**
 * ID Formatting Engine
 *
 * Keeps integer primary keys for DB performance while exposing
 * human-readable prefixed IDs in the API / UI.
 *
 * Format: PREFIX-{1000 + id}   →   ids start at 1001
 *
 * Examples:
 *   fmtCourse(1)    → "CRS-1001"
 *   fmtSubject(5)   → "SUB-1005"
 *   fmtChapter(12)  → "CHP-1012"
 *   fmtTopic(3)     → "TOP-1003"
 *   fmtContent(7)   → "CON-1007"
 *   fmtUser(2)      → "USR-1002"
 *   fmtTest(9)      → "TST-1009"
 */

const offset = 1000;
const pad = (id: number): string => String(offset + id);

export const fmtCourse   = (id: number): string => `CRS-${pad(id)}`;
export const fmtSubject  = (id: number): string => `SUB-${pad(id)}`;
export const fmtChapter  = (id: number): string => `CHP-${pad(id)}`;
export const fmtTopic    = (id: number): string => `TOP-${pad(id)}`;
export const fmtContent  = (id: number): string => `CON-${pad(id)}`;
export const fmtUser     = (id: number): string => `USR-${pad(id)}`;
export const fmtTest     = (id: number): string => `TST-${pad(id)}`;
export const fmtLesson   = (id: number): string => `LSN-${pad(id)}`;
export const fmtHomework = (id: number): string => `HW-${pad(id)}`;

/**
 * Parse a formatted display ID back to its raw integer.
 * Returns null if the string is not a valid formatted ID.
 *
 * parseFormattedId("CRS-1001") → 1
 * parseFormattedId("bad")      → null
 */
export function parseFormattedId(formattedId: string): number | null {
  const parts = formattedId.split("-");
  if (parts.length !== 2) return null;
  const n = parseInt(parts[1], 10);
  if (isNaN(n) || n < offset) return null;
  return n - offset;
}

/**
 * Attach a formatted display ID to any object that has a numeric `id`.
 * Usage: enrichWithDisplayId(courseRow, fmtCourse)
 */
export function enrichWithDisplayId<T extends { id: number }>(
  obj: T,
  formatter: (id: number) => string,
): T & { displayId: string } {
  return { ...obj, displayId: formatter(obj.id) };
}
