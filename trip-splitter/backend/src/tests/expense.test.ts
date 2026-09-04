import test from "node:test";
import assert from "node:assert/strict";

// Estes testes usam o Postgres apontado por DATABASE_URL (ver .env / .env.example).
// Cada teste cria sua própria viagem com nome/ID aleatórios, então não há
// necessidade de zerar o banco entre execuções.
import { createTrip, addParticipant } from "../services/tripService";
import { addExpense, splitEqually } from "../services/expenseService";
import { getBalances, getSettlements } from "../services/balanceService";
import { ValidationError } from "../types";
import { pool } from "../db";

async function setupTripWith3People() {
  const trip = await createTrip("Viagem Teste " + Math.random());
  const a = await addParticipant(trip.id, "Ana");
  const b = await addParticipant(trip.id, "Bruno");
  const c = await addParticipant(trip.id, "Carla");
  return { trip, a, b, c };
}

async function assertRejects(fn: () => Promise<unknown>) {
  await assert.rejects(fn, ValidationError);
}

// R2: participante duplicado
test("R2: adicionar participante com nome duplicado é rejeitado", async () => {
  const trip = await createTrip("Viagem R2 " + Math.random());
  await addParticipant(trip.id, "Ana");
  await assertRejects(() => addParticipant(trip.id, "Ana"));
  await assertRejects(() => addParticipant(trip.id, "ana")); // case-insensitive
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
test("R5: soma de todos os saldos é sempre zero", async () => {
  const { trip, a, b, c } = await setupTripWith3People();
  await addExpense(trip.id, {
    description: "Hotel",
    amountCents: 30000,
    paidBy: a.id,
    splitAmong: [a.id, b.id, c.id],
  });
  await addExpense(trip.id, {
    description: "Jantar",
    amountCents: 12550,
    paidBy: b.id,
    splitAmong: [a.id, b.id, c.id],
  });

  const balances = await getBalances(trip.id);
  const sum = balances.reduce((acc, x) => acc + x.balance_cents, 0);
  assert.equal(sum, 0);
});

// R6: settle-up gera no máximo N-1 transações
test("R6: settle-up simplifica dívidas em no máximo N-1 transações", async () => {
  const { trip, a, b, c } = await setupTripWith3People();
  await addExpense(trip.id, {
    description: "Passagem",
    amountCents: 90000,
    paidBy: a.id,
    splitAmong: [a.id, b.id, c.id],
  });

  const settlements = await getSettlements(trip.id);
  assert.ok(settlements.length <= 2); // N=3 -> no máximo 2 transações

  // toda dívida deve ser efetivamente quitada: soma recebida por cada credor bate com o saldo
  const balances = await getBalances(trip.id);
  for (const bal of balances.filter((x) => x.balance_cents > 0)) {
    const received = settlements
      .filter((s) => s.to === bal.participant_id)
      .reduce((acc, s) => acc + s.amount_cents, 0);
    assert.equal(received, bal.balance_cents);
  }
});

// R8: validações de despesa inválida
test("R8: despesa com valor <= 0 é rejeitada", async () => {
  const { trip, a, b } = await setupTripWith3People();
  await assertRejects(() =>
    addExpense(trip.id, {
      description: "Grátis",
      amountCents: 0,
      paidBy: a.id,
      splitAmong: [a.id, b.id],
    })
  );
});

test("R8: despesa com pagador que não é participante é rejeitada", async () => {
  const { trip, a, b } = await setupTripWith3People();
  await assertRejects(() =>
    addExpense(trip.id, {
      description: "Suspeito",
      amountCents: 1000,
      paidBy: "id-inexistente",
      splitAmong: [a.id, b.id],
    })
  );
});

test("R8: despesa com split_among vazio é rejeitada", async () => {
  const { trip, a } = await setupTripWith3People();
  await assertRejects(() =>
    addExpense(trip.id, {
      description: "Sem divisão",
      amountCents: 1000,
      paidBy: a.id,
      splitAmong: [],
    })
  );
});

test("encerra o pool de conexões ao final da suíte", async () => {
  await pool.end();
});
