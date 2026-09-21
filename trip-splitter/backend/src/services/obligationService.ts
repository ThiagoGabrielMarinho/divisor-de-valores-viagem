import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { obligations, tripMemberships } from "../db/schema";
import { NotFoundError, ValidationError } from "../types";

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
    throw new ValidationError("Usuário não participa desta viagem.");
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
  if (obligation.de_user_id !== debtorUserId) {
    throw new ValidationError("Apenas o devedor pode declarar o pagamento.");
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
  if (obligation.para_user_id !== creditorUserId) {
    throw new ValidationError("Apenas o recebedor pode confirmar o pagamento.");
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
  if (obligation.para_user_id !== creditorUserId) {
    throw new ValidationError("Apenas o recebedor pode recusar o pagamento.");
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
