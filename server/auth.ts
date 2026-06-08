import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: number;
    isAdmin: boolean;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: "Nicht autorisiert" });
}

export async function hasAnyAdmin(): Promise<boolean> {
  const admins = await storage.getAdmins();
  return admins.length > 0;
}
