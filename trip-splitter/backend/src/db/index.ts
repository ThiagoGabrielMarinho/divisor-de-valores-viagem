import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const configuredConnectionString = process.env.DATABASE_URL;

if (!configuredConnectionString) {
  throw new Error(
    "DATABASE_URL não foi definida nas variáveis de ambiente. " +
      "No Render, configure-a nas Environment Variables do Web Service " +
      "(cole a Internal ou External Connection String do seu Postgres). " +
      "Localmente, crie um arquivo .env a partir de .env.example."
  );
}

// O pg interpreta `sslmode=require` da URL e pode sobrescrever o objeto SSL
// abaixo. Removemos apenas esse parâmetro e configuramos SSL explicitamente,
// necessário para bancos gerenciados cujo certificado não está na trust store
// local. A connection string continua vindo exclusivamente do ambiente.
const connectionString = configuredConnectionString
  .replace(/[?&]sslmode=require\b/, "")
  .replace(/[?&]$/, "");

// Bancos gerenciados (Render, Neon, Supabase, Aiven etc.) exigem SSL.
// Em Postgres local (docker/localhost) normalmente não há SSL configurado.
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
