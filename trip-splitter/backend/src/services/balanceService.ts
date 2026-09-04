import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { expenses, expenseShares } from "../db/schema";
import { Balance, Settlement } from "../types";
import { getTrip, listParticipants } from "./tripService";

// R5: saldo = total pago - total consumido. Soma de todos os saldos = 0.
export async function getBalances(tripId: string): Promise<Balance[]> {
  await getTrip(tripId);
  const participants = await listParticipants(tripId);

  const paidRows = await db
    .select({
      participant_id: expenses.paid_by,
      total: sql<number>`sum(${expenses.amount_cents})`.mapWith(Number),
    })
    .from(expenses)
    .where(eq(expenses.trip_id, tripId))
    .groupBy(expenses.paid_by);

  const consumedRows = await db
    .select({
      participant_id: expenseShares.participant_id,
      total: sql<number>`sum(${expenseShares.share_cents})`.mapWith(Number),
    })
    .from(expenseShares)
    .innerJoin(expenses, eq(expenses.id, expenseShares.expense_id))
    .where(eq(expenses.trip_id, tripId))
    .groupBy(expenseShares.participant_id);

  const paidMap = new Map(paidRows.map((r) => [r.participant_id, r.total]));
  const consumedMap = new Map(consumedRows.map((r) => [r.participant_id, r.total]));

  return participants.map((p) => ({
    participant_id: p.id,
    name: p.name,
    balance_cents: (paidMap.get(p.id) || 0) - (consumedMap.get(p.id) || 0),
  }));
}

// R6: algoritmo guloso de min-cash-flow (maior credor recebe do maior devedor)
export async function getSettlements(tripId: string): Promise<Settlement[]> {
  const balances = (await getBalances(tripId)).map((b) => ({ ...b }));
  const nameOf = new Map(balances.map((b) => [b.participant_id, b.name]));

  const creditors = balances
    .filter((b) => b.balance_cents > 0)
    .sort((a, b) => b.balance_cents - a.balance_cents);
  const debtors = balances
    .filter((b) => b.balance_cents < 0)
    .sort((a, b) => a.balance_cents - b.balance_cents); // mais negativo primeiro

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(-debtor.balance_cents, creditor.balance_cents);

    if (amount > 0) {
      settlements.push({
        from: debtor.participant_id,
        from_name: nameOf.get(debtor.participant_id) || "",
        to: creditor.participant_id,
        to_name: nameOf.get(creditor.participant_id) || "",
        amount_cents: amount,
      });
    }

    debtor.balance_cents += amount;
    creditor.balance_cents -= amount;

    if (debtor.balance_cents === 0) i++;
    if (creditor.balance_cents === 0) j++;
  }

  return settlements;
}
