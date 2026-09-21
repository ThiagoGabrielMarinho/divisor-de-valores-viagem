import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { sessions } from "../db/schema";
import { createSession, getSessionUser, registerUser, revokeSession } from "../services/authService";

const uniqueEmail = () => `session-${Date.now()}-${Math.random()}@example.com`;

test("session: token puro não é persistido e sessão válida resolve usuário", async () => {
  const user = await registerUser(uniqueEmail(), "senha-segura", "Sessão");
  const created = await createSession(user.id);

  assert.match(created.token, /^[0-9a-f]{64}$/);
  assert.ok(created.expiresAt.getTime() > Date.now());

  const [stored] = await db.select().from(sessions);
  assert.ok(stored);
  assert.notEqual(stored.token_hash, created.token);
  assert.equal(stored.token_hash.length, 64);
  assert.equal((await getSessionUser(created.token))?.id, user.id);
});

test("session: logout revoga token e sessão expirada não autentica", async () => {
  const user = await registerUser(uniqueEmail(), "senha-segura", "Logout");
  const created = await createSession(user.id, -1);

  assert.equal(await getSessionUser(created.token), null);

  const active = await createSession(user.id);
  assert.equal((await getSessionUser(active.token))?.id, user.id);
  await revokeSession(active.token);
  assert.equal(await getSessionUser(active.token), null);
});

test("session: revogar token inexistente é idempotente", async () => {
  await revokeSession("token-inexistente");
  assert.ok(true);
});

test("session: encerra pool ao final da suíte", async () => {
  await pool.end();
});
