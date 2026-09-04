import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

// Usa um DB de teste isolado, criado ANTES de importar os services (schema.ts lê o env na carga do módulo)
const TEST_DB = path.join(__dirname, "test.db");
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
process.env.DB_PATH = TEST_DB;

import { createTrip, addParticipant } from "../services/tripService";
import { addExpense, splitEqually } from "../services/expenseService";
import { getBalances, getSettlements } from "../services/balanceService";
import { ValidationError } from "../types";

function setupTripWith3People() {
  const trip = createTrip("Viagem Teste " + Math.random());
  const a = addParticipant(trip.id, "Ana");
  const b = addParticipant(trip.id, "Bruno");
  const c = addParticipant(trip.id, "Carla");
  return { trip, a, b, c };
}

// R2: participante duplicado
test("R2: adicionar participante com nome duplicado é rejeitado", () => {
  const trip = createTrip("Viagem R2");
  addParticipant(trip.id, "Ana");
  assert.throws(() => addParticipant(trip.id, "Ana"), ValidationError);
  assert.throws(() => addParticipant(trip.id, "ana"), ValidationError); // case-insensitive
});

// R4: divisão de R$1,00 (100 centavos) entre 3 pessoas -> 34/33/33
test("R4: divisão desigual por resto de centavos", () => {
  const shares = splitEqually(100, ["p1", "p2", "p3"]);
  assert.equal(shares.get("p1"), 34);
  assert.equal(shares.get("p2"), 33);
  assert.equal(shares.get("p3"), 33);
  const total = Array.from(shares.values()).reduce((a, b) => a + b, 0);
  assert.equal(total, 100);
});

// R5: soma dos saldos de uma viagem sempre = 0
test("R5: soma de todos os saldos é sempre zero", () => {
  const { trip, a, b, c } = setupTripWith3People();
  addExpense(trip.id, {
    description: "Hotel",
    amountCents: 30000,
    paidBy: a.id,
    splitAmong: [a.id, b.id, c.id],
  });
  addExpense(trip.id, {
    description: "Jantar",
    amountCents: 12550,
    paidBy: b.id,
    splitAmong: [a.id, b.id, c.id],
  });

  const balances = getBalances(trip.id);
  const sum = balances.reduce((acc, x) => acc + x.balance_cents, 0);
  assert.equal(sum, 0);
});

// R6: settle-up gera no máximo N-1 transações
test("R6: settle-up simplifica dívidas em no máximo N-1 transações", () => {
  const { trip, a, b, c } = setupTripWith3People();
  addExpense(trip.id, {
    description: "Passagem",
    amountCents: 90000,
    paidBy: a.id,
    splitAmong: [a.id, b.id, c.id],
  });

  const settlements = getSettlements(trip.id);
  assert.ok(settlements.length <= 2); // N=3 -> no máximo 2 transações

  // toda dívida deve ser efetivamente quitada: soma recebida por cada credor bate com o saldo
  const balances = getBalances(trip.id);
  for (const bal of balances.filter((x) => x.balance_cents > 0)) {
    const received = settlements
      .filter((s) => s.to === bal.participant_id)
      .reduce((acc, s) => acc + s.amount_cents, 0);
    assert.equal(received, bal.balance_cents);
  }
});

// R8: validações de despesa inválida
test("R8: despesa com valor <= 0 é rejeitada", () => {
  const { trip, a, b } = setupTripWith3People();
  assert.throws(
    () =>
      addExpense(trip.id, {
        description: "Grátis",
        amountCents: 0,
        paidBy: a.id,
        splitAmong: [a.id, b.id],
      }),
    ValidationError
  );
});

test("R8: despesa com pagador que não é participante é rejeitada", () => {
  const { trip, a, b } = setupTripWith3People();
  assert.throws(
    () =>
      addExpense(trip.id, {
        description: "Suspeito",
        amountCents: 1000,
        paidBy: "id-inexistente",
        splitAmong: [a.id, b.id],
      }),
    ValidationError
  );
});

test("R8: despesa com split_among vazio é rejeitada", () => {
  const { trip, a } = setupTripWith3People();
  assert.throws(
    () =>
      addExpense(trip.id, {
        description: "Sem divisão",
        amountCents: 1000,
        paidBy: a.id,
        splitAmong: [],
      }),
    ValidationError
  );
});
