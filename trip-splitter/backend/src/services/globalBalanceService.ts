import { inArray, eq, ne } from "drizzle-orm";
import { db } from "../db";
import { obligations, trips, tripMemberships, users } from "../db/schema";
import { ValidationError } from "../types";

export interface GlobalBalanceDetail {
  obligation_id: string;
  trip_id: string;
  trip_name: string;
  amount_cents: number;
  direction: "a_receber" | "a_pagar";
  estado: string;
  prazo: string | null;
}

export interface GlobalBalance {
  user_id: string;
  user_name: string;
  net_cents: number;
  direction: "a_receber" | "a_pagar";
  details: GlobalBalanceDetail[];
}

export async function getGlobalBalances(userId: string): Promise<GlobalBalance[]> {
  const memberships = await db
    .select({ trip_id: tripMemberships.trip_id })
    .from(tripMemberships)
    .where(eq(tripMemberships.user_id, userId));

  const tripIds = memberships.map((m) => m.trip_id);
  if (tripIds.length === 0) return [];

  const rows = await db
    .select({
      obligation: obligations,
      tripName: trips.name,
    })
    .from(obligations)
    .innerJoin(trips, eq(trips.id, obligations.trip_id))
    .where(
      inArray(obligations.trip_id, tripIds)
    );

  const userIds = new Set<string>();
  const grouped = new Map<string, { net: number; details: GlobalBalanceDetail[] }>();

  for (const row of rows) {
    const obligation = row.obligation;
    if (obligation.estado === "concluido") continue;

    let otherUserId: string;
    let signed: number;
    let direction: "a_receber" | "a_pagar";
    if (obligation.para_user_id === userId) {
      otherUserId = obligation.de_user_id;
      signed = obligation.valor_cents;
      direction = "a_receber";
    } else if (obligation.de_user_id === userId) {
      otherUserId = obligation.para_user_id;
      signed = -obligation.valor_cents;
      direction = "a_pagar";
    } else {
      continue;
    }

    userIds.add(otherUserId);
    const current = grouped.get(otherUserId) || { net: 0, details: [] };
    current.net += signed;
    current.details.push({
      obligation_id: obligation.id,
      trip_id: obligation.trip_id,
      trip_name: row.tripName,
      amount_cents: obligation.valor_cents,
      direction,
      estado: obligation.estado,
      prazo: obligation.prazo,
    });
    grouped.set(otherUserId, current);
  }

  if (userIds.size === 0) return [];
  const people = await db.select({ id: users.id, name: users.nome }).from(users).where(inArray(users.id, [...userIds]));
  const names = new Map(people.map((person) => [person.id, person.name]));

  return [...grouped.entries()]
    .filter(([, value]) => value.net !== 0)
    .map(([otherId, value]) => ({
      user_id: otherId,
      user_name: names.get(otherId) || "",
      net_cents: value.net,
      direction: value.net > 0 ? ("a_receber" as const) : ("a_pagar" as const),
      details: value.details,
    }))
    .sort((a, b) => Math.abs(b.net_cents) - Math.abs(a.net_cents));
}

export async function getGlobalBalanceDetails(userId: string, otherUserId: string) {
  const balances = await getGlobalBalances(userId);
  const balance = balances.find((item) => item.user_id === otherUserId);
  if (!balance) throw new ValidationError("Não há saldo pendente com essa pessoa.");
  return balance;
}
