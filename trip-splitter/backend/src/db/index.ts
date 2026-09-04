import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não foi definida nas variáveis de ambiente. " +
      "No Render, configure-a nas Environment Variables do Web Service " +
      "(cole a Internal ou External Connection String do seu Postgres). " +
      "Localmente, crie um arquivo .env a partir de .env.example."
  );
}

// Bancos gerenciados (Render, Neon, Supabase etc.) exigem SSL. Em Postgres
// local (docker/localhost) normalmente não há SSL configurado.
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
