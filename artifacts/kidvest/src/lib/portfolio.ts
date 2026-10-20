import type { Kid, Portfolio, ChartPoint } from "@workspace/api-client-react";
import { cents, publicUser, type State, type StoredUser } from "./domain";
import { quote } from "./market";
import { kidRewards } from "./rewards";
export async function portfolio(s: State, kidIds: string[], demo: boolean): Promise<Portfolio> {
  const own = s.holdings.filter(h => kidIds.includes(h.kidId));
  const quotes = new Map(await Promise.all([...new Set(own.map(h => h.symbol))].map(async symbol => [symbol, await quote(symbol, demo)] as const)));
  const holdings = own.map(h => {
    const q = quotes.get(h.symbol)!;
    const value = cents(h.quantity * q.price);
    const gainLoss = cents(value - h.quantity * h.avgBuyPrice);
    return { ...h, currentPrice: q.price, value, gainLoss, changePercent: h.avgBuyPrice ? +(100 * (q.price / h.avgBuyPrice - 1)).toFixed(2) : 0, source: q.source };
  });
  const totalValue = cents(holdings.reduce((a, h) => a + h.value, 0));
  const totalCost = cents(holdings.reduce((a, h) => a + h.quantity * h.avgBuyPrice, 0));
  return {
    holdings, totalValue, totalCost, gainLoss: cents(totalValue - totalCost),
    balance: cents(s.wallets.filter(w => kidIds.includes(w.kidId)).reduce((a, w) => a + w.balance, 0)),
    history: s.transactions.filter(t => kidIds.includes(t.kidId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
export async function kidView(s: State, kid: StoredUser): Promise<Kid> {
  const p = await portfolio(s, [kid.id], kid.isDemo);
  const rewards = kidRewards(kid, s.requests);
  return { ...publicUser(kid), balance: p.balance, portfolioValue: p.totalValue, gainLoss: p.gainLoss, dailyLimit: kid.dailyLimit, monthlyLimit: kid.monthlyLimit, pendingCount: s.requests.filter(r => r.kidId === kid.id && r.status === "pending").length, xp: rewards.xp, coins: rewards.coins };
}
// Plot invested cost from actual purchases/sales, not a fabricated value-performance series.
export function ledgerChart(s: State, kidIds: string[]): ChartPoint[] {
  const events = s.transactions.filter(t => kidIds.includes(t.kidId) && ["purchase", "sale"].includes(t.type) && t.status === "completed").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let invested = 0;
  return events.map(t => {
    invested = cents(invested + (t.type === "purchase" ? t.amount : -t.amount));
    return { date: t.createdAt, value: Math.max(0, invested) };
  });
}
