import { randomUUID } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { trips, participants } from "../db/schema";
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
