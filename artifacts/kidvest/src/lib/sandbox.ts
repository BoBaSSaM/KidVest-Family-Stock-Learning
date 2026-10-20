import { randomUUID } from "node:crypto";
import type { SandboxPortfolio, Stock } from "@workspace/api-client-react";
import { cents, HttpError, now, type SandboxHolding, type SandboxTrade, type StoredUser } from "./domain";

export const PRACTICE_STARTING_BALANCE = 10_000;
const MAX_TRADE_HISTORY = 100;
const roundQuantity = (quantity: number) => Math.round(quantity * 1_000_000) / 1_000_000;

export function sandboxPortfolio(kid: StoredUser): SandboxPortfolio {
  return {
    balance: cents(kid.sandboxBalance ?? PRACTICE_STARTING_BALANCE),
    holdings: structuredClone(kid.sandboxHoldings ?? []),
    trades: structuredClone(kid.sandboxTrades ?? []).slice(0, MAX_TRADE_HISTORY),
    practiceOnly: true,
  };
}

export function executeSandboxTrade(
  kid: StoredUser,
  input: { symbol: string; side: "buy" | "sell"; quantity: number },
  quote: Pick<Stock, "symbol" | "name" | "price" | "currency">,
): SandboxPortfolio {
  if (kid.role !== "kid") throw new HttpError(403, "Practice trades are only available to child accounts.");
  if (quote.currency.toUpperCase() !== "USD") throw new HttpError(422, "Practice trading currently supports USD-priced shares only.");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0 || input.quantity > 100_000
    || Math.abs(input.quantity * 1_000_000 - Math.round(input.quantity * 1_000_000)) >= 0.00001) {
    throw new HttpError(400, "Enter a valid share amount with up to 6 decimal places.");
  }

  const quantity = roundQuantity(input.quantity);
  const price = cents(quote.price);
  const total = cents(quantity * price);
  if (!Number.isFinite(price) || price <= 0 || total < 0.01) throw new HttpError(400, "The practice trade must be worth at least $0.01.");

  const balance = cents(kid.sandboxBalance ?? PRACTICE_STARTING_BALANCE);
  const holdings = kid.sandboxHoldings ?? [];
  const existing = holdings.find(holding => holding.symbol === quote.symbol);

  if (input.side === "buy") {
    if (balance < total) throw new HttpError(400, "There is not enough practice money for this trade.");
    kid.sandboxBalance = cents(balance - total);
    if (existing) {
      const nextQuantity = roundQuantity(existing.quantity + quantity);
      existing.avgBuyPrice = cents((existing.quantity * existing.avgBuyPrice + total) / nextQuantity);
      existing.quantity = nextQuantity;
    } else {
      holdings.push({ symbol: quote.symbol, companyName: quote.name, quantity, avgBuyPrice: price });
    }
  } else {
    if (!existing || existing.quantity + 1e-8 < quantity) {
      throw new HttpError(400, "There are not enough practice shares to sell.");
    }
    const remaining = roundQuantity(existing.quantity - quantity);
    kid.sandboxBalance = cents(balance + total);
    if (remaining <= 1e-8) holdings.splice(holdings.indexOf(existing), 1);
    else existing.quantity = remaining;
  }

  const trade: SandboxTrade = {
    id: randomUUID(),
    symbol: quote.symbol,
    companyName: quote.name,
    side: input.side,
    quantity,
    price,
    total,
    createdAt: now(),
  };
  kid.sandboxHoldings = holdings;
  kid.sandboxTrades = [trade, ...(kid.sandboxTrades ?? [])].slice(0, MAX_TRADE_HISTORY);
  return sandboxPortfolio(kid);
}
