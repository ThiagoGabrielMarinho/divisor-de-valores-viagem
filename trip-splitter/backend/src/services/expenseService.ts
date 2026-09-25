import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { expenses, expenseShares, obligations, participants } from "../db/schema";
import { Expense, ValidationError } from "../types";
import { getTrip, isTripMember } from "./tripService";

interface AddExpenseInput {
  description: string;
  amountCents: number;
  paidBy: string;
  splitAmong: string[]; // participant ids
  actorUserId?: string; // usuário autenticado; legado pode omitir até T11
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
export async function addExpense(tripId: string, input: AddExpenseInput): Promise<Expense> {
  await getTrip(tripId);
  if (input.actorUserId && !(await isTripMember(tripId, input.actorUserId))) {
    throw new ValidationError("Usuário não participa desta viagem.");
  }

  const description = (input.description || "").trim();
  if (!description) throw new ValidationError("Descrição é obrigatória.");

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new ValidationError("Valor da despesa deve ser maior que zero.");
  }

  const splitAmong = input.splitAmong || [];
  if (splitAmong.length === 0) {
    throw new ValidationError("Selecione ao menos um participante para dividir a despesa.");
  }

  const tripParticipants = await db
    .select({ id: participants.id, user_id: participants.user_id })
    .from(participants)
    .where(eq(participants.trip_id, tripId));
  const participantIds = new Set(tripParticipants.map((p) => p.id));
  const userIdByParticipant = new Map(tripParticipants.map((p) => [p.id, p.user_id]));

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

  // Insere despesa + rateios numa transação (tudo ou nada)
  await db.transaction(async (tx) => {
    await tx.insert(expenses).values({
      id: expense.id,
      trip_id: expense.trip_id,
      description: expense.description,
      amount_cents: expense.amount_cents,
      paid_by: expense.paid_by,
      created_at: expense.created_at,
    });

    await tx.insert(expenseShares).values(
      expense.shares.map((s) => ({
        expense_id: expense.id,
        participant_id: s.participant_id,
        share_cents: s.share_cents,
      }))
    );

    // Deriva "quem paga quem": cada participante devedor deve seu rateio ao
    // pagador. O próprio pagador não gera obrigação, e rateios não positivos
    // ou participantes sem conta (user_id) são ignorados. Tudo na mesma
    // transação da despesa/rateios: falha aqui faz rollback do conjunto.
    const payerUserId = userIdByParticipant.get(input.paidBy) ?? null;
    if (payerUserId) {
      const derivedObligations = expense.shares
        .filter((s) => s.participant_id !== input.paidBy && s.share_cents > 0)
        .map((s) => ({ debtorUserId: userIdByParticipant.get(s.participant_id) ?? null, valorCents: s.share_cents }))
        .filter((o): o is { debtorUserId: string; valorCents: number } => Boolean(o.debtorUserId) && o.debtorUserId !== payerUserId);

      if (derivedObligations.length > 0) {
        await tx.insert(obligations).values(
          derivedObligations.map((o) => ({
            id: randomUUID(),
            trip_id: expense.trip_id,
            expense_id: expense.id,
            de_user_id: o.debtorUserId,
            para_user_id: payerUserId,
            valor_cents: o.valorCents,
            estado: "pendente",
          }))
        );
      }
    }
  });

  return expense;
}

// R7: listar despesas, mais recentes primeiro
export async function listExpenses(tripId: string): Promise<Expense[]> {
  await getTrip(tripId);

  const expenseRows = await db
    .select()
    .from(expenses)
    .where(eq(expenses.trip_id, tripId))
    .orderBy(desc(expenses.created_at)); // mais recentes primeiro

  const shareRows = await db
    .select({
      expense_id: expenseShares.expense_id,
      participant_id: expenseShares.participant_id,
      share_cents: expenseShares.share_cents,
    })
    .from(expenseShares)
    .innerJoin(expenses, eq(expenses.id, expenseShares.expense_id))
    .where(eq(expenses.trip_id, tripId));

  const sharesByExpense = new Map<string, Expense["shares"]>();
  for (const row of shareRows) {
    const list = sharesByExpense.get(row.expense_id) || [];
    list.push({ participant_id: row.participant_id, share_cents: row.share_cents });
    sharesByExpense.set(row.expense_id, list);
  }

  return expenseRows.map((row) => ({
    ...row,
    shares: sharesByExpense.get(row.id) || [],
  }));
}
