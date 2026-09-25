import { randomUUID } from "crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { trips, participants, users, tripMemberships } from "../db/schema";
import { Trip, Participant, ValidationError, NotFoundError } from "../types";

// R1: criar uma viagem
export async function createTrip(name: string): Promise<Trip> {
  const trimmed = (name || "").trim();
  if (!trimmed) throw new ValidationError("Nome da viagem é obrigatório.");

  const trip: Trip = {
    id: randomUUID(),
    name: trimmed,
    currency: "BRL",
    created_at: new Date().toISOString(),
  };

  await db.insert(trips).values(trip);

  return trip;
}

export async function getTrip(tripId: string): Promise<Trip> {
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
  if (!trip) throw new NotFoundError("Viagem não encontrada.");
  return trip;
}

export async function listParticipants(tripId: string): Promise<Participant[]> {
  await getTrip(tripId); // garante que a viagem existe
  return db.select().from(participants).where(eq(participants.trip_id, tripId));
}

// R2: adicionar participante, rejeitando nomes duplicados na mesma viagem (case-insensitive)
export async function addParticipant(tripId: string, name: string): Promise<Participant> {
  await getTrip(tripId);

  const trimmed = (name || "").trim();
  if (!trimmed) throw new ValidationError("Nome do participante é obrigatório.");

  const [existing] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      sql`${participants.trip_id} = ${tripId} AND lower(${participants.name}) = lower(${trimmed})`
    );

  if (existing) {
    throw new ValidationError(
      `Já existe um participante chamado "${trimmed}" nesta viagem.`
    );
  }

  const participant: Participant = { id: randomUUID(), trip_id: tripId, name: trimmed };
  await db.insert(participants).values(participant);

  return participant;
}

// Cria uma viagem já vinculada ao usuário autenticado como owner.
export async function createTripForUser(name: string, userId: string): Promise<Trip> {
  const trip = await createTrip(name);
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("Usuário não encontrado.");

  await db.transaction(async (tx) => {
    await tx.insert(tripMemberships).values({
      id: randomUUID(),
      trip_id: trip.id,
      user_id: userId,
      papel: "owner",
    });
    await tx.insert(participants).values({
      id: randomUUID(),
      trip_id: trip.id,
      user_id: userId,
      name: user.nome,
    });
  });

  return trip;
}

// Owner adiciona uma conta existente como member e cria seu participante local.
export async function addUserToTrip(
  tripId: string,
  ownerUserId: string,
  targetUserId: string
): Promise<Participant> {
  const [ownerMembership] = await db
    .select()
    .from(tripMemberships)
    .where(
      sql`${tripMemberships.trip_id} = ${tripId} AND ${tripMemberships.user_id} = ${ownerUserId} AND ${tripMemberships.papel} = 'owner'`
    );
  if (!ownerMembership) throw new ValidationError("Apenas o owner pode adicionar membros.");

  const [user] = await db.select().from(users).where(eq(users.id, targetUserId));
  if (!user) throw new NotFoundError("Usuário não encontrado.");

  const [existing] = await db
    .select()
    .from(tripMemberships)
    .where(sql`${tripMemberships.trip_id} = ${tripId} AND ${tripMemberships.user_id} = ${targetUserId}`);
  if (existing) throw new ValidationError("Usuário já participa desta viagem.");

  const participant: Participant = {
    id: randomUUID(),
    trip_id: tripId,
    user_id: targetUserId,
    name: user.nome,
  };

  await db.transaction(async (tx) => {
    await tx.insert(tripMemberships).values({
      id: randomUUID(),
      trip_id: tripId,
      user_id: targetUserId,
      papel: "member",
    });
    await tx.insert(participants).values(participant);
  });

  return participant;
}

export async function listTripsForUser(userId: string): Promise<Trip[]> {
  const memberships = await db
    .select({ trip_id: tripMemberships.trip_id })
    .from(tripMemberships)
    .where(eq(tripMemberships.user_id, userId));
  if (memberships.length === 0) return [];
  return db.select().from(trips).where(inArray(trips.id, memberships.map((m) => m.trip_id)));
}

export async function isTripMember(tripId: string, userId: string): Promise<boolean> {
  const [membership] = await db
    .select({ id: tripMemberships.id })
    .from(tripMemberships)
    .where(sql`${tripMemberships.trip_id} = ${tripId} AND ${tripMemberships.user_id} = ${userId}`);
  return Boolean(membership);
}
