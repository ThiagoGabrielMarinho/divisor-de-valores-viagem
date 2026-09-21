import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { participants, tripMemberships, users } from "../db/schema";
import { registerUser } from "../services/authService";
import { addExpense, listExpenses } from "../services/expenseService";
import { addUserToTrip, createTripForUser, isTripMember } from "../services/tripService";
import { ValidationError } from "../types";

const email = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}@example.com`;

test("user trip: cria owner e participante ligado à conta", async () => {
  const owner = await registerUser(email("owner-trip"), "senha-segura", "Owner Trip");
  const trip = await createTripForUser("Viagem Autorizada", owner.id);

  const [membership] = await db.select().from(tripMemberships).where(eq(tripMemberships.trip_id, trip.id));
  const [participant] = await db.select().from(participants).where(eq(participants.trip_id, trip.id));

  assert.equal(membership.user_id, owner.id);
  assert.equal(membership.papel, "owner");
  assert.equal(participant.user_id, owner.id);
  assert.equal(await isTripMember(trip.id, owner.id), true);
});

test("user trip: owner adiciona member e member pode registrar expense", async () => {
  const owner = await registerUser(email("owner-member"), "senha-segura", "Owner");
  const member = await registerUser(email("member-expense"), "senha-segura", "Member");
  const trip = await createTripForUser("Viagem com Membros", owner.id);
  const memberParticipant = await addUserToTrip(trip.id, owner.id, member.id);

  const expense = await addExpense(trip.id, {
    description: "Jantar",
    amountCents: 1000,
    paidBy: memberParticipant.id,
    splitAmong: [memberParticipant.id],
    actorUserId: member.id,
  });

  assert.equal(expense.amount_cents, 1000);
  assert.equal(expense.paid_by, memberParticipant.id);
  assert.equal((await listExpenses(trip.id)).length >= 1, true);
});

test("user trip: member não pode adicionar outro member e ator sem membership não lança expense", async () => {
  const owner = await registerUser(email("owner-guard"), "senha-segura", "Owner");
  const member = await registerUser(email("member-guard"), "senha-segura", "Member");
  const outsider = await registerUser(email("outsider-guard"), "senha-segura", "Outsider");
  const trip = await createTripForUser("Viagem Protegida", owner.id);
  const memberParticipant = await addUserToTrip(trip.id, owner.id, member.id);

  await assert.rejects(
    () => addUserToTrip(trip.id, member.id, outsider.id),
    (error: unknown) => error instanceof ValidationError
  );
  await assert.rejects(
    () => addExpense(trip.id, {
      description: "Não autorizado",
      amountCents: 100,
      paidBy: memberParticipant.id,
      splitAmong: [memberParticipant.id],
      actorUserId: outsider.id,
    }),
    (error: unknown) => error instanceof ValidationError
  );
});

test("user trip: encerra pool ao final da suíte", async () => {
  await pool.end();
});
