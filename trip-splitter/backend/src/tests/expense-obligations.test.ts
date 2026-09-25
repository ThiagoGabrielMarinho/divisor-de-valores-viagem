import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { obligations } from "../db/schema";
import { registerUser } from "../services/authService";
import { addUserToTrip, createTripForUser, listParticipants } from "../services/tripService";
import { addExpense } from "../services/expenseService";

const email = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}@example.com`;

async function fixture() {
  const owner = await registerUser(email("exob-owner"), "senha-segura", "Owner");
  const member = await registerUser(email("exob-member"), "senha-segura", "Member");
  const trip = await createTripForUser("Derivação", owner.id);
  await addUserToTrip(trip.id, owner.id, member.id);
  const participants = await listParticipants(trip.id);
  return {
    owner,
    member,
    trip,
    ownerParticipant: participants.find((p) => p.user_id === owner.id)!,
    memberParticipant: participants.find((p) => p.user_id === member.id)!,
  };
}

test("derive: despesa dividida gera uma obrigação do devedor para o pagador", async () => {
  const f = await fixture();
  const expense = await addExpense(f.trip.id, {
    description: "Hotel",
    amountCents: 1000,
    paidBy: f.ownerParticipant.id,
    splitAmong: [f.ownerParticipant.id, f.memberParticipant.id],
    actorUserId: f.owner.id,
  });

  const rows = await db.select().from(obligations).where(eq(obligations.expense_id, expense.id));
  assert.equal(rows.length, 1);
  const [obligation] = rows;
  assert.equal(obligation.de_user_id, f.member.id);
  assert.equal(obligation.para_user_id, f.owner.id);
  assert.equal(obligation.valor_cents, 500);
  assert.equal(obligation.estado, "pendente");
});

test("derive: o próprio pagador não gera obrigação para si", async () => {
  const f = await fixture();
  const expense = await addExpense(f.trip.id, {
    description: "Só o pagador",
    amountCents: 900,
    paidBy: f.ownerParticipant.id,
    splitAmong: [f.ownerParticipant.id],
    actorUserId: f.owner.id,
  });

  const rows = await db.select().from(obligations).where(eq(obligations.expense_id, expense.id));
  assert.equal(rows.length, 0);
});

test("derive: resto de centavos reflete os rateios nas obrigações", async () => {
  const owner = await registerUser(email("exob3-owner"), "senha-segura", "Owner");
  const b = await registerUser(email("exob3-b"), "senha-segura", "Bee");
  const c = await registerUser(email("exob3-c"), "senha-segura", "Cee");
  const trip = await createTripForUser("Resto", owner.id);
  await addUserToTrip(trip.id, owner.id, b.id);
  await addUserToTrip(trip.id, owner.id, c.id);
  const parts = await listParticipants(trip.id);
  const pOwner = parts.find((p) => p.user_id === owner.id)!;
  const pB = parts.find((p) => p.user_id === b.id)!;
  const pC = parts.find((p) => p.user_id === c.id)!;

  // 100 / 3 = 34/33/33 (resto ao primeiro da lista = owner, que é o pagador)
  const expense = await addExpense(trip.id, {
    description: "Rateio 100",
    amountCents: 100,
    paidBy: pOwner.id,
    splitAmong: [pOwner.id, pB.id, pC.id],
    actorUserId: owner.id,
  });

  const rows = await db.select().from(obligations).where(eq(obligations.expense_id, expense.id));
  // Owner é o pagador; sobram obrigações de B e C, cada uma de 33.
  assert.equal(rows.length, 2);
  const valores = rows.map((r) => r.valor_cents).sort((x, y) => x - y);
  assert.deepEqual(valores, [33, 33]);
  for (const r of rows) {
    assert.equal(r.para_user_id, owner.id);
    assert.notEqual(r.de_user_id, owner.id);
  }
});

test("derive: despesa inválida não grava obrigação nem despesa", async () => {
  const f = await fixture();
  const before = await db.select().from(obligations).where(eq(obligations.trip_id, f.trip.id));
  await assert.rejects(() =>
    addExpense(f.trip.id, {
      description: "Inválida",
      amountCents: 0,
      paidBy: f.ownerParticipant.id,
      splitAmong: [f.ownerParticipant.id, f.memberParticipant.id],
      actorUserId: f.owner.id,
    })
  );
  const after = await db.select().from(obligations).where(eq(obligations.trip_id, f.trip.id));
  assert.equal(after.length, before.length);
});

test("expense-obligations: encerra pool ao final da suíte", async () => {
  await pool.end();
});
