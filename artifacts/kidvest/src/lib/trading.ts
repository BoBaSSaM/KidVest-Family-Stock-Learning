import { randomUUID } from "node:crypto";
import type { Stock } from "@workspace/api-client-react";
import { cents, HttpError, now, type State, type StoredRequest, type StoredUser } from "./domain";
import { logActivity } from "./seed";

export function validateBuyLimits(s: State, kid: StoredUser, total: number) {
  const buys = s.requests.filter(x => x.kidId === kid.id && x.status === "approved" && x.type === "buy");
  const spent = (prefix: string) => cents(buys.filter(x => x.updatedAt.startsWith(prefix)).reduce((a, x) => a + x.totalCost, 0));
  if (spent(now().slice(0, 10)) + total > kid.dailyLimit + 1e-8) throw new HttpError(400, `This exceeds ${kid.name}'s daily spending limit.`);
  if (spent(now().slice(0, 7)) + total > kid.monthlyLimit + 1e-8) throw new HttpError(400, `This exceeds ${kid.name}'s monthly spending limit.`);
}
// Called inside the same MongoDB transaction as wallet credit/parent review.
export function approveTrade(s: State, actor: StoredUser, r: StoredRequest, quantity: number, q: Pick<Stock, "price" | "source" | "currency">, comment = "") {
  if (r.parentId !== actor.id || actor.role !== "parent") throw new HttpError(403, "Only the child's parent can approve.");
  if (r.status !== "pending") throw new HttpError(409, "This request has already been reviewed.");
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) throw new HttpError(400, "Invalid quantity.");
  if (q.currency !== "USD" || !Number.isFinite(q.price) || q.price <= 0) throw new HttpError(422, "A valid USD quote is required.");
  const kid = s.users.find(k => k.id === r.kidId && k.parentId === actor.id && k.role === "kid");
  const wallet = s.wallets.find(w => w.kidId === r.kidId && w.parentId === actor.id);
  if (!kid || !wallet) throw new HttpError(404, "Child or wallet no longer exists.");
  const total = cents(quantity * q.price);
  if (total < 0.01) throw new HttpError(400, "The request must be worth at least $0.01.");
  const holding = s.holdings.find(h => h.kidId === r.kidId && h.symbol === r.symbol);
  if (r.type === "buy") {
    validateBuyLimits(s, kid, total);
    if (wallet.balance < total) return { success: false, missingAmount: cents(total - wallet.balance), message: `The wallet needs $${cents(total - wallet.balance).toFixed(2)} more.` };
    wallet.balance = cents(wallet.balance - total);
    if (holding) {
      holding.avgBuyPrice = (holding.quantity * holding.avgBuyPrice + quantity * q.price) / (holding.quantity + quantity);
      holding.quantity = +(holding.quantity + quantity).toFixed(6);
    } else s.holdings.push({ id: randomUUID(), parentId: actor.id, kidId: kid.id, symbol: r.symbol, companyName: r.companyName, quantity, avgBuyPrice: q.price });
  } else {
    if (!holding || holding.quantity + 1e-8 < quantity) throw new HttpError(400, "Not enough shares remain for this sale.");
    holding.quantity = +(holding.quantity - quantity).toFixed(6);
    if (!holding.quantity) s.holdings = s.holdings.filter(h => h.id !== holding.id);
    wallet.balance = cents(wallet.balance + total);
  }
  r.quantity = quantity; r.priceAtApproval = q.price; r.totalCost = total;
  r.source = q.source; r.status = "approved"; r.parentComment = comment; r.updatedAt = now();
  s.transactions.unshift({ id: randomUUID(), parentId: actor.id, kidId: kid.id, kidName: kid.name, amount: total, type: r.type === "buy" ? "purchase" : "sale", status: "completed", createdAt: now(), isDemo: actor.isDemo, symbol: r.symbol, quantity });
  logActivity(s, actor, "approved", `${actor.name} approved ${kid.name}'s ${r.type} request for ${r.symbol}.`, kid.id);
  return { success: true, message: "Request approved." };
}
