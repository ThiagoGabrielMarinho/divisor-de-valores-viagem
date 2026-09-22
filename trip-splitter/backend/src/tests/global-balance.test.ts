import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../db";
import { registerUser } from "../services/authService";
import { addUserToTrip, createTripForUser } from "../services/tripService";
import { confirmReceipt, createObligation, declarePayment } from "../services/obligationService";
import { getGlobalBalanceDetails, getGlobalBalances } from "../services/globalBalanceService";
import { ValidationError } from "../types";

const email = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}@example.com`;

test("global balance: consolida valores opostos com netting", async () => {
  const ana = await registerUser(email("global-ana"), "senha-segura", "Ana");
  const bruno = await registerUser(email("global-bruno"), "senha-segura", "Bruno");
  const tripOne = await createTripForUser("Viagem 1", ana.id);
  const tripTwo = await createTripForUser("Viagem 2", bruno.id);
  await addUserToTrip(tripOne.id, ana.id, bruno.id);
  await addUserToTrip(tripTwo.id, bruno.id, ana.id);

  await createObligation({ tripId: tripOne.id, actorUserId: ana.id, debtorUserId: bruno.id, creditorUserId: ana.id, amountCents: 5000 });
  await createObligation({ tripId: tripTwo.id, actorUserId: bruno.id, debtorUserId: ana.id, creditorUserId: bruno.id, amountCents: 1500 });

  const balances = await getGlobalBalances(ana.id);
  assert.equal(balances.length, 1);
  assert.equal(balances[0].user_name, "Bruno");
  assert.equal(balances[0].net_cents, 3500);
  assert.equal(balances[0].direction, "a_receber");
  assert.equal(balances[0].details.length, 2);
});

test("global balance: ignora obrigações concluídas e restringe viagens", async () => {
  const ana = await registerUser(email("global-ana2"), "senha-segura", "Ana 2");
  const bruno = await registerUser(email("global-bruno2"), "senha-segura", "Bruno 2");
  const trip = await createTripForUser("Viagem autorizada", ana.id);
  await addUserToTrip(trip.id, ana.id, bruno.id);
  const obligation = await createObligation({ tripId: trip.id, actorUserId: ana.id, debtorUserId: bruno.id, creditorUserId: ana.id, amountCents: 900 });
  await declarePayment(obligation.id, bruno.id);
  await confirmReceipt(obligation.id, ana.id);

  assert.deepEqual(await getGlobalBalances(ana.id), []);
  await assert.rejects(() => getGlobalBalanceDetails(ana.id, bruno.id), ValidationError);
});

test("global balance: usuário sem membership não acessa obrigação de outra viagem", async () => {
  const owner = await registerUser(email("global-owner"), "senha-segura", "Owner Global");
  const outsider = await registerUser(email("global-out"), "senha-segura", "Outsider Global");
  await createTripForUser("Privada", owner.id);
  assert.deepEqual(await getGlobalBalances(outsider.id), []);
});

test("global balance: encerra pool ao final da suíte", async () => { await pool.end(); });
