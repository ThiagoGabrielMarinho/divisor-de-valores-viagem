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
