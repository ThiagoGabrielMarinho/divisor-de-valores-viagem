import { pool } from "./index";

// Cria o schema no Postgres se ainda não existir. Roda automaticamente no
// boot do servidor (ver index.ts) — é idempotente (IF NOT EXISTS), então é
// seguro executar em todo deploy/restart, inclusive no Render.
//
// Não usamos drizzle-kit aqui de propósito: para um MVP pequeno como este,
// manter o DDL explícito e versionado neste arquivo é mais simples de
// revisar do que introduzir uma pasta de migrations gerada.
const DDL = `
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  paid_by TEXT NOT NULL REFERENCES participants(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expense_shares (
  id SERIAL PRIMARY KEY,
  expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  share_cents INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_participants_trip_id ON participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expense_shares_expense_id ON expense_shares(expense_id);
`;

export async function runMigrations(): Promise<void> {
  await pool.query(DDL);
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
