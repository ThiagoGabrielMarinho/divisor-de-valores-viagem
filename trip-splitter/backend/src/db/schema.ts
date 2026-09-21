import { sql } from "drizzle-orm";
import { pgTable, text, integer, serial, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core";

// O schema mantém os exports legados usados pelo MVP enquanto as tasks do
// backend migram services e rotas para identidade real. As novas entidades
// ficam no mesmo catálogo PostgreSQL e serão adotadas pelas próximas tasks.

// Modelo legado do MVP: preservado para não quebrar tripService/expenseService
// antes da migração de identidade e memberships.
export const trips = pgTable("trips", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  created_at: text("created_at").notNull(),
});

export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  trip_id: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  trip_id: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount_cents: integer("amount_cents").notNull(),
  paid_by: text("paid_by")
    .notNull()
    .references(() => participants.id),
  created_at: text("created_at").notNull(),
});

export const expenseShares = pgTable("expense_shares", {
  id: serial("id").primaryKey(),
  expense_id: text("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  participant_id: text("participant_id")
    .notNull()
    .references(() => participants.id),
  share_cents: integer("share_cents").notNull(),
});

// Novas entidades do backend de conta compartilhada.
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    senha: text("senha").notNull(),
    nome: text("nome").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  () => ({})
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("sessions_token_hash_key").on(table.token_hash),
    userIndex: index("idx_sessions_user").on(table.user_id),
    expiryIndex: index("idx_sessions_expires").on(table.expires_at),
  })
);

export const tripMemberships = pgTable(
  "trip_memberships",
  {
    id: text("id").primaryKey(),
    trip_id: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    papel: text("papel").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tripUserUnique: uniqueIndex("trip_memberships_trip_id_user_id_key").on(table.trip_id, table.user_id),
    papelCheck: check("trip_memberships_papel_check", sql`${table.papel} in ('owner', 'member')`),
    tripIndex: index("idx_memberships_trip").on(table.trip_id),
    userIndex: index("idx_memberships_user").on(table.user_id),
  })
);

export const obligations = pgTable(
  "obligations",
  {
    id: text("id").primaryKey(),
    trip_id: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    expense_id: text("expense_id").references(() => expenses.id, { onDelete: "set null" }),
    de_user_id: text("de_user_id").notNull().references(() => users.id),
    para_user_id: text("para_user_id").notNull().references(() => users.id),
    valor_cents: integer("valor_cents").notNull(),
    estado: text("estado").notNull().default("pendente"),
    prazo: text("prazo"),
    confirmado_em: timestamp("confirmado_em", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    valueCheck: check("obligations_valor_cents_check", sql`${table.valor_cents} > 0`),
    stateCheck: check(
      "obligations_estado_check",
      sql`${table.estado} in ('pendente', 'aguardando_confirmacao', 'concluido')`
    ),
    tripIndex: index("idx_obligations_trip").on(table.trip_id),
    debtorIndex: index("idx_obligations_de").on(table.de_user_id),
    creditorIndex: index("idx_obligations_para").on(table.para_user_id),
  })
);
