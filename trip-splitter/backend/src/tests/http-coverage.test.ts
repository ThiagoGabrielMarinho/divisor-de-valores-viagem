import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app";
import { pool } from "../db";

// Cobertura HTTP dos ACs que antes só tinham evidência de service (T16).
// Cada teste sobe o app real, exercita o contrato HTTP e afirma status + payload.

const email = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}@example.com`;

interface Registered {
  id: string;
  cookie: string;
}

async function register(base: string, name: string): Promise<Registered> {
  const response = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: email(name), password: "senha-segura", name }),
  });
  assert.equal(response.status, 201);
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  const user = (await response.json()) as { id: string };
  return { id: user.id, cookie: cookie.split(";")[0] };
}

async function createTrip(base: string, cookie: string, name: string): Promise<string> {
  const response = await fetch(`${base}/api/trips`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ name }),
  });
  assert.equal(response.status, 201);
  return ((await response.json()) as { id: string }).id;
}

function withServer(run: (base: string) => Promise<void>) {
  return async () => {
    const server = createApp().listen(0);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Servidor não abriu porta.");
    const base = `http://127.0.0.1:${address.port}`;
    try {
      await run(base);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  };
}

// API-04: outsider recebe 403 sem dados ao LER a viagem.
test("http: outsider recebe 403 ao ler viagem alheia", withServer(async (base) => {
  const owner = await register(base, "Owner04");
  const outsider = await register(base, "Outsider04");
  const tripId = await createTrip(base, owner.cookie, "Viagem 04");

  const read = await fetch(`${base}/api/trips/${tripId}`, { headers: { cookie: outsider.cookie } });
  assert.equal(read.status, 403);
  const body = (await read.json()) as { error: string };
  assert.equal(typeof body.error, "string");
  assert.ok(!("participants" in body));
}));

// API-09: member em ação owner-only (adicionar participante) recebe 403 via HTTP.
test("http: member em ação owner-only recebe 403", withServer(async (base) => {
  const owner = await register(base, "Owner09");
  const member = await register(base, "Member09");
  const target = await register(base, "Target09");
  const tripId = await createTrip(base, owner.cookie, "Viagem 09");

  const added = await fetch(`${base}/api/trips/${tripId}/participants`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: owner.cookie },
    body: JSON.stringify({ userId: member.id }),
  });
  assert.equal(added.status, 201);

  const memberTriesOwnerAction = await fetch(`${base}/api/trips/${tripId}/participants`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: member.cookie },
    body: JSON.stringify({ userId: target.id }),
  });
  assert.equal(memberTriesOwnerAction.status, 403);
}));

// API-10 + API-11: despesa válida persiste rateios; despesa inválida retorna 400 sem gravação parcial.
test("http: despesa válida persiste rateios e inválida retorna 400 sem gravar", withServer(async (base) => {
  const owner = await register(base, "Owner10");
  const tripId = await createTrip(base, owner.cookie, "Viagem 10");

  const tripBody = (await (await fetch(`${base}/api/trips/${tripId}`, { headers: { cookie: owner.cookie } })).json()) as {
    participants: { id: string }[];
  };
  const ownerParticipant = tripBody.participants[0].id;

  const valid = await fetch(`${base}/api/trips/${tripId}/expenses`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: owner.cookie },
    body: JSON.stringify({ description: "Hotel", amountCents: 1000, paidBy: ownerParticipant, splitAmong: [ownerParticipant] }),
  });
  assert.equal(valid.status, 201);
  const created = (await valid.json()) as { amount_cents: number; shares: { participant_id: string; share_cents: number }[] };
  assert.equal(created.amount_cents, 1000);
  assert.equal(created.shares.length, 1);
  assert.equal(created.shares[0].share_cents, 1000);

  const before = (await (await fetch(`${base}/api/trips/${tripId}/expenses`, { headers: { cookie: owner.cookie } })).json()) as unknown[];

  const invalid = await fetch(`${base}/api/trips/${tripId}/expenses`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: owner.cookie },
    body: JSON.stringify({ description: "Grátis", amountCents: 0, paidBy: ownerParticipant, splitAmong: [ownerParticipant] }),
  });
  assert.equal(invalid.status, 400);

  const after = (await (await fetch(`${base}/api/trips/${tripId}/expenses`, { headers: { cookie: owner.cookie } })).json()) as unknown[];
  assert.equal(after.length, before.length);
}));

