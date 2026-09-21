import fs from "fs";
import path from "path";
import { pool } from "./index";

// O DDL é mantido em backend/db/schema.sql para poder ser aplicado manualmente
// e revisado independentemente do código. O caminho funciona em ts-node (src)
// e no build (dist), pois ambos resolvem dois níveis acima até backend/.
const SCHEMA_PATH = path.join(__dirname, "..", "..", "db", "schema.sql");

export async function runMigrations(): Promise<void> {
  const ddl = fs.readFileSync(SCHEMA_PATH, "utf8");
  await pool.query(ddl);
}

// Permite rodar manualmente: npm run db:migrate
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("Migração aplicada com sucesso.");
      return pool.end();
    })
    .catch((err) => {
      console.error("Falha ao migrar:", err);
      process.exit(1);
    });
}
