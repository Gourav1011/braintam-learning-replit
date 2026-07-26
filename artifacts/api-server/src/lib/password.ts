import crypto from "crypto";

/**
 * Legacy Braintam password hashing.
 *
 * Keep this implementation for compatibility with existing accounts.
 * New password hashing can later migrate to Argon2id behind this module.
 */
export function hashPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password + "braintam_salt")
    .digest("hex");
}

export function verifyPassword(
  password: string,
  storedHash: string | null | undefined,
): boolean {
  if (!storedHash) return false;

  const candidate = hashPassword(password);

  const stored = Buffer.from(storedHash, "utf8");
  const supplied = Buffer.from(candidate, "utf8");

  if (stored.length !== supplied.length) return false;

  return crypto.timingSafeEqual(stored, supplied);
}
