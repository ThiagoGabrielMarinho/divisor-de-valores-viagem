import { db } from "../db/schema";
import { Balance, Settlement, Participant } from "../types";
import { getTrip, listParticipants } from "./tripService";

// R5: saldo = total pago - total consumido. Soma de todos os saldos = 0.
export function getBalances(tripId: string): Balance[] {
  getTrip(tripId);
  const participants = listParticipants(tripId);

  const paidRows = db
    .prepare(
      `SELECT paid_by as participant_id, SUM(amount_cents) as total
       FROM expenses WHERE trip_id = ? GROUP BY paid_by`
    )
    .all(tripId) as unknown as { participant_id: string; total: number }[];

  const consumedRows = db
    .prepare(
      `SELECT es.participant_id as participant_id, SUM(es.share_cents) as total
       FROM expense_shares es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.trip_id = ?
       GROUP BY es.participant_id`
    )
    .all(tripId) as unknown as { participant_id: string; total: number }[];

  const paidMap = new Map(paidRows.map((r) => [r.participant_id, r.total]));
  const consumedMap = new Map(consumedRows.map((r) => [r.participant_id, r.total]));

  return participants.map((p) => ({
    participant_id: p.id,
    name: p.name,
    balance_cents: (paidMap.get(p.id) || 0) - (consumedMap.get(p.id) || 0),
  }));
}

// R6: algoritmo guloso de min-cash-flow (maior credor recebe do maior devedor)
export function getSettlements(tripId: string): Settlement[] {
  const balances = getBalances(tripId).map((b) => ({ ...b }));
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
