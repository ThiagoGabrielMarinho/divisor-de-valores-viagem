import { Router, Request, Response, NextFunction } from "express";
import { createSession, authenticateUser, registerUser } from "../services/authService";
import { extractSessionToken } from "../middleware/auth";
import { revokeSession } from "../services/authService";

export const authRouter = Router();
const COOKIE = "trip_session";

function setSessionCookie(res: Response, token: string, maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`);
}

function clearSessionCookie(res: Response) {
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

authRouter.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await registerUser(req.body?.email, req.body?.password, req.body?.name);
    const session = await createSession(user.id);
    setSessionCookie(res, session.token, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
    res.status(201).json(user);
  } catch (error) { next(error); }
});

authRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authenticateUser(req.body?.email, req.body?.password);
    if (!user) {
      res.status(401).json({ error: "Email ou senha inválidos." });
      return;
    }
    const session = await createSession(user.id);
    setSessionCookie(res, session.token, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
    res.json(user);
  } catch (error) { next(error); }
});

authRouter.post("/logout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractSessionToken(req);
    if (token) await revokeSession(token);
    clearSessionCookie(res);
    res.status(204).send();
  } catch (error) { next(error); }
});
