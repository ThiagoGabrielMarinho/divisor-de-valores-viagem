import { NextFunction, Request, RequestHandler, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { tripMemberships } from "../db/schema";
import { AuthUser, getSessionUser } from "../services/authService";

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
  tripMembership?: typeof tripMemberships.$inferSelect;
}

const SESSION_COOKIE = "trip_session";

export function extractSessionToken(req: Request): string | null {
  const authorization = req.header("authorization");
  if (authorization && /^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, "").trim() || null;
  }

  const cookies = req.header("cookie") || "";
  for (const cookie of cookies.split(";")) {
    const [name, ...parts] = cookie.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(parts.join("="));
  }
  return null;
}

export const requireSession: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractSessionToken(req);
  const user = token ? await getSessionUser(token) : null;
  if (!user) {
    res.status(401).json({ error: "Autenticação necessária." });
    return;
  }

  (req as AuthenticatedRequest).authUser = user;
  next();
};

export function requireTripMembership(requiredRole?: "owner" | "member"): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.authUser) {
      res.status(401).json({ error: "Autenticação necessária." });
      return;
    }

    const [membership] = await db
      .select()
      .from(tripMemberships)
      .where(
        and(
          eq(tripMemberships.trip_id, req.params.tripId),
          eq(tripMemberships.user_id, authReq.authUser.id)
        )
      );

    if (!membership || (requiredRole && membership.papel !== requiredRole)) {
      res.status(403).json({ error: "Você não tem acesso a esta operação." });
      return;
    }

    authReq.tripMembership = membership;
    next();
  };
}
