import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { expenses, obligations, tripMemberships } from "../db/schema";
import { ValidationError } from "../types";

async function isOwner(tripId: string, userId: string): Promise<boolean> {
  const [membership] = await db.select({ id: tripMemberships.id }).from(tripMemberships).where(and(
    eq(tripMemberships.trip_id, tripId),
    eq(tripMemberships.user_id, userId),
    eq(tripMemberships.papel, "owner")
  ));
  return Boolean(membership);
}

export async function resetTripExpenses(
  tripId: string,
  actorUserId: string,
  confirmed: boolean
): Promise<{ tripId: string; deletedExpenses: number; deletedObligations: number }> {
  if (!(await isOwner(tripId, actorUserId))) {
    throw new ValidationError("Apenas o owner pode resetar os gastos.");
  }
  if (!confirmed) {
    throw new ValidationError("Confirme o reset antes de apagar os gastos.");
  }

  return db.transaction(async (tx) => {
    const completed = await tx.select({ id: obligations.id }).from(obligations).where(and(
      eq(obligations.trip_id, tripId),
      eq(obligations.estado, "concluido")
    ));
    if (completed.length > 0) {
      throw new ValidationError("Não é possível resetar uma viagem com pagamento concluído.");
    }

    const deletedObligations = await tx.delete(obligations)
      .where(eq(obligations.trip_id, tripId))
      .returning({ id: obligations.id });
    const deletedExpenses = await tx.delete(expenses)
      .where(eq(expenses.trip_id, tripId))
      .returning({ id: expenses.id });

    return { tripId, deletedExpenses: deletedExpenses.length, deletedObligations: deletedObligations.length };
  });
}
