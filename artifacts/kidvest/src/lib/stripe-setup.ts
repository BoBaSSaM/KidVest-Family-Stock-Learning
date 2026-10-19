import { runMigrations } from "stripe-replit-sync";
import { getStripeSync, getUncachableStripeClient } from "./stripe-client";
const root = globalThis as typeof globalThis & { kidvestStripeReady?: Promise<void> };
export const stripeConfigured = () => !!(process.env.STRIPE_SECRET_KEY || process.env.REPLIT_CONNECTORS_HOSTNAME) && !!process.env.DATABASE_URL && !!process.env.MONGODB_URI;
export function ensureStripeReady() {
  root.kidvestStripeReady ??= initializeStripe().catch(() => {
    root.kidvestStripeReady = undefined;
    throw new Error("Stripe test payment setup is unavailable. No payment has been taken.");
  });
  return root.kidvestStripeReady;
}
async function initializeStripe() {
  if (!process.env.DATABASE_URL || !process.env.MONGODB_URI) throw new Error("Persistent databases are required.");
  const stripe = await getUncachableStripeClient();
  if ((await stripe.balance.retrieve()).livemode) throw new Error("Live payments are disabled.");
  await runMigrations({ databaseUrl: process.env.DATABASE_URL });
  const sync = await getStripeSync();
  try {
    const baseUrl = process.env.NEXTAUTH_URL || (process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost:3000");
    if (baseUrl.startsWith("https://")) {
      await sync.findOrCreateManagedWebhook(`${baseUrl.replace(/\/$/, "")}/api/stripe/webhook`);
    } else if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("Configure an HTTPS webhook or local Stripe CLI signing secret.");
    await sync.syncBackfill({ object: "all" });
  } finally { await sync.postgresClient.pool.end(); }
}
