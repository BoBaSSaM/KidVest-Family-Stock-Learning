import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, now, type PaymentAttempt, type StoredUser } from "../src/lib/domain";
import { settleAttempt } from "../src/lib/payments";
import { approveTrade } from "../src/lib/trading";

function fixture() {
  const state = emptyState();
  const common = { avatar: "comet", isDemo: true, completedLessons: [], notifications: true, passwordHash: "not-a-real-hash", revision: 0, createdAt: now(), dailyLimit: 1000, monthlyLimit: 5000 };
  const parent: StoredUser = { ...common, id: "parent", name: "Test Parent", role: "parent", identifier: "test@example.invalid" };
  const kid: StoredUser = { ...common, id: "kid", name: "Test Child", role: "kid", parentId: parent.id, identifier: "test-child" };
  state.users.push(parent, kid);
  state.wallets.push({ id: "wallet", parentId: parent.id, kidId: kid.id, balance: 10, currency: "USD" });
  state.requests.push({ id: "request", parentId: parent.id, kidId: kid.id, kidName: kid.name, kidAvatar: kid.avatar, symbol: "AAPL", companyName: "Apple", quantity: 2, priceAtRequest: 20, totalCost: 40, type: "buy", status: "pending", kidNote: "", parentComment: "", source: "demo", createdAt: now(), updatedAt: now() });
  const attempt: PaymentAttempt = { id: "attempt", parentId: parent.id, kidId: kid.id, amountCents: 3000, stripeSessionId: "cs_test_fixture", requestId: "request", quantity: 2, approvalPrice: 20, source: "demo", parentComment: "We reviewed this together.", status: "pending", approvalStatus: "none", message: "Waiting", createdAt: now(), expiresAt: new Date(Date.now() + 60000).toISOString() };
  state.paymentAttempts.push(attempt);
  const session = { id: "cs_test_fixture", amount_total: 3000, currency: "usd", livemode: false, payment_status: "paid" as const };
  return { state, parent, kid, attempt, session };
}
test("paid checkout credits exactly once and approves exactly once", () => {
  const { state, session } = fixture();
  const first = settleAttempt(state, "attempt", session, "https://pay.stripe.com/receipts/test");
  assert.equal(first.approvalStatus, "approved");
  assert.equal(state.wallets[0].balance, 0);
  assert.equal(state.requests[0].status, "approved");
  assert.equal(state.requests[0].quantity, 2);
  assert.equal(state.requests[0].priceAtApproval, 20);
  assert.equal(state.holdings[0].quantity, 2);
  assert.equal(state.holdings[0].avgBuyPrice, 20);
  assert.equal(state.transactions.filter(t => t.type === "deposit").length, 1);
  assert.equal(state.transactions.filter(t => t.type === "purchase").length, 1);
  assert.deepEqual(settleAttempt(state, "attempt", session), first);
  assert.equal(state.wallets[0].balance, 0);
  assert.equal(state.holdings[0].quantity, 2);
});
test("an unpaid return URL cannot credit funds", () => {
  const { state, session } = fixture();
  const result = settleAttempt(state, "attempt", { ...session, payment_status: "unpaid" });
  assert.equal(result.status, "pending");
  assert.equal(state.wallets[0].balance, 10);
  assert.equal(state.transactions.length, 0);
});
test("wrong amount, currency, session or live mode never credits", () => {
  for (const patch of [{ amount_total: 3001 }, { currency: "eur" }, { id: "cs_test_other" }, { livemode: true }]) {
    const { state, session } = fixture();
    assert.throws(() => settleAttempt(state, "attempt", { ...session, ...patch }));
    assert.equal(state.wallets[0].balance, 10);
    assert.equal(state.transactions.length, 0);
  }
});
test("changed spending limits retain deposit but defer approval", () => {
  const { state, session, kid } = fixture();
  kid.dailyLimit = 39;
  const result = settleAttempt(state, "attempt", session);
  assert.equal(result.approvalStatus, "deferred");
  assert.equal(state.wallets[0].balance, 40);
  assert.equal(state.requests[0].status, "pending");
  assert.equal(state.holdings.length, 0);
  settleAttempt(state, "attempt", session);
  assert.equal(state.wallets[0].balance, 40);
});
test("a rejected request is not resurrected by payment", () => {
  const { state, session } = fixture();
  state.requests[0].status = "rejected";
  assert.equal(settleAttempt(state, "attempt", session).approvalStatus, "deferred");
  assert.equal(state.wallets[0].balance, 40);
  assert.equal(state.requests[0].status, "rejected");
});
test("expired approval quote and spent balance preserve deposit without purchasing", () => {
  for (const kind of ["expired", "spent"]) {
    const { state, session, attempt } = fixture();
    if (kind === "expired") attempt.expiresAt = new Date(Date.now() - 1000).toISOString();
    else state.wallets[0].balance = 0;
    assert.equal(settleAttempt(state, "attempt", session).approvalStatus, "deferred");
    assert.equal(state.holdings.length, 0);
    assert.equal(state.transactions.filter(t => t.type === "deposit").length, 1);
  }
});
test("plain wallet top-up needs no request and does not purchase", () => {
  const { state, session, attempt } = fixture();
  delete attempt.requestId;
  assert.equal(settleAttempt(state, "attempt", session).approvalStatus, "none");
  assert.equal(state.wallets[0].balance, 40);
  assert.equal(state.holdings.length, 0);
});
test("failed status can later become paid; a duplicate stays safe", () => {
  const { state, session, attempt } = fixture();
  attempt.status = "failed";
  assert.equal(settleAttempt(state, "attempt", session).status, "completed");
  settleAttempt(state, "attempt", session);
  assert.equal(state.transactions.length, 2);
});
test("parent approval remains necessary; no short selling and zero limit means zero", () => {
  const { state, parent, kid } = fixture();
  const q = { price: 20, source: "demo" as const, currency: "USD" };
  assert.throws(() => approveTrade(state, kid, state.requests[0], 1, q));
  kid.dailyLimit = 0;
  assert.throws(() => approveTrade(state, parent, state.requests[0], 1, q));
  state.requests[0].type = "sell";
  assert.throws(() => approveTrade(state, parent, state.requests[0], 1, q));
  assert.equal(state.wallets[0].balance, 10);
});
