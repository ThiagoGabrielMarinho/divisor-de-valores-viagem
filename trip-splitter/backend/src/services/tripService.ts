import { randomUUID } from "crypto";
import { db } from "../db/schema";
import { Trip, Participant, ValidationError, NotFoundError } from "../types";

// R1: criar uma viagem
export function createTrip(name: string): Trip {
  const trimmed = (name || "").trim();
  if (!trimmed) throw new ValidationError("Nome da viagem é obrigatório.");

  const trip: Trip = {
    id: randomUUID(),
    name: trimmed,
    currency: "BRL",
    created_at: new Date().toISOString(),
  };

  db.prepare(
    "INSERT INTO trips (id, name, currency, created_at) VALUES (?, ?, ?, ?)"
  ).run(trip.id, trip.name, trip.currency, trip.created_at);

  return trip;
}

export function getTrip(tripId: string): Trip {
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId) as unknown as
    | Trip
    | undefined;
  if (!trip) throw new NotFoundError("Viagem não encontrada.");
  return trip;
}

export function listParticipants(tripId: string): Participant[] {
  getTrip(tripId); // garante que a viagem existe
  return db
    .prepare("SELECT * FROM participants WHERE trip_id = ? ORDER BY rowid")
    .all(tripId) as unknown as Participant[];
}

// R2: adicionar participante, rejeitando nomes duplicados na mesma viagem
export function addParticipant(tripId: string, name: string): Participant {
  getTrip(tripId);

  const trimmed = (name || "").trim();
  if (!trimmed) throw new ValidationError("Nome do participante é obrigatório.");

  const existing = db
    .prepare(
      "SELECT id FROM participants WHERE trip_id = ? AND name = ? COLLATE NOCASE"
    )
    .get(tripId, trimmed);
  if (existing) {
    throw new ValidationError(
      `Já existe um participante chamado "${trimmed}" nesta viagem.`
    );
  }

  const participant: Participant = { id: randomUUID(), trip_id: tripId, name: trimmed };
  db.prepare(
    "INSERT INTO participants (id, trip_id, name) VALUES (?, ?, ?)"
  ).run(participant.id, participant.trip_id, participant.name);

  return participant;
}
