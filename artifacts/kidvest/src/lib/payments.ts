import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { getStripeSync, getUncachableStripeClient } from "./stripe-client";
import { ensureStripeReady } from "./stripe-setup";
import { mutateState, readState } from "./store";
import { cents, HttpError, now, type PaymentAttempt, type StoredUser, type State } from "./domain";
import { approveTrade } from "./trading";
import { logActivity } from "./seed";
import type { PaymentStatus } from "@workspace/api-client-react";

async function walletPrice(amountCents: number, stripe: Stripe) {
  const key = `kidvest_wallet_usd_${amountCents}`;
  const prices = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (prices.data[0]) return prices.data[0].id;
  const products = await stripe.products.search({ query: "active:'true' AND metadata['kidvest_kind']:'virtual_wallet_test'", limit: 1 });
  const product = products.data[0] || await stripe.products.create({
    name: "Sahim virtual learning wallet — TEST",
    description: "Test-mode funding of a virtual educational wallet. No real stock is purchased.",
    metadata: { kidvest_kind: "virtual_wallet_test" },
  }, { idempotencyKey: "kidvest-learning-wallet-product" });
  const price = await stripe.prices.create({ product: product.id, unit_amount: amountCents, currency: "usd", lookup_key: key }, { idempotencyKey: key });
  return price.id;
}
export type ApprovalCheckout = { requestId: string; quantity: number; price: number; source: "demo" | "live"; comment: string };
export async function startCheckout(parent: StoredUser, kidId: string, amount: number, origin: string, approval?: ApprovalCheckout) {
  if (parent.role !== "parent") throw new HttpError(403, "Only a parent can fund a wallet.");
  if (!process.env.MONGODB_URI) throw new HttpError(503, "Stripe funding requires MongoDB. Demo file storage cannot accept payments.");
  const amountCents = Math.round(amount * 100);
  if (amountCents < 50) throw new HttpError(400, "Stripe's USD minimum is $0.50. No charge was made. Add at least $1 to the wallet, then approve again.");
  if (amountCents > 1000000 || cents(amount) !== amount) throw new HttpError(400, "Choose a valid amount up to $10,000 with two decimal places.");
  await ensureStripeReady();
  const attempt: PaymentAttempt = await mutateState(parent.id, s => {
    const kid = s.users.find(k => k.id === kidId && k.parentId === parent.id && k.role === "kid");
    if (!kid) throw new HttpError(404, "Child not found.");
    if (approval) {
      const request = s.requests.find(r => r.id === approval.requestId && r.parentId === parent.id && r.kidId === kidId && r.type === "buy" && r.status === "pending");
      if (!request) throw new HttpError(409, "This request is no longer awaiting approval.");
      const pending = s.paymentAttempts.find(a => a.requestId === approval.requestId && ["creating", "pending"].includes(a.status) && Date.parse(a.expiresAt) > Date.now());
      if (pending) throw new HttpError(409, "A checkout is already pending for this request. Complete or cancel it before starting another.");
    }
    const record: PaymentAttempt = {
      id: randomUUID(), parentId: parent.id, kidId, amountCents, status: "creating",
      approvalStatus: "none", message: "Waiting for Stripe test checkout.",
      createdAt: now(), expiresAt: new Date(Date.now() + 35 * 60000).toISOString(),
      ...(approval ? { requestId: approval.requestId, quantity: approval.quantity, approvalPrice: approval.price, source: approval.source, parentComment: approval.comment } : {}),
    };
    s.paymentAttempts.push(record);
    return record;
  });
  try {
    const stripe = await getUncachableStripeClient();
    const price = await walletPrice(amountCents, stripe);
    const metadata = { kidvestAttemptId: attempt.id, parentId: parent.id, kidId, app: "kidvest" };
    const session = await stripe.checkout.sessions.create({
      mode: "payment", allowed_payment_method_types: ["card"], line_items: [{ price, quantity: 1 }],
      customer_email: parent.email, client_reference_id: attempt.id, metadata,
      payment_intent_data: { metadata }, invoice_creation: { enabled: true },
      success_url: `${origin}/parent/payments?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/parent/payments?cancelled=1&session_id={CHECKOUT_SESSION_ID}`,
      expires_at: Math.floor(Date.parse(attempt.expiresAt) / 1000),
    }, { idempotencyKey: `kidvest-checkout-${attempt.id}` });
    if (session.livemode || !session.url) throw new Error("Test checkout unavailable.");
    await mutateState(parent.id, s => {
      const record = s.paymentAttempts.find(a => a.id === attempt.id)!;
      record.stripeSessionId = session.id;
      if (record.status === "creating") record.status = "pending";
      logActivity(s, parent, "checkout_started", `Started a Stripe test top-up of $${amount.toFixed(2)}. No wallet credit until Stripe confirms payment.`, kidId);
    });
    return { success: false, checkoutUrl: session.url, message: "Continue to Stripe test checkout. No real money will be charged.", missingAmount: approval ? amount : undefined };
  } catch (e) {
    await mutateState(parent.id, s => {
      const a = s.paymentAttempts.find(a => a.id === attempt.id);
      if (a && a.status === "creating") { a.status = "failed"; a.message = "Checkout could not be opened. No wallet credit was added."; }
    });
    if (e instanceof HttpError) throw e;
    throw new HttpError(503, "Stripe test checkout could not be opened. No wallet credit was added. Please try again.");
  }
}
export function settleAttempt(s: State, attemptId: string, session: Pick<Stripe.Checkout.Session, "id" | "amount_total" | "currency" | "livemode" | "payment_status">, receiptUrl?: string): PaymentStatus {
  const a = s.paymentAttempts.find(a => a.id === attemptId);
  if (!a) throw new HttpError(404, "Payment not found.");
  if (session.livemode || session.currency !== "usd" || session.amount_total !== a.amountCents) throw new HttpError(409, "Payment amount, mode or currency mismatch.");
  if (a.stripeSessionId && a.stripeSessionId !== session.id) throw new HttpError(409, "Checkout session mismatch.");
  if (session.payment_status !== "paid") return paymentView(a);
  const parent = s.users.find(u => u.id === a.parentId && u.role === "parent");
  const kid = s.users.find(u => u.id === a.kidId && u.parentId === a.parentId && u.role === "kid");
  const wallet = s.wallets.find(w => w.kidId === a.kidId && w.parentId === a.parentId);
  if (!parent || !kid || !wallet) throw new HttpError(409, "The destination wallet is unavailable. Payment requires reconciliation.");
  const existing = s.transactions.find(t => t.stripeSessionId === session.id && t.type === "deposit");
  if (existing || a.status === "completed") return paymentView(a);
  a.stripeSessionId = session.id;
  wallet.balance = cents(wallet.balance + a.amountCents / 100);
  a.status = "completed"; a.receiptUrl = receiptUrl;
  a.message = "Stripe test payment confirmed. Your virtual wallet has been credited.";
  s.transactions.unshift({ id: randomUUID(), parentId: a.parentId, kidId: kid.id, kidName: kid.name, amount: a.amountCents / 100, type: "deposit", status: "completed", createdAt: now(), isDemo: false, paymentProvider: "stripe_test", stripeSessionId: session.id, receiptUrl });
  logActivity(s, parent, "stripe_test_deposit", `Stripe confirmed a $${(a.amountCents / 100).toFixed(2)} test top-up for ${kid.name}.`, kid.id);
  if (a.requestId) {
    const request = s.requests.find(r => r.id === a.requestId && r.parentId === parent.id && r.kidId === kid.id);
    try {
      if (!request || request.status !== "pending") throw new HttpError(409, "The request was already reviewed or cancelled.");
      if (Date.now() > Date.parse(a.expiresAt)) throw new HttpError(409, "The review quote expired.");
      const approved = approveTrade(s, parent, request, a.quantity!, { price: a.approvalPrice!, source: a.source!, currency: "USD" }, a.parentComment);
      if (!approved.success) throw new HttpError(409, "The wallet balance changed while checkout was open.");
      a.approvalStatus = "approved"; a.message = "Test payment confirmed, wallet credited and your stock request automatically approved at the reviewed price.";
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      a.approvalStatus = "deferred";
      a.message = `Wallet credited. Automatic approval was not completed: ${error.message} Review the request again; your credited funds remain in the wallet.`;
      logActivity(s, parent, "approval_deferred", a.message, kid.id);
    }
  }
  return paymentView(a);
}
function paymentView(a: PaymentAttempt): PaymentStatus {
  return { status: a.status === "creating" ? "pending" : a.status, approvalStatus: a.approvalStatus, message: a.message, amount: a.amountCents / 100, receiptUrl: a.receiptUrl };
}
export async function reconcileSession(sessionId: string, authenticatedParentId?: string): Promise<PaymentStatus> {
  const stripe = await getUncachableStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge", "invoice"] });
  const metadata = session.metadata;
  if (session.livemode || metadata?.app !== "kidvest" || !metadata.parentId || !metadata.kidvestAttemptId) throw new HttpError(404, "KidVest test payment not found.");
  if (authenticatedParentId && metadata.parentId !== authenticatedParentId) throw new HttpError(404, "Payment not found.");
  let receiptUrl: string | undefined;
  const intent = session.payment_intent;
  if (intent && typeof intent !== "string") {
    const charge = intent.latest_charge;
    if (charge && typeof charge !== "string") receiptUrl = charge.receipt_url || undefined;
  }
  if (!receiptUrl && session.invoice && typeof session.invoice !== "string") receiptUrl = session.invoice.hosted_invoice_url || undefined;
  return mutateState(metadata.parentId, s => {
    const attempt = s.paymentAttempts.find(a => a.id === metadata.kidvestAttemptId && a.parentId === metadata.parentId);
    if (!attempt) throw new HttpError(404, "Payment not found.");
    if (session.payment_status === "paid") return settleAttempt(s, attempt.id, session, receiptUrl);
    if (session.status === "expired" && attempt.status !== "completed") { attempt.status = "expired"; attempt.message = "Checkout expired. No wallet credit was added."; }
    return paymentView(attempt);
  });
}
export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string) {
    await ensureStripeReady();
    const sync = await getStripeSync();
    try { await sync.processWebhook(payload, signature); }
    finally { await sync.postgresClient.pool.end(); }
    // Parsing occurs only after managed sync has verified the Stripe signature.
    const event = JSON.parse(payload.toString("utf8")) as Stripe.Event;
    if (event.livemode) throw new HttpError(400, "Live events are disabled.");
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.expired"].includes(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.app === "kidvest") await reconcileSession(session.id);
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (intent.metadata?.app !== "kidvest" || !intent.metadata.parentId) return;
      await mutateState(intent.metadata.parentId, s => {
        const attempt = s.paymentAttempts.find(a => a.id === intent.metadata.kidvestAttemptId);
        if (attempt && attempt.status !== "completed" && attempt.status !== "failed") {
          attempt.status = "failed"; attempt.message = "The test card payment failed. No wallet credit was added. You may retry in Checkout.";
          const parent = s.users.find(u => u.id === attempt.parentId);
          if (parent) logActivity(s, parent, "payment_failed", attempt.message, attempt.kidId);
        }
      });
    }
  }
}
export async function ownedPayment(parentId: string, sessionId: string, cancelled = false) {
  const s = await readState(parentId);
  if (!s.paymentAttempts.some(a => a.stripeSessionId === sessionId && a.parentId === parentId)) throw new HttpError(404, "Payment not found.");
  if (cancelled) {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "open") await stripe.checkout.sessions.expire(sessionId);
  }
  return reconcileSession(sessionId, parentId);
}
