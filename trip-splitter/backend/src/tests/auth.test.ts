import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { users } from "../db/schema";
import { authenticateUser, authInternals, registerUser } from "../services/authService";
import { ValidationError } from "../types";

const uniqueEmail = () => `auth-${Date.now()}-${Math.random()}@example.com`;

test("auth: registra usuário com hash scrypt e normaliza email", async () => {
  const email = uniqueEmail();
  const user = await registerUser(email.toUpperCase(), "senha-segura", "Ana");

  assert.equal(user.email, email.toLowerCase());
  assert.equal(user.nome, "Ana");
  assert.equal("senha" in user, false);

  const [stored] = await db.select().from(users).where(eq(users.id, user.id));
  assert.ok(stored);
  assert.match(stored.senha, /^scrypt\$[0-9a-f]+\$[0-9a-f]+$/);
  assert.notEqual(stored.senha, "senha-segura");
});

test("auth: autentica senha correta e rejeita senha incorreta", async () => {
  const email = uniqueEmail();
  await registerUser(email, "senha-segura", "Bruno");

  const valid = await authenticateUser(email.toUpperCase(), "senha-segura");
  const invalid = await authenticateUser(email, "senha-errada");

  assert.equal(valid?.nome, "Bruno");
  assert.equal(invalid, null);
});

test("auth: rejeita email duplicado sem revelar detalhe", async () => {
  const email = uniqueEmail();
  await registerUser(email, "senha-segura", "Carla");

  await assert.rejects(
    () => registerUser(email.toUpperCase(), "outra-senha", "Outra Carla"),
    (error: unknown) => error instanceof ValidationError && error.message.includes("dados")
  );
});

test("auth: valida senha mínima e hash verificável", () => {
  const hash = authInternals.hashPassword("senha-segura");
  assert.equal(authInternals.verifyPassword("senha-segura", hash), true);
  assert.equal(authInternals.verifyPassword("senha-errada", hash), false);
  assert.equal(authInternals.MIN_PASSWORD_LENGTH, 8);
});

test("auth: encerra pool ao final da suíte", async () => {
  await pool.end();
});
