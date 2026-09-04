import { pgTable, text, integer, serial } from "drizzle-orm/pg-core";

// Nomes de coluna em snake_case propositalmente iguais às chaves usadas nas
// interfaces de types.ts (Trip, Participant, Expense) e no contrato da API
// consumido pelo frontend (frontend/app.js). Isso evita uma camada extra de
// mapeamento entre o resultado do Drizzle e o JSON devolvido nas rotas.

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
  // Valores em centavos (inteiro) para não ter erro de arredondamento de
  // ponto flutuante na divisão igualitária (ver splitEqually em expenseService.ts).
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
