import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../db";
import { registerUser } from "../services/authService";
import { addUserToTrip, createTripForUser, listParticipants } from "../services/tripService";
import { addExpense, listExpenses } from "../services/expenseService";
import { createObligation, declarePayment, confirmReceipt, listObligations } from "../services/obligationService";
import { resetTripExpenses } from "../services/resetService";
import { ValidationError } from "../types";

const email = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}@example.com`;

async function fixture() {
  const owner = await registerUser(email("reset-owner"), "senha-segura", "Owner");
  const member = await registerUser(email("reset-member"), "senha-segura", "Member");
  const trip = await createTripForUser("Reset", owner.id);
  await addUserToTrip(trip.id, owner.id, member.id);
  const participants = await listParticipants(trip.id);
  return { owner, member, trip, ownerParticipant: participants.find((p) => p.user_id === owner.id)!, memberParticipant: participants.find((p) => p.user_id === member.id)! };
}

async function addPendingData(fixtureData: Awaited<ReturnType<typeof fixture>>) {
  await addExpense(fixtureData.trip.id, {
    description: "Hotel",
    amountCents: 1000,
    paidBy: fixtureData.ownerParticipant.id,
    splitAmong: [fixtureData.ownerParticipant.id, fixtureData.memberParticipant.id],
    actorUserId: fixtureData.owner.id,
  });
  await createObligation({
    tripId: fixtureData.trip.id,
    actorUserId: fixtureData.owner.id,
    debtorUserId: fixtureData.member.id,
    creditorUserId: fixtureData.owner.id,
    amountCents: 500,
  });
}

test("reset: exige owner e confirmação", async () => {
  const data = await fixture();
  await assert.rejects(() => resetTripExpenses(data.trip.id, data.member.id, true), ValidationError);
  await assert.rejects(() => resetTripExpenses(data.trip.id, data.owner.id, false), ValidationError);
});

test("reset: owner apaga despesas e obrigações atomicamente", async () => {
  const data = await fixture();
  await addPendingData(data);
  const result = await resetTripExpenses(data.trip.id, data.owner.id, true);
  assert.equal(result.deletedExpenses, 1);
  assert.equal(result.deletedObligations, 1);
  assert.equal((await listExpenses(data.trip.id)).length, 0);
  assert.equal((await listObligations(data.trip.id, data.owner.id)).length, 0);
});

test("reset: bloqueia após pagamento concluído e preserva obrigação", async () => {
  const data = await fixture();
  const obligation = await createObligation({ tripId: data.trip.id, actorUserId: data.owner.id, debtorUserId: data.member.id, creditorUserId: data.owner.id, amountCents: 100 });
  await declarePayment(obligation.id, data.member.id);
  await confirmReceipt(obligation.id, data.owner.id);
  await assert.rejects(() => resetTripExpenses(data.trip.id, data.owner.id, true), ValidationError);
  assert.equal((await listObligations(data.trip.id, data.owner.id)).length, 1);
});

test("reset: duas operações concorrentes produzem no máximo um reset efetivo", async () => {
  const data = await fixture();
  await addPendingData(data);
  const results = await Promise.all([
    resetTripExpenses(data.trip.id, data.owner.id, true),
    resetTripExpenses(data.trip.id, data.owner.id, true),
  ]);
  assert.equal(results.reduce((sum, result) => sum + result.deletedExpenses, 0), 1);
  assert.equal(results.reduce((sum, result) => sum + result.deletedObligations, 0), 1);
});

test("reset: encerra pool ao final da suíte", async () => { await pool.end(); });
