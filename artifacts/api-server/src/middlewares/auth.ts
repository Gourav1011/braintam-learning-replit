import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyAuthToken } from "../lib/auth-token.js";

export type UserRole = "super_admin" | "admin" | "teacher" | "mentor" | "sales_mentor" | "academic_mentor" | "student";

export interface AuthUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  grade: number;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

function parseToken(token: string): number | null {
  return verifyAuthToken(token);
}

export async function resolveUserFromToken(token: string): Promise<AuthUser | null> {
  const userId = parseToken(token);
  if (!userId) return null;

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      role: usersTable.role,
      grade: usersTable.grade,
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user || !user.isActive) return null;
  return {
    ...user,
    role: (user.role ?? "student") as UserRole,
    email: user.email ?? null,
    phone: user.phone ?? null,
  };
}

export async function resolveUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;

  return resolveUserFromToken(header.slice(7));
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await resolveUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.authUser = user;
  next();
}

/** Returns true if role has admin-or-higher privileges */
export function isAdminLevel(role: UserRole): boolean {
  return role === "admin" || role === "super_admin";
}

export function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    // super_admin bypasses all role checks
    if (user.role === "super_admin" || roles.includes(user.role)) {
      req.authUser = user;
      next();
      return;
    }
    res.status(403).json({ error: "Forbidden: insufficient role" });
  };
}

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const user = await resolveUser(req);
  if (user) req.authUser = user;
  next();
}
