import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { hash } from "bcryptjs";
import { encode } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { emptyState, now, publicUser, type StoredUser } from "../src/lib/domain";
import { authVersion, requireCurrentSession } from "../src/lib/session-version";

const require = createRequire(import.meta.url);
const nextHeaders = require("next/headers");
const NextAuth = require("next-auth").default;
const origin = "http://localhost:3000";
const originalCwd = process.cwd();
let temp: string;
let cookies: Record<string, string> = {};
let api: typeof import("../src/lib/api");
let store: typeof import("../src/lib/store");
let auth: typeof import("../src/lib/auth");
let fixtureNumber = 0;
const password = "original-test-password";

before(async () => {
  // Never use the workspace database or overwrite local demo data.
  delete process.env.MONGODB_URI;
  process.env.NEXTAUTH_URL = origin;
  process.env.NEXTAUTH_SECRET = "isolated-auth-regression-test-secret";
  temp = await mkdtemp(path.join(os.tmpdir(), "kidvest-auth-"));
  process.chdir(temp);
  mock.method(nextHeaders, "headers", async () => new Headers({ host: "localhost:3000" }));
  mock.method(nextHeaders, "cookies", async () => ({ getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })) }));
  // Use the CJS entry path like Next's bundler: NextAuth v4's providers
  // expose nested defaults when imported by a native Node ESM runner.
  store = require("../src/lib/store");
  auth = require("../src/lib/auth");
  api = require("../src/lib/api");
});
after(async () => {
  mock.restoreAll();
  process.chdir(originalCwd);
  if (temp) await rm(temp, { recursive: true, force: true });
});

async function fixture() {
  cookies = {};
  fixtureNumber++;
  const common = { name: "Test account", avatar: "fox", isDemo: true, completedLessons: [], notifications: true, passwordHash: await hash(password, 4), revision: 0, createdAt: now(), dailyLimit: 1000, monthlyLimit: 5000 };
  // Intentionally omit authVersion to exercise existing persisted accounts.
  const parent: StoredUser = { ...common, id: "parent", role: "parent", identifier: `parent-${fixtureNumber}@example.invalid` };
  const kid: StoredUser = { ...common, id: "kid", role: "kid", parentId: parent.id, identifier: `test-kid-${fixtureNumber}` };
  const sibling: StoredUser = { ...kid, id: "sibling", identifier: `test-sibling-${fixtureNumber}` };
  const other: StoredUser = { ...parent, id: "other", identifier: `other-${fixtureNumber}@example.invalid` };
  await store.mutateState(parent.id, s => {
    Object.assign(s, emptyState());
    s.users.push(parent, kid, sibling, other);
    for (const k of [kid, sibling]) s.wallets.push({ id: `wallet-${k.id}`, parentId: parent.id, kidId: k.id, balance: 0, currency: "USD" });
  });
  return { parent, kid, sibling, other };
}

