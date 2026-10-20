import assert from "node:assert/strict";
import test from "node:test";
import type { StoredUser } from "../src/lib/domain";
import { publicUser } from "../src/lib/domain";
import { executeSandboxTrade, sandboxPortfolio } from "../src/lib/sandbox";

function kid(role: "kid" | "parent" = "kid"): StoredUser {
  return {
    id: "child-a", name: "Mira", role, avatar: "comet", isDemo: false, notifications: true,
    identifier: "mira", passwordHash: "unused", dailyLimit: 50, monthlyLimit: 200,
    revision: 0, createdAt: "2026-01-01T00:00:00.000Z",
  };
}

const usdQuote = { symbol: "ACME", name: "Acme Learning", price: 25, currency: "USD" } as const;

test("a new practice account starts with isolated pretend money and empty practice records", () => {
  assert.deepEqual(sandboxPortfolio(kid()), {
    balance: 10_000,
    holdings: [],
    trades: [],
    practiceOnly: true,
  });
});

test("buy and sell only update the child's separate practice account", () => {
  const child = kid();
  const familyWallet = { balance: 75 };
  const familyHoldings = [{ symbol: "SAFE", quantity: 3 }];

  const bought = executeSandboxTrade(child, { symbol: "ACME", side: "buy", quantity: 2 }, usdQuote);
  assert.equal(bought.balance, 9_950);
  assert.equal(bought.holdings[0]?.quantity, 2);
  assert.equal(bought.trades[0]?.side, "buy");

  const sold = executeSandboxTrade(child, { symbol: "ACME", side: "sell", quantity: 1 }, usdQuote);
  assert.equal(sold.balance, 9_975);
  assert.equal(sold.holdings[0]?.quantity, 1);
  assert.equal(sold.trades[0]?.side, "sell");
  assert.deepEqual(familyWallet, { balance: 75 });
  assert.deepEqual(familyHoldings, [{ symbol: "SAFE", quantity: 3 }]);
  assert.equal(sold.practiceOnly, true);
});

test("failed practice trades leave the practice balance and holdings unchanged", () => {
  const child = kid();
  child.sandboxBalance = 10;
  const before = sandboxPortfolio(child);

  assert.throws(
    () => executeSandboxTrade(child, { symbol: "ACME", side: "buy", quantity: 1 }, usdQuote),
    /not enough practice money/i,
  );
  assert.deepEqual(sandboxPortfolio(child), before);
  assert.throws(
    () => executeSandboxTrade(child, { symbol: "ACME", side: "sell", quantity: 1 }, usdQuote),
    /not enough practice shares/i,
  );
  assert.deepEqual(sandboxPortfolio(child), before);
});

test("practice trading rejects parent accounts and non-USD stocks", () => {
  assert.throws(
    () => executeSandboxTrade(kid("parent"), { symbol: "ACME", side: "buy", quantity: 1 }, usdQuote),
    /only available to child accounts/i,
  );
  assert.throws(
    () => executeSandboxTrade(kid(), { symbol: "ACME", side: "buy", quantity: 1 }, { ...usdQuote, currency: "EUR" }),
    /supports USD/i,
  );
});

test("practice account details are never exposed in the public user profile", () => {
  const child = kid();
  executeSandboxTrade(child, { symbol: "ACME", side: "buy", quantity: 1 }, usdQuote);
  const safeUser = publicUser(child) as Record<string, unknown>;

  assert.equal("sandboxBalance" in safeUser, false);
  assert.equal("sandboxHoldings" in safeUser, false);
  assert.equal("sandboxTrades" in safeUser, false);
});
