import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { db, pool } from "../db";
import { trips, tripMemberships } from "../db/schema";
import { createSession, registerUser } from "../services/authService";
import {
  AuthenticatedRequest,
  extractSessionToken,
  requireSession,
  requireTripMembership,
} from "../middleware/auth";

function responseMock() {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { response.statusCode = code; return response; },
    json(body: unknown) { response.body = body; return response; },
  };
  return response;
}

function requestMock(headers: Record<string, string>, params: Record<string, string> = {}): any {
  return {
    params,
    header(name: string) { return headers[name.toLowerCase()]; },
  };
}

const email = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}@example.com`;

test("middleware: extrai Bearer antes de cookie", () => {
  const req = requestMock({
    authorization: "Bearer bearer-token",
    cookie: "trip_session=cookie-token",
  });
  assert.equal(extractSessionToken(req), "bearer-token");
});

test("middleware: extrai cookie e rejeita request sem sessão com 401", async () => {
  const req = requestMock({ cookie: "theme=light; trip_session=cookie-token" });
  assert.equal(extractSessionToken(req), "cookie-token");

  const res = responseMock();
  let called = false;
  await requireSession(req, res, () => { called = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(called, false);
});

test("middleware: resolve sessão válida e autoriza owner/member", async () => {
  const owner = await registerUser(email("owner"), "senha-segura", "Owner");
  const member = await registerUser(email("member"), "senha-segura", "Member");
  const session = await createSession(owner.id);
  const tripId = randomUUID();
  await db.insert(trips).values({
    id: tripId,
    name: "Viagem middleware",
    currency: "BRL",
    created_at: new Date().toISOString(),
  });
  await db.insert(tripMemberships).values([
    { id: randomUUID(), trip_id: tripId, user_id: owner.id, papel: "owner" },
    { id: randomUUID(), trip_id: tripId, user_id: member.id, papel: "member" },
  ]);

  const req: any = requestMock({ authorization: `Bearer ${session.token}` }, { tripId });
  const res = responseMock();
  let nextCalled = false;
  await requireSession(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.authUser.id, owner.id);

  const ownerRes = responseMock();
  let ownerNext = false;
  await requireTripMembership("owner")(req, ownerRes, () => { ownerNext = true; });
  assert.equal(ownerNext, true);
  assert.equal(req.tripMembership.papel, "owner");

  const memberReq: AuthenticatedRequest = { ...requestMock({}, { tripId }), authUser: member } as AuthenticatedRequest;
  const memberRes = responseMock();
  let memberNext = false;
  await requireTripMembership("owner")(memberReq, memberRes, () => { memberNext = true; });
  assert.equal(memberNext, false);
  assert.equal(memberRes.statusCode, 403);
});

test("middleware: encerra pool ao final da suíte", async () => {
  await pool.end();
});
