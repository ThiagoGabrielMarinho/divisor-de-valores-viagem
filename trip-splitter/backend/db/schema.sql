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

-- T4: sessões persistidas; token puro nunca é armazenado.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- T2: viagens. Os nomes mantêm compatibilidade com o MVP legado.
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compatibilidade idempotente com a primeira versão do DDL (nome/moeda).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='nome')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='name') THEN
    ALTER TABLE trips RENAME COLUMN nome TO name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='moeda')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='currency') THEN
    ALTER TABLE trips RENAME COLUMN moeda TO currency;
  END IF;
END $$;

-- Compatibilidade com o MVP legado: participantes sem conta global.
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='participants' AND column_name='user_id') THEN
    ALTER TABLE participants ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- T3: participação de contas (papéis owner/member), única por viagem/usuário.
CREATE TABLE IF NOT EXISTS trip_memberships (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  papel TEXT NOT NULL CHECK (papel IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);

-- T4: despesas legadas; o vínculo do pagador será migrado para users em task posterior.
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  paid_by TEXT NOT NULL REFERENCES participants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compatibilidade idempotente com a primeira versão (colunas em português e FK para users).
DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='descricao')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='description') THEN
    ALTER TABLE expenses RENAME COLUMN descricao TO description;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='valor_cents')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='amount_cents') THEN
    ALTER TABLE expenses RENAME COLUMN valor_cents TO amount_cents;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='pago_por')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='paid_by') THEN
    ALTER TABLE expenses RENAME COLUMN pago_por TO paid_by;
  END IF;
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='expenses'::regclass AND contype='f' AND confrelid='users'::regclass LOOP
    EXECUTE format('ALTER TABLE expenses DROP CONSTRAINT %I', r.conname);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='expenses'::regclass AND conname='expenses_paid_by_participant_fkey') THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_paid_by_participant_fkey FOREIGN KEY (paid_by) REFERENCES participants(id);
  END IF;
END $$;

-- T5: rateios da despesa.
CREATE TABLE IF NOT EXISTS expense_shares (
  id SERIAL PRIMARY KEY,
  expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  share_cents INTEGER NOT NULL CHECK (share_cents >= 0)
);

-- Compatibilidade idempotente para o MVP: shares antigos usam id serial e participant_id.
DO $$
DECLARE r RECORD;
DECLARE n BIGINT;
BEGIN
  SELECT count(*) INTO n FROM expense_shares;
  IF n = 0 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expense_shares' AND column_name='id' AND data_type='text') THEN
    ALTER TABLE expense_shares ALTER COLUMN id TYPE INTEGER USING id::integer;
    CREATE SEQUENCE IF NOT EXISTS expense_shares_id_seq;
    ALTER SEQUENCE expense_shares_id_seq OWNED BY expense_shares.id;
    ALTER TABLE expense_shares ALTER COLUMN id SET DEFAULT nextval('expense_shares_id_seq');
  END IF;
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='expense_shares'::regclass AND contype='f' AND confrelid='users'::regclass LOOP
    EXECUTE format('ALTER TABLE expense_shares DROP CONSTRAINT %I', r.conname);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='expense_shares'::regclass AND conname='expense_shares_participant_fkey') THEN
    ALTER TABLE expense_shares ADD CONSTRAINT expense_shares_participant_fkey FOREIGN KEY (participant_id) REFERENCES participants(id);
  END IF;
END $$;

-- T6: obrigações de contas globais, com pagamento em duas etapas.
CREATE TABLE IF NOT EXISTS obligations (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  expense_id TEXT REFERENCES expenses(id) ON DELETE SET NULL,
  de_user_id TEXT NOT NULL REFERENCES users(id),
  para_user_id TEXT NOT NULL REFERENCES users(id),
  valor_cents INTEGER NOT NULL CHECK (valor_cents > 0),
  estado TEXT NOT NULL DEFAULT 'pendente'
    CHECK (estado IN ('pendente', 'aguardando_confirmacao', 'concluido')),
  prazo DATE,
  confirmado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- T7: índices de acesso.
CREATE INDEX IF NOT EXISTS idx_participants_trip_id ON participants (trip_id);
CREATE INDEX IF NOT EXISTS idx_memberships_trip ON trip_memberships (trip_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON trip_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON expenses (trip_id);
CREATE INDEX IF NOT EXISTS idx_expense_shares_expense ON expense_shares (expense_id);
CREATE INDEX IF NOT EXISTS idx_obligations_trip ON obligations (trip_id);
CREATE INDEX IF NOT EXISTS idx_obligations_de ON obligations (de_user_id);
CREATE INDEX IF NOT EXISTS idx_obligations_para ON obligations (para_user_id);
