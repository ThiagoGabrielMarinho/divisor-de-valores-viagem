import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app";
import { pool } from "../db";

const email = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}@example.com`;

async function register(base: string, name: string, emailValue: string) {
  const response = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: emailValue, password: "senha-segura", name }),
  });
  assert.equal(response.status, 201);
  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);
  return { user: await response.json() as { id: string }, cookie: cookie.split(";")[0] };
}

test("routes: membership, roles, obligation transitions and reset status", async () => {
  const server = createApp().listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Servidor não abriu porta.");
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const owner = await register(base, "Owner HTTP", email("owner-http"));
    const member = await register(base, "Member HTTP", email("member-http"));
    const outsider = await register(base, "Outsider HTTP", email("outsider-http"));

    const createdTrip = await fetch(`${base}/api/trips`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: owner.cookie },
      body: JSON.stringify({ name: "Autorização HTTP" }),
    });
    assert.equal(createdTrip.status, 201);
    const trip = await createdTrip.json() as { id: string };

    const added = await fetch(`${base}/api/trips/${trip.id}/participants`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: owner.cookie },
      body: JSON.stringify({ userId: member.user.id }),
    });
    assert.equal(added.status, 201);

    const outsiderList = await fetch(`${base}/api/trips/${trip.id}/obligations`, { headers: { cookie: outsider.cookie } });
    assert.equal(outsiderList.status, 403);

    const createdObligation = await fetch(`${base}/api/trips/${trip.id}/obligations`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: owner.cookie },
      body: JSON.stringify({ debtorUserId: member.user.id, creditorUserId: owner.user.id, amountCents: 500 }),
    });
    assert.equal(createdObligation.status, 201);
    const obligation = await createdObligation.json() as { id: string };

    const declared = await fetch(`${base}/api/obligations/${obligation.id}/declare`, {
      method: "POST", headers: { cookie: member.cookie },
    });
    assert.equal(declared.status, 200);

    const wrongConfirm = await fetch(`${base}/api/obligations/${obligation.id}/confirm`, {
      method: "POST", headers: { cookie: member.cookie },
    });
    assert.equal(wrongConfirm.status, 403);

    const confirmed = await fetch(`${base}/api/obligations/${obligation.id}/confirm`, {
      method: "POST", headers: { cookie: owner.cookie },
    });
    assert.equal(confirmed.status, 200);

    const reset = await fetch(`${base}/api/trips/${trip.id}/reset`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: owner.cookie },
      body: JSON.stringify({ confirmed: true }),
    });
    assert.equal(reset.status, 409);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
  }
});
