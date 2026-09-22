import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app";
import { pool } from "../db";

const email = () => `route-${Date.now()}-${Math.random()}@example.com`;

test("routes: protege criação de viagem e expõe auth/session contract", async () => {
  const server = createApp().listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Servidor não abriu porta.");
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const unauthorized = await fetch(`${base}/api/trips`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Sem login" }),
    });
    assert.equal(unauthorized.status, 401);

    const register = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email(), password: "senha-segura", name: "Route User" }),
    });
    assert.equal(register.status, 201);
    const cookie = register.headers.get("set-cookie");
    assert.ok(cookie);
    const sessionCookie = cookie!.split(";")[0];

    const created = await fetch(`${base}/api/trips`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: sessionCookie },
      body: JSON.stringify({ name: "Viagem HTTP" }),
    });
    assert.equal(created.status, 201);
    const trip = await created.json() as { id: string; currency: string };
    assert.equal(trip.currency, "BRL");

    const fetched = await fetch(`${base}/api/trips/${trip.id}`, { headers: { cookie: sessionCookie } });
    assert.equal(fetched.status, 200);
    const body = await fetched.json() as { id: string; participants: unknown[] };
    assert.equal(body.id, trip.id);
    assert.equal(body.participants.length, 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
  }
});
