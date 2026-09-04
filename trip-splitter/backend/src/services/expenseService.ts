import { randomUUID } from "crypto";
import { db } from "../db/schema";
import { Expense, ValidationError } from "../types";
import { getTrip } from "./tripService";

interface AddExpenseInput {
  description: string;
  amountCents: number;
  paidBy: string;
  splitAmong: string[]; // participant ids
}

// R4: divisão igualitária com distribuição do resto (centavos) aos primeiros da lista
export function splitEqually(amountCents: number, splitAmong: string[]): Map<string, number> {
  const n = splitAmong.length;
  const base = Math.floor(amountCents / n);
  const remainder = amountCents - base * n;

  const shares = new Map<string, number>();
  splitAmong.forEach((participantId, index) => {
    shares.set(participantId, base + (index < remainder ? 1 : 0));
  });
  return shares;
}

// R3 + R8: registrar despesa com validação
export function addExpense(tripId: string, input: AddExpenseInput): Expense {
  getTrip(tripId);

  const description = (input.description || "").trim();
  if (!description) throw new ValidationError("Descrição é obrigatória.");

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new ValidationError("Valor da despesa deve ser maior que zero.");
  }

  const splitAmong = input.splitAmong || [];
  if (splitAmong.length === 0) {
    throw new ValidationError("Selecione ao menos um participante para dividir a despesa.");
  }

  const participantIds = new Set(
    (db.prepare("SELECT id FROM participants WHERE trip_id = ?").all(tripId) as unknown as { id: string }[]).map(
      (p) => p.id
    )
  );

  if (!participantIds.has(input.paidBy)) {
    throw new ValidationError("Quem pagou precisa ser um participante da viagem.");
  }
  for (const id of splitAmong) {
    if (!participantIds.has(id)) {
      throw new ValidationError("Todos os participantes da divisão precisam pertencer à viagem.");
    }
  }

  const shares = splitEqually(input.amountCents, splitAmong);

  const expense: Expense = {
    id: randomUUID(),
    trip_id: tripId,
    description,
    amount_cents: input.amountCents,
    paid_by: input.paidBy,
    created_at: new Date().toISOString(),
    shares: Array.from(shares.entries()).map(([participant_id, share_cents]) => ({
      participant_id,
      share_cents,
    })),
  };

  const insertExpense = db.prepare(
    "INSERT INTO expenses (id, trip_id, description, amount_cents, paid_by, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertShare = db.prepare(
    "INSERT INTO expense_shares (expense_id, participant_id, share_cents) VALUES (?, ?, ?)"
  );

  // node:sqlite não tem helper .transaction() como better-sqlite3; controlamos manualmente
  db.exec("BEGIN");
  try {
    insertExpense.run(
      expense.id,
      expense.trip_id,
      expense.description,
      expense.amount_cents,
      expense.paid_by,
      expense.created_at
    );
    for (const s of expense.shares) {
      insertShare.run(expense.id, s.participant_id, s.share_cents);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return expense;
}

// R7: listar despesas, mais recentes primeiro
export function listExpenses(tripId: string): Expense[] {
  getTrip(tripId);

  const rows = db
    .prepare("SELECT * FROM expenses WHERE trip_id = ? ORDER BY created_at DESC")
    .all(tripId) as unknown as Omit<Expense, "shares">[];

  const shareStmt = db.prepare(
    "SELECT participant_id, share_cents FROM expense_shares WHERE expense_id = ?"
  );

  return rows.map((row) => ({
    ...row,
    shares: shareStmt.all(row.id) as unknown as Expense["shares"],
  }));
}
