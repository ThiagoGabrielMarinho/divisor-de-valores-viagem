import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { users, sessions } from "../db/schema";
import { ValidationError } from "../types";

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  created_at: Date;
}

const HASH_PREFIX = "scrypt$";
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const derived = scryptSync(password, salt, KEY_BYTES);
  return `${HASH_PREFIX}${salt.toString("hex")}$${derived.toString("hex")}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = String(storedHash || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  try {
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    const actual = scryptSync(password, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function toAuthUser(user: typeof users.$inferSelect): AuthUser {
  return {
    id: user.id,
    email: user.email,
    nome: user.nome,
    created_at: user.created_at,
  };
}

export async function registerUser(
  email: string,
  password: string,
  nome: string
): Promise<AuthUser> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(nome || "").trim();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new ValidationError("Email inválido.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError("A senha deve ter pelo menos 8 caracteres.");
  }
  if (!normalizedName) {
    throw new ValidationError("Nome é obrigatório.");
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${normalizedEmail})`);

  if (existing) {
    throw new ValidationError("Não foi possível criar a conta com esses dados.");
  }

  const user = {
    id: randomBytes(16).toString("hex"),
    email: normalizedEmail,
    // Compatibilidade temporária: a coluna se chama senha no DDL legado,
    // mas seu conteúdo é sempre um hash scrypt, nunca a senha original.
    senha: hashPassword(password),
    nome: normalizedName,
  };

  const [created] = await db.insert(users).values(user).returning();
  return toAuthUser(created);
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const normalizedEmail = normalizeEmail(email);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail));

  // Resposta neutra: não diferencia email inexistente de senha inválida.
  if (!user || !verifyPassword(password, user.senha)) return null;
  return toAuthUser(user);
}

export async function createSession(userId: string, ttlMs = 8 * 60 * 60 * 1000): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ttlMs);
  const session = {
    id: randomBytes(16).toString("hex"),
    user_id: userId,
    token_hash: createHash("sha256").update(token).digest("hex"),
    expires_at: expiresAt,
  };

  await db.insert(sessions).values(session);
  return { token, expiresAt };
}

export async function getSessionUser(token: string): Promise<AuthUser | null> {
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [session] = await db.select().from(sessions).where(eq(sessions.token_hash, tokenHash));
  if (!session || session.revoked_at || session.expires_at.getTime() <= Date.now()) return null;

  const [user] = await db.select().from(users).where(eq(users.id, session.user_id));
  return user ? toAuthUser(user) : null;
}

export async function revokeSession(token: string): Promise<void> {
  if (!token) return;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.update(sessions)
    .set({ revoked_at: new Date() })
    .where(eq(sessions.token_hash, tokenHash));
}

export const authInternals = {
  hashPassword,
  verifyPassword,
  normalizeEmail,
  MIN_PASSWORD_LENGTH,
};