async function login(user: StoredUser, suppliedPassword = password, role = user.role) {
  const provider = auth.authOptions.providers[0] as unknown as { options: { authorize: (raw: unknown, req: unknown) => Promise<unknown> } };
  return provider.options.authorize({ identifier: user.identifier, password: suppliedPassword, role }, { headers: { "x-forwarded-for": `test-${fixtureNumber}-${user.id}` } }) as Promise<(StoredUser & { authVersion: number }) | null>;
}
async function cookieFor(user: StoredUser, suppliedPassword = password) {
  const signedIn = await login(user, suppliedPassword);
  assert.ok(signedIn);
  const jwt = auth.authOptions.callbacks!.jwt!;
  const token = await jwt({ token: {}, user: signedIn, account: null, trigger: "signIn" });
  return encode({ token, secret: auth.sessionSecret(), maxAge: 86400 });
}
function useCookie(cookie?: string) { cookies = cookie ? { "next-auth.session-token": cookie } : {}; }
async function request(route: string, method = "GET", data?: unknown) {
  const req = new NextRequest(`${origin}/api/${route}`, { method, headers: { origin, host: "localhost:3000", "content-type": "application/json" }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  return api.handleApi(req, route.split("/"));
}
async function authRequest(action: string, method = "GET", data?: unknown) {
  return NextAuth(auth.authOptions)(new NextRequest(`${origin}/api/auth/${action}`, { method, ...(data === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(data) }) }), { params: Promise.resolve({ nextauth: [action] }) }) as Promise<Response>;
}

test("parent password change rejects every old cookie, preserves other accounts, and requires the new password", async () => {
  const { parent, kid } = await fixture();
  const first = await cookieFor(parent);
  const second = await cookieFor(parent);
  const childCookie = await cookieFor(kid);
  useCookie(first);
  assert.equal((await request("kv/settings")).status, 200);
  assert.equal((await request("kv/settings", "PATCH", { currentPassword: password, newPassword: "replacement-password" })).status, 200);
  const saved = (await store.findUser(parent.id))!;
  assert.equal(saved.authVersion, 1);
  assert.equal(saved.revision, 0);
  for (const cookie of [first, second]) {
    useCookie(cookie);
    assert.equal((await request("kv/settings")).status, 401);
    assert.equal((await request("kv/payments", "POST", { kidId: kid.id, amount: 1 })).status, 401);
    assert.deepEqual(await (await authRequest("session")).json(), {});
  }
  assert.equal(await login(parent), null);
  useCookie(await cookieFor(saved, "replacement-password"));
  assert.equal((await request("kv/settings")).status, 200);
  useCookie(childCookie);
  assert.equal((await request("kv/settings")).status, 200);
});

test("kid reset revokes only that child, including demo login credentials", async () => {
  const { parent, kid, sibling } = await fixture();
  const parentCookie = await cookieFor(parent);
  const kidCookies = [await cookieFor(kid), await cookieFor(kid)];
  const siblingCookie = await cookieFor(sibling);
  await store.mutateState(parent.id, s => { s.users.find(u => u.id === kid.id)!.demoKey = "a".repeat(64); });
  useCookie(parentCookie);
  assert.equal((await request("kv/kids/kid", "PATCH", { password: "reset-child-password" })).status, 200);
  const saved = (await store.findUser(kid.id))!;
  assert.equal(saved.authVersion, 1);
  assert.equal(saved.demoKey, undefined);
  const provider = auth.authOptions.providers[0] as any;
  assert.equal(await provider.options.authorize({ demoKey: "a".repeat(64), role: "kid" }, { headers: {} }), null);
  assert.equal((await request("kv/settings")).status, 200);
  for (const cookie of kidCookies) {
    useCookie(cookie);
    assert.equal((await request("kv/requests")).status, 401);
    assert.equal((await request("kv/lessons/what-is-a-stock/complete", "POST", { answer: 0 })).status, 401);
  }
  assert.equal(await login(kid), null);
  useCookie(await cookieFor(saved, "reset-child-password"));
  assert.equal((await request("kv/requests")).status, 200);
  useCookie(siblingCookie);
  assert.equal((await request("kv/requests")).status, 200);
});

test("profile, notification, limit and family revision updates never revoke sessions", async () => {
  const { parent, kid } = await fixture();
  const parentCookie = await cookieFor(parent);
  const kidCookie = await cookieFor(kid);
  useCookie(parentCookie);
  assert.equal((await request("kv/settings", "PATCH", { name: "Updated Parent", notifications: false })).status, 200);
  assert.equal((await request("kv/kids/kid", "PATCH", { name: "Updated Kid", dailyLimit: 500 })).status, 200);
  await store.mutateState(parent.id, s => { s.users.find(u => u.id === parent.id)!.revision += 100; });
  for (const cookie of [parentCookie, kidCookie]) {
    useCookie(cookie);
    assert.equal((await request("kv/settings")).status, 200);
  }
  assert.equal(authVersion((await store.findUser(parent.id))!), 0);
  assert.equal(authVersion((await store.findUser(kid.id))!), 0);
});

test("failed password changes and cross-family resets do not change credentials or versions", async () => {
  const { parent, kid, other } = await fixture();
  useCookie(await cookieFor(parent));
  assert.equal((await request("kv/settings", "PATCH", { currentPassword: "wrong", newPassword: "replacement-password" })).status, 400);
  assert.equal((await request("kv/kids/kid", "PATCH", { password: "short" })).status, 400);
  useCookie(await cookieFor(other));
  assert.equal((await request("kv/kids/kid", "PATCH", { password: "replacement-password" })).status, 404);
  assert.equal(authVersion((await store.findUser(kid.id))!), 0);
  assert.ok(await login(kid));
  assert.ok(await login(parent));
});

test("deletion invalidates a child's cookie and session endpoint", async () => {
  const { parent, kid } = await fixture();
  const kidCookie = await cookieFor(kid);
  useCookie(await cookieFor(parent));
  assert.equal((await request("kv/kids/kid", "DELETE")).status, 200);
  useCookie(kidCookie);
  assert.equal((await request("kv/requests")).status, 401);
  const session = await authRequest("session");
  assert.deepEqual(await session.json(), {});
  assert.match(session.headers.get("set-cookie")!, /next-auth\.session-token=;.*Max-Age=0/);
  assert.equal(await login(kid), null);
});

test("roles remain enforced on login, protected APIs and mismatched signed claims", async () => {
  const { parent, kid } = await fixture();
  assert.equal(await login(kid, password, "parent"), null);
  assert.equal(await login(parent, password, "kid"), null);
  useCookie(await cookieFor(kid));
  assert.equal((await request("kv/kids")).status, 403);
  assert.equal((await request("kv/settings", "PATCH", { newPassword: "replacement-password", currentPassword: password })).status, 403);
  useCookie(await cookieFor(parent));
  assert.equal((await request("kv/lessons")).status, 403);
  useCookie(await encode({ token: { id: kid.id, role: "parent", authVersion: 0 }, secret: auth.sessionSecret() }));
  assert.equal((await request("kv/kids")).status, 401);
});

test("legacy JWTs cannot refresh or adopt a new version; public users hide internal auth state", async () => {
  const { parent } = await fixture();
  useCookie(await encode({ token: { id: parent.id, role: parent.role }, secret: auth.sessionSecret() }));
  assert.equal((await request("kv/settings")).status, 401);
  const current = { ...parent, authVersion: 2 };
  assert.throws(() => requireCurrentSession({ id: parent.id, role: parent.role, authVersion: 0 }, current), { status: 401 });
  assert.throws(() => requireCurrentSession({ id: parent.id, role: parent.role }, current), { status: 401 });
  assert.equal("authVersion" in publicUser(current), false);
  assert.equal("passwordHash" in publicUser(current), false);
  const callback = auth.authOptions.callbacks!.jwt!;
  await assert.rejects(() => callback({ token: { id: parent.id, role: parent.role }, trigger: "update", session: { authVersion: 0 } }), { status: 401 });
});

test("concurrent parent password changes cannot overwrite a change made by another session", async () => {
  const { parent } = await fixture();
  useCookie(await cookieFor(parent));
  const responses = await Promise.all([
    request("kv/settings", "PATCH", { currentPassword: password, newPassword: "first-replacement" }),
    request("kv/settings", "PATCH", { currentPassword: password, newPassword: "second-replacement" }),
  ]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 401]);
  assert.equal((await store.findUser(parent.id))!.authVersion, 1);
});

