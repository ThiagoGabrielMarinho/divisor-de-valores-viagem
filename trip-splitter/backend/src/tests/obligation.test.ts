import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../db";
import { registerUser } from "../services/authService";
import { addUserToTrip, createTripForUser } from "../services/tripService";
import {
  confirmReceipt,
  createObligation,
  declarePayment,
  listObligations,
  rejectDeclaration,
  setDeadline,
  clearDeadline,
  deadlineStatus,
  obligationInternals,
} from "../services/obligationService";
import { ValidationError } from "../types";

const email = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}@example.com`;

async function fixture() {
  const owner = await registerUser(email("ob-owner"), "senha-segura", "Owner");
  const debtor = await registerUser(email("ob-debtor"), "senha-segura", "Debtor");
  const trip = await createTripForUser("Obrigações", owner.id);
  await addUserToTrip(trip.id, owner.id, debtor.id);
  return { owner, debtor, trip };
}

test("obligation: cria pendente e executa declaração, recusa e confirmação", async () => {
  const { owner, debtor, trip } = await fixture();
  const created = await createObligation({
    tripId: trip.id,
    actorUserId: owner.id,
    debtorUserId: debtor.id,
    creditorUserId: owner.id,
    amountCents: 1500,
  });
  assert.equal(created.estado, "pendente");

  await assert.rejects(() => confirmReceipt(created.id, debtor.id), ValidationError);
  const waiting = await declarePayment(created.id, debtor.id);
  assert.equal(waiting.estado, "aguardando_confirmacao");

  const pendingAgain = await rejectDeclaration(created.id, owner.id);
  assert.equal(pendingAgain.estado, "pendente");

  await declarePayment(created.id, debtor.id);
  const completed = await confirmReceipt(created.id, owner.id);
  assert.equal(completed.estado, "concluido");
  assert.ok(completed.confirmado_em);
});

test("obligation: somente membros podem criar/listar e devedor/recebedor têm papéis distintos", async () => {
  const { owner, debtor, trip } = await fixture();
  const outsider = await registerUser(email("ob-outsider"), "senha-segura", "Outsider");

  await assert.rejects(() => createObligation({
    tripId: trip.id,
    actorUserId: outsider.id,
    debtorUserId: debtor.id,
    creditorUserId: owner.id,
    amountCents: 100,
  }), ValidationError);

  const created = await createObligation({
    tripId: trip.id,
    actorUserId: owner.id,
    debtorUserId: debtor.id,
    creditorUserId: owner.id,
    amountCents: 100,
  });
  await assert.rejects(() => declarePayment(created.id, owner.id), ValidationError);
  await assert.rejects(() => listObligations(trip.id, outsider.id), ValidationError);
});

test("obligation: confirmação concorrente produz uma única conclusão", async () => {
  const { owner, debtor, trip } = await fixture();
  const created = await createObligation({
    tripId: trip.id,
    actorUserId: owner.id,
    debtorUserId: debtor.id,
    creditorUserId: owner.id,
    amountCents: 500,
  });
  await declarePayment(created.id, debtor.id);

  const results = await Promise.allSettled([
    confirmReceipt(created.id, owner.id),
    confirmReceipt(created.id, owner.id),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
});

test("obligation: prazo só pelo recebedor e status temporal determinístico", async () => {
  const { owner, debtor, trip } = await fixture();
  const created = await createObligation({
    tripId: trip.id,
    actorUserId: owner.id,
    debtorUserId: debtor.id,
    creditorUserId: owner.id,
    amountCents: 700,
  });

  await assert.rejects(() => setDeadline(created.id, debtor.id, "2030-01-01"), ValidationError);
  await assert.rejects(() => setDeadline(created.id, owner.id, "01/01/2030"), ValidationError);
  assert.equal(obligationInternals.isDateOnly("2030-01-01"), true);
  assert.equal(obligationInternals.isDateOnly("2030-02-30"), false);

  const updated = await setDeadline(created.id, owner.id, "2030-01-01");
  assert.equal(updated.prazo, "2030-01-01");
  assert.equal(deadlineStatus(updated, new Date("2029-12-31T00:00:00Z")), "no_prazo");
  assert.equal(deadlineStatus(updated, new Date("2030-01-02T00:00:00Z")), "atrasado");

  const cleared = await clearDeadline(created.id, owner.id);
  assert.equal(cleared.prazo, null);
  assert.equal(deadlineStatus(cleared), "sem_prazo");
});

test("obligation: prazo concluído não pode ser alterado", async () => {
  const { owner, debtor, trip } = await fixture();
  const created = await createObligation({
    tripId: trip.id,
    actorUserId: owner.id,
    debtorUserId: debtor.id,
    creditorUserId: owner.id,
    amountCents: 700,
  });
  await declarePayment(created.id, debtor.id);
  const completed = await confirmReceipt(created.id, owner.id);
  assert.equal(deadlineStatus({ estado: completed.estado, prazo: null }), "concluido");
  await assert.rejects(() => setDeadline(created.id, owner.id, "2030-01-01"), ValidationError);
});

test("obligation: encerra pool ao final da suíte", async () => {
  await pool.end();
});
