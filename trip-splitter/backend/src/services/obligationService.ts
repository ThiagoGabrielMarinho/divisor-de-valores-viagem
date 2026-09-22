import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { obligations, tripMemberships } from "../db/schema";
import { NotFoundError, ValidationError, AuthorizationError } from "../types";

export type ObligationState = "pendente" | "aguardando_confirmacao" | "concluido";

export interface CreateObligationInput {
  tripId: string;
  actorUserId: string;
  debtorUserId: string;
  creditorUserId: string;
  amountCents: number;
  expenseId?: string;
}

async function isMember(tripId: string, userId: string): Promise<boolean> {
  const [membership] = await db
    .select({ id: tripMemberships.id })
    .from(tripMemberships)
    .where(and(eq(tripMemberships.trip_id, tripId), eq(tripMemberships.user_id, userId)));
  return Boolean(membership);
}

async function getObligation(id: string) {
  const [obligation] = await db.select().from(obligations).where(eq(obligations.id, id));
  if (!obligation) throw new NotFoundError("Obrigação não encontrada.");
  return obligation;
}

async function assertTripMember(tripId: string, userId: string): Promise<void> {
  if (!(await isMember(tripId, userId))) {
    throw new AuthorizationError("Usuário não participa desta viagem.");
  }
}

export async function createObligation(input: CreateObligationInput) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new ValidationError("Valor da obrigação deve ser maior que zero.");
  }
  if (input.debtorUserId === input.creditorUserId) {
    throw new ValidationError("Devedor e recebedor devem ser pessoas diferentes.");
  }

  await assertTripMember(input.tripId, input.actorUserId);
  await assertTripMember(input.tripId, input.debtorUserId);
  await assertTripMember(input.tripId, input.creditorUserId);

  const [created] = await db.insert(obligations).values({
    id: randomUUID(),
    trip_id: input.tripId,
    expense_id: input.expenseId,
    de_user_id: input.debtorUserId,
    para_user_id: input.creditorUserId,
    valor_cents: input.amountCents,
    estado: "pendente",
  }).returning();
  return created;
}

export async function declarePayment(obligationId: string, debtorUserId: string) {
  const obligation = await getObligation(obligationId);
  await assertTripMember(obligation.trip_id, debtorUserId);
  if (obligation.de_user_id !== debtorUserId) {
    throw new AuthorizationError("Apenas o devedor pode declarar o pagamento.");
  }

  const [updated] = await db.update(obligations)
    .set({ estado: "aguardando_confirmacao" })
    .where(and(eq(obligations.id, obligationId), eq(obligations.estado, "pendente")))
    .returning();
  if (!updated) throw new ValidationError("A obrigação não está pendente.");
  return updated;
}

export async function confirmReceipt(obligationId: string, creditorUserId: string) {
  const obligation = await getObligation(obligationId);
  await assertTripMember(obligation.trip_id, creditorUserId);
  if (obligation.para_user_id !== creditorUserId) {
    throw new AuthorizationError("Apenas o recebedor pode confirmar o pagamento.");
  }

  const [updated] = await db.update(obligations)
    .set({ estado: "concluido", confirmado_em: new Date() })
    .where(and(eq(obligations.id, obligationId), eq(obligations.estado, "aguardando_confirmacao")))
    .returning();
  if (!updated) throw new ValidationError("A obrigação não está aguardando confirmação.");
  return updated;
}

export async function rejectDeclaration(obligationId: string, creditorUserId: string) {
  const obligation = await getObligation(obligationId);
  await assertTripMember(obligation.trip_id, creditorUserId);
  if (obligation.para_user_id !== creditorUserId) {
    throw new AuthorizationError("Apenas o recebedor pode recusar o pagamento.");
  }

  const [updated] = await db.update(obligations)
    .set({ estado: "pendente", confirmado_em: null })
    .where(and(eq(obligations.id, obligationId), eq(obligations.estado, "aguardando_confirmacao")))
    .returning();
  if (!updated) throw new ValidationError("A obrigação não está aguardando confirmação.");
  return updated;
}

export async function listObligations(tripId: string, actorUserId: string) {
  await assertTripMember(tripId, actorUserId);
  return db.select().from(obligations).where(eq(obligations.trip_id, tripId));
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function setDeadline(
  obligationId: string,
  creditorUserId: string,
  deadline: string
) {
  if (!isDateOnly(deadline)) {
    throw new ValidationError("Prazo inválido. Use o formato AAAA-MM-DD.");
  }
  const obligation = await getObligation(obligationId);
  await assertTripMember(obligation.trip_id, creditorUserId);
  if (obligation.para_user_id !== creditorUserId) {
    throw new AuthorizationError("Apenas o recebedor pode definir o prazo.");
  }
  if (obligation.estado === "concluido") {
    throw new ValidationError("Não é possível alterar o prazo de uma obrigação concluída.");
  }

  const [updated] = await db.update(obligations)
    .set({ prazo: deadline })
    .where(eq(obligations.id, obligationId))
    .returning();
  return updated;
}

export async function clearDeadline(obligationId: string, creditorUserId: string) {
  const obligation = await getObligation(obligationId);
  await assertTripMember(obligation.trip_id, creditorUserId);
  if (obligation.para_user_id !== creditorUserId) {
    throw new AuthorizationError("Apenas o recebedor pode alterar o prazo.");
  }
  const [updated] = await db.update(obligations)
    .set({ prazo: null })
    .where(eq(obligations.id, obligationId))
    .returning();
  return updated;
}

export type DeadlineStatus = "sem_prazo" | "no_prazo" | "atrasado" | "concluido";

export function deadlineStatus(
  obligation: { estado: string; prazo: string | null },
  referenceDate: Date = new Date()
): DeadlineStatus {
  if (obligation.estado === "concluido") return "concluido";
  if (!obligation.prazo) return "sem_prazo";
  const reference = referenceDate.toISOString().slice(0, 10);
  return reference > obligation.prazo ? "atrasado" : "no_prazo";
}

export const obligationInternals = { isDateOnly };
