import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { router } from "./routes/trips";
import { runMigrations } from "./db/migrate";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", router);

// T9: serve o frontend estático
const FRONTEND_DIR = path.join(__dirname, "..", "..", "frontend");
app.use(express.static(FRONTEND_DIR));
app.get("*", (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// Error handler central: mapeia ValidationError/NotFoundError para status HTTP corretos
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: err.message || "Erro interno." });
});

const PORT = process.env.PORT || 3000;

// Garante que as tabelas existem antes de aceitar tráfego (idempotente).
runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Trip Splitter rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Falha ao migrar o banco de dados:", err);
    process.exit(1);
  });
