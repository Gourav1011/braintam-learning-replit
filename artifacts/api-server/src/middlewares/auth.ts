import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type UserRole = "admin" | "teacher" | "mentor" | "student";

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
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    const userId = parseInt(parts[0], 10);
    return isNaN(userId) ? null : userId;
  } catch {
    return null;
  }
}

async function resolveUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
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

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await resolveUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.authUser = user;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden: insufficient role" });
      return;
    }
    req.authUser = user;
    next();
  };
}

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const user = await resolveUser(req);
  if (user) req.authUser = user;
  next();
}
