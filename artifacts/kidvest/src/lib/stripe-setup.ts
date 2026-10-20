import { runMigrations } from "stripe-replit-sync";
import { getStripeSync, getUncachableStripeClient } from "./stripe-client";
const root = globalThis as typeof globalThis & { kidvestStripeReady?: Promise<void> };
export const isVercelRuntime = () => process.env.VERCEL === "1" || !!process.env.VERCEL_URL;
export const stripeConfigured = () => {
  if (!process.env.MONGODB_URI) return false;
  if (isVercelRuntime()) {
    return !!process.env.STRIPE_SECRET_KEY
      && !!process.env.STRIPE_WEBHOOK_SECRET
      && !!process.env.NEXTAUTH_URL?.startsWith("https://");
  }
  return !!(process.env.STRIPE_SECRET_KEY || process.env.REPLIT_CONNECTORS_HOSTNAME)
    && !!process.env.DATABASE_URL;
};
export function ensureStripeReady() {
  root.kidvestStripeReady ??= initializeStripe().catch(() => {
    root.kidvestStripeReady = undefined;
    throw new Error("Stripe test payment setup is unavailable. No payment has been taken.");
  });
  return root.kidvestStripeReady;
}
async function initializeStripe() {
  if (!process.env.MONGODB_URI) throw new Error("MongoDB is required for Stripe wallet payments.");
  const stripe = await getUncachableStripeClient();
  if ((await stripe.balance.retrieve()).livemode) throw new Error("Live payments are disabled.");
  if (isVercelRuntime()) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("A Stripe test webhook signing secret is required on Vercel.");
    if (!process.env.NEXTAUTH_URL?.startsWith("https://")) throw new Error("NEXTAUTH_URL must be the deployed HTTPS origin on Vercel.");
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("PostgreSQL is required for Stripe-managed sync.");
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
