import type { User, StockRequest, Transaction, Activity } from "@workspace/api-client-react";

export type StoredUser = User & {
  passwordHash: string;
  identifier: string;
  dailyLimit: number;
  monthlyLimit: number;
  completedChallenges?: string[];
  demoKey?: string;
  authVersion?: number;
  revision: number;
  createdAt: string;
};
export type Wallet = { id: string; kidId: string; parentId: string; balance: number; currency: string };
export type StoredHolding = { id: string; parentId: string; kidId: string; symbol: string; companyName: string; quantity: number; avgBuyPrice: number };
export type StoredRequest = StockRequest & { updatedAt: string };
export type StoredTransaction = Transaction & { parentId: string; stripeSessionId?: string; symbol?: string; quantity?: number };
export type StoredActivity = Activity & { parentId: string; actorId: string; kidId?: string };
export type PaymentAttempt = {
  id: string; parentId: string; kidId: string; amountCents: number;
  stripeSessionId?: string; requestId?: string; quantity?: number;
  approvalPrice?: number; source?: "live" | "demo"; parentComment?: string;
  status: "creating" | "pending" | "completed" | "failed" | "expired";
  approvalStatus: "none" | "approved" | "deferred"; message: string;
  receiptUrl?: string; createdAt: string; expiresAt: string;
};
export type State = {
  users: StoredUser[];
  wallets: Wallet[];
  requests: StoredRequest[];
  holdings: StoredHolding[];
  transactions: StoredTransaction[];
  activity: StoredActivity[];
  paymentAttempts: PaymentAttempt[];
};
export const emptyState = (): State => ({ users: [], wallets: [], requests: [], holdings: [], transactions: [], activity: [], paymentAttempts: [] });
export const cents = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
export const now = () => new Date().toISOString();
export function publicUser(user: StoredUser): User {
  const { passwordHash: _hash, identifier: _identifier, demoKey: _demo, authVersion: _auth, revision: _rev, dailyLimit: _day, monthlyLimit: _month, completedChallenges: _challenges, createdAt: _date, ...safe } = user;
  return safe;
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
