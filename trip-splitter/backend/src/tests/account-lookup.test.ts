import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app";
import { pool } from "../db";

const email = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}@example.com`;

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

async function register(base: string, emailValue: string, nome: string): Promise<string> {
  const response = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: emailValue, password: "senha-segura", name: nome }),
  });
  assert.equal(response.status, 201);
  return response.headers.get("set-cookie")!.split(";")[0];
}

test("lookup: encontra conta por email e não expõe senha", withServer(async (base) => {
  const targetEmail = email("lookup-target");
  await register(base, targetEmail, "Alvo Lookup");
  const cookie = await register(base, email("lookup-actor"), "Ator Lookup");

  const found = await fetch(`${base}/api/account/lookup?email=${encodeURIComponent(targetEmail)}`, { headers: { cookie } });
  assert.equal(found.status, 200);
  const body = (await found.json()) as Record<string, unknown>;
  assert.equal(body.email, targetEmail.toLowerCase());
  assert.equal(body.nome, "Alvo Lookup");
  assert.equal(typeof body.id, "string");
  assert.ok(!("senha" in body));
  assert.ok(!("created_at" in body));
}));

test("lookup: email inexistente retorna 404", withServer(async (base) => {
  const cookie = await register(base, email("lookup-404"), "Sem Alvo");
  const response = await fetch(`${base}/api/account/lookup?email=${encodeURIComponent(email("nao-existe"))}`, { headers: { cookie } });
  assert.equal(response.status, 404);
}));

test("lookup: sem email na query retorna 400", withServer(async (base) => {
  const cookie = await register(base, email("lookup-400"), "Sem Email");
  const response = await fetch(`${base}/api/account/lookup`, { headers: { cookie } });
  assert.equal(response.status, 400);
}));

test("lookup: sem sessão retorna 401", withServer(async (base) => {
  const response = await fetch(`${base}/api/account/lookup?email=${encodeURIComponent(email("x"))}`);
  assert.equal(response.status, 401);
}));

test("account-lookup: encerra pool ao final da suíte", async () => {
  await pool.end();
});