// API-18: recebedor define prazo via HTTP e o valor é persistido.
test("http: recebedor define prazo da obrigação", withServer(async (base) => {
  const owner = await register(base, "Owner18");
  const debtor = await register(base, "Debtor18");
  const tripId = await createTrip(base, owner.cookie, "Viagem 18");
  await fetch(`${base}/api/trips/${tripId}/participants`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: owner.cookie },
    body: JSON.stringify({ userId: debtor.id }),
  });

  const obligation = (await (
    await fetch(`${base}/api/trips/${tripId}/obligations`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: owner.cookie },
      body: JSON.stringify({ debtorUserId: debtor.id, creditorUserId: owner.id, amountCents: 700 }),
    })
  ).json()) as { id: string };

  // Devedor não pode definir prazo → 403.
  const debtorAttempt = await fetch(`${base}/api/obligations/${obligation.id}/deadline`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: debtor.cookie },
    body: JSON.stringify({ deadline: "2030-01-01" }),
  });
  assert.equal(debtorAttempt.status, 403);

  const set = await fetch(`${base}/api/obligations/${obligation.id}/deadline`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: owner.cookie },
    body: JSON.stringify({ deadline: "2030-01-01" }),
  });
  assert.equal(set.status, 200);
  const updated = (await set.json()) as { prazo: string };
  assert.equal(updated.prazo, "2030-01-01");
}));

// API-21: reset recusado (sem confirmação e por não-owner) preserva os dados.
test("http: reset recusado preserva despesas", withServer(async (base) => {
  const owner = await register(base, "Owner21");
  const member = await register(base, "Member21");
  const tripId = await createTrip(base, owner.cookie, "Viagem 21");
  await fetch(`${base}/api/trips/${tripId}/participants`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: owner.cookie },
    body: JSON.stringify({ userId: member.id }),
  });

  const tripBody = (await (await fetch(`${base}/api/trips/${tripId}`, { headers: { cookie: owner.cookie } })).json()) as {
    participants: { id: string }[];
  };
  const ownerParticipant = tripBody.participants[0].id;
  await fetch(`${base}/api/trips/${tripId}/expenses`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: owner.cookie },
    body: JSON.stringify({ description: "Hotel", amountCents: 1000, paidBy: ownerParticipant, splitAmong: [ownerParticipant] }),
  });

  // Sem confirmação → 400 (ValidationError).
  const noConfirm = await fetch(`${base}/api/trips/${tripId}/reset`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: owner.cookie },
    body: JSON.stringify({ confirmed: false }),
  });
  assert.equal(noConfirm.status, 400);

  // Member (não owner) → 403.
  const memberReset = await fetch(`${base}/api/trips/${tripId}/reset`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: member.cookie },
    body: JSON.stringify({ confirmed: true }),
  });
  assert.equal(memberReset.status, 403);

  // Dados permanecem.
  const after = (await (await fetch(`${base}/api/trips/${tripId}/expenses`, { headers: { cookie: owner.cookie } })).json()) as unknown[];
  assert.equal(after.length, 1);
}));

// API-25: detalhes do resumo global expõem viagem, estado e prazo via HTTP.
test("http: detalhes do resumo global trazem viagem, estado e prazo", withServer(async (base) => {
  const ana = await register(base, "Ana25");
  const bruno = await register(base, "Bruno25");
  const tripId = await createTrip(base, ana.cookie, "Viagem 25");
  await fetch(`${base}/api/trips/${tripId}/participants`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ana.cookie },
    body: JSON.stringify({ userId: bruno.id }),
  });
  await fetch(`${base}/api/trips/${tripId}/obligations`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ana.cookie },
    body: JSON.stringify({ debtorUserId: bruno.id, creditorUserId: ana.id, amountCents: 5000 }),
  });

  const summary = await fetch(`${base}/api/account/balances`, { headers: { cookie: ana.cookie } });
  assert.equal(summary.status, 200);
  const balances = (await summary.json()) as Array<{ user_id: string; net_cents: number; direction: string }>;
  assert.equal(balances.length, 1);
  assert.equal(balances[0].net_cents, 5000);
  assert.equal(balances[0].direction, "a_receber");

  const details = await fetch(`${base}/api/account/balances/${bruno.id}`, { headers: { cookie: ana.cookie } });
  assert.equal(details.status, 200);
  const detail = (await details.json()) as {
    details: Array<{ trip_id: string; trip_name: string; estado: string; prazo: string | null }>;
  };
  assert.equal(detail.details.length, 1);
  assert.equal(detail.details[0].trip_id, tripId);
  assert.equal(detail.details[0].trip_name, "Viagem 25");
  assert.equal(detail.details[0].estado, "pendente");
  assert.equal(detail.details[0].prazo, null);
}));

test("http-coverage: encerra pool ao final da suíte", async () => {
  await pool.end();
});
