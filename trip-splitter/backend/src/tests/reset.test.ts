import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../db";
import { registerUser } from "../services/authService";
import { addUserToTrip, createTripForUser } from "../services/tripService";
import { createObligation, declarePayment, confirmReceipt } from "../services/obligationService";
import { resetTripExpenses } from "../services/resetService";
import { ValidationError } from "../types";

const email = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}@example.com`;

async function fixture() {
  const owner = await registerUser(email("reset-owner"), "senha-segura", "Owner");
  const member = await registerUser(email("reset-member"), "senha-segura", "Member");
  const trip = await createTripForUser("Reset", owner.id);
  await addUserToTrip(trip.id, owner.id, member.id);
  return { owner, member, trip };
}

test("reset: exige owner e confirmação", async () => {
  const { owner, member, trip } = await fixture();
  await assert.rejects(() => resetTripExpenses(trip.id, member.id, true), ValidationError);
  await assert.rejects(() => resetTripExpenses(trip.id, owner.id, false), ValidationError);
});

test("reset: owner pode resetar sem pagamentos concluídos", async () => {
  const { owner, trip } = await fixture();
  const result = await resetTripExpenses(trip.id, owner.id, true);
  assert.equal(result.tripId, trip.id);
});

test("reset: bloqueia após pagamento concluído", async () => {
  const { owner, member, trip } = await fixture();
  const obligation = await createObligation({ tripId: trip.id, actorUserId: owner.id, debtorUserId: member.id, creditorUserId: owner.id, amountCents: 100 });
  await declarePayment(obligation.id, member.id);
  await confirmReceipt(obligation.id, owner.id);
  await assert.rejects(() => resetTripExpenses(trip.id, owner.id, true), ValidationError);
});

test("reset: encerra pool ao final da suíte", async () => { await pool.end(); });
