-- Schema PostgreSQL da conta compartilhada do Trip Splitter.
-- DDL idempotente; valores monetários em centavos inteiros; moeda BRL.

-- T1: usuários
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  senha TEXT NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_lower ON users (lower(email));

-- T2: viagens
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  moeda TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- T3: participação (papéis owner/member), única por (viagem, usuário)
CREATE TABLE IF NOT EXISTS trip_memberships (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  papel TEXT NOT NULL CHECK (papel IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);

-- T4: despesas (valor em centavos > 0), cascade da viagem
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor_cents INTEGER NOT NULL CHECK (valor_cents > 0),
  pago_por TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- T5: rateios da despesa, cascade da despesa
CREATE TABLE IF NOT EXISTS expense_shares (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES users(id),
  share_cents INTEGER NOT NULL CHECK (share_cents >= 0)
);
