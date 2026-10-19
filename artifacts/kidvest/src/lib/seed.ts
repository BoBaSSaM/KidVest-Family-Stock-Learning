import { hash } from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { mutateState } from "./store";
import { now, type StoredUser, type State } from "./domain";

function account(data: Partial<StoredUser> & Pick<StoredUser, "id" | "name" | "identifier" | "role" | "passwordHash">): StoredUser {
  return { avatar: "fox", isDemo: true, notifications: true, completedLessons: [], dailyLimit: 1000, monthlyLimit: 5000, revision: 0, authVersion: 0, createdAt: now(), ...data };
}
export async function createDemoFamily() {
  const parentId = randomUUID();
  const demoKey = randomBytes(32).toString("hex");
  // Demo credentials are unguessable and are never shown or reused between visitors.
  const passwordHash = await hash(randomBytes(32).toString("hex"), 12);
  const parent = account({ id: parentId, name: "Alex Morgan", identifier: `demo-${parentId}@kidvest.example`, email: `demo-${parentId}@kidvest.example`, role: "parent", avatar: "parent", passwordHash, demoKey });
  const kid1 = account({ id: randomUUID(), name: "Oliver", identifier: `oliver-${parentId}`, username: `oliver-${parentId.slice(0, 6)}`, role: "kid", parentId, age: 10, avatar: "fox", passwordHash, demoKey });
  const kid2 = account({ id: randomUUID(), name: "Sophie", identifier: `sophie-${parentId}`, username: `sophie-${parentId.slice(0, 6)}`, role: "kid", parentId, age: 8, avatar: "bunny", passwordHash, completedLessons: ["what-is-a-stock"] });
  await mutateState(parentId, s => {
    s.users.push(parent, kid1, kid2);
    s.wallets.push({ id: randomUUID(), kidId: kid1.id, parentId, balance: 450, currency: "USD" }, { id: randomUUID(), kidId: kid2.id, parentId, balance: 300, currency: "USD" });
    s.holdings.push(
      { id: randomUUID(), kidId: kid1.id, parentId, symbol: "AAPL", companyName: "Apple", quantity: 2, avgBuyPrice: 210 },
      { id: randomUUID(), kidId: kid1.id, parentId, symbol: "DIS", companyName: "Walt Disney", quantity: 3, avgBuyPrice: 105 },
      { id: randomUUID(), kidId: kid2.id, parentId, symbol: "NKE", companyName: "Nike", quantity: 2, avgBuyPrice: 75 },
    );
    const day = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
    for (const [kid, amount] of [[kid1, 1185], [kid2, 450]] as const) {
      s.transactions.push({ id: randomUUID(), parentId, kidId: kid.id, kidName: kid.name, amount, type: "deposit", status: "completed", createdAt: day(14), isDemo: true });
    }
    for (const h of s.holdings.filter(h => h.parentId === parentId)) {
      const kid = h.kidId === kid1.id ? kid1 : kid2;
      s.transactions.push({ id: randomUUID(), parentId, kidId: kid.id, kidName: kid.name, amount: h.quantity * h.avgBuyPrice, type: "purchase", status: "completed", createdAt: day(h.symbol === "AAPL" ? 10 : 5), isDemo: true, symbol: h.symbol, quantity: h.quantity });
      s.requests.push({ id: randomUUID(), parentId, kidId: kid.id, kidName: kid.name, kidAvatar: kid.avatar, symbol: h.symbol, companyName: h.companyName, quantity: h.quantity, priceAtRequest: h.avgBuyPrice, priceAtApproval: h.avgBuyPrice, totalCost: h.quantity * h.avgBuyPrice, kidNote: "I want to learn about this business.", parentComment: "Let's follow what we learn together.", status: "approved", type: "buy", source: "demo", createdAt: day(10), updatedAt: day(5) });
    }
    s.requests.push({ id: randomUUID(), kidId: kid1.id, parentId, kidName: kid1.name, kidAvatar: kid1.avatar, symbol: "RBLX", companyName: "Roblox", quantity: 1, priceAtRequest: 67.28, totalCost: 67.28, kidNote: "I play Roblox and want to understand how the company works!", parentComment: "", status: "pending", type: "buy", source: "demo", createdAt: day(0), updatedAt: day(0) });
    s.activity.push({ id: randomUUID(), parentId, kidId: kid1.id, actorId: kid1.id, actorName: kid1.name, action: "request", details: "Oliver requested 1 share of RBLX", createdAt: now() });
  });
  return { demoKey };
}
export function logActivity(s: State, actor: StoredUser, action: string, details: string, kidId?: string) {
  s.activity.unshift({ id: randomUUID(), parentId: actor.role === "parent" ? actor.id : actor.parentId!, actorId: actor.id, actorName: actor.name, action, details, kidId, createdAt: now() });
}
