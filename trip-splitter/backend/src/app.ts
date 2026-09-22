import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { router } from "./routes/trips";
import { authRouter } from "./routes/auth";
import { accountRouter } from "./routes/account";

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.use("/api/auth", authRouter);
  app.use("/api/account", accountRouter);
  app.use("/api", router);

  const frontendDir = path.join(__dirname, "..", "..", "frontend");
  app.use(express.static(frontendDir));
  app.get("*", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDir, "index.html"));
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: err.message || "Erro interno." });
  });

  return app;
}