test("normal sign-out clears the cookie without revoking other devices or family members", async () => {
  const { parent, kid } = await fixture();
  const parentCookie = await cookieFor(parent);
  const otherDeviceCookie = await cookieFor(parent);
  const kidCookie = await cookieFor(kid);
  useCookie(parentCookie);
  const csrfResponse = await authRequest("csrf");
  const { csrfToken } = await csrfResponse.json();
  const csrfCookie = csrfResponse.headers.get("set-cookie")!.match(/next-auth\.csrf-token=([^;]+)/)![1];
  cookies["next-auth.csrf-token"] = decodeURIComponent(csrfCookie);
  const response = await authRequest("signout", "POST", { csrfToken, callbackUrl: origin, json: "true" });
  assert.match(response.headers.get("set-cookie")!, /next-auth\.session-token=;.*Max-Age=0/);
  useCookie();
  assert.equal((await request("kv/settings")).status, 401);
  for (const cookie of [otherDeviceCookie, kidCookie]) {
    useCookie(cookie);
    assert.equal((await request("kv/settings")).status, 200);
  }
  assert.equal(authVersion((await store.findUser(parent.id))!), 0);
});

test("middleware redirects missing, legacy and cross-role cookies without treating it as a database authorization check", async () => {
  const { parent, kid } = await fixture();
  const { middleware } = require("../middleware");
  const visit = (url: string, cookie?: string) => middleware(new NextRequest(`${origin}${url}`, { headers: cookie ? { cookie: `next-auth.session-token=${cookie}` } : {} })) as Promise<Response>;
  assert.equal((await visit("/parent/dashboard")).headers.get("location"), `${origin}/parent/login`);
  const legacy = await encode({ token: { id: parent.id, role: "parent" }, secret: auth.sessionSecret() });
  assert.equal((await visit("/parent/dashboard", legacy)).headers.get("location"), `${origin}/parent/login`);
  assert.equal((await visit("/parent/dashboard", await cookieFor(kid))).headers.get("location"), `${origin}/kid/dashboard`);
  assert.equal((await visit("/kid/dashboard", await cookieFor(parent))).headers.get("location"), `${origin}/parent/dashboard`);
  assert.equal((await visit("/parent/login")).headers.get("location"), null);
  assert.equal((await visit("/parent/dashboard", await cookieFor(parent))).headers.get("location"), null);
});

test("MongoDB schema persists an authentication version independent of family revision", () => {
  const { models } = require("../src/models");
  const doc = new models.users({ _id: "schema-test", identifier: "schema-test", role: "parent", passwordHash: "test-only", authVersion: 3, revision: 51 });
  const object = doc.toObject();
  assert.equal(object.authVersion, 3);
  assert.equal(object.revision, 51);
  assert.equal(new models.users().authVersion, 0);
});
