import { runMigrations } from "stripe-replit-sync";
import { getStripeSync, getUncachableStripeClient } from "./stripe-client";
const root = globalThis as typeof globalThis & { kidvestStripeReady?: Promise<void> };
export const isVercelRuntime = () => process.env.VERCEL === "1" || !!process.env.VERCEL_URL;
export function stripeConfigurationIssues(): string[] {
  const issues: string[] = [];
  if (!process.env.MONGODB_URI) issues.push("MONGODB_URI");
  if (isVercelRuntime()) {
    if (!process.env.STRIPE_SECRET_KEY) issues.push("STRIPE_SECRET_KEY");
    else if (!process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")) issues.push("STRIPE_SECRET_KEY must be a test key (sk_test_...)");
    if (!process.env.STRIPE_WEBHOOK_SECRET) issues.push("STRIPE_WEBHOOK_SECRET");
    else if (!process.env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) issues.push("STRIPE_WEBHOOK_SECRET must be a signing secret (whsec_...)");
    if (!process.env.NEXTAUTH_URL?.startsWith("https://")) issues.push("NEXTAUTH_URL must be the deployed HTTPS origin");
    return issues;
  }
  if (!process.env.STRIPE_SECRET_KEY && !process.env.REPLIT_CONNECTORS_HOSTNAME) issues.push("STRIPE_SECRET_KEY or Replit Stripe connection");
  if (!process.env.DATABASE_URL) issues.push("DATABASE_URL for Replit-managed Stripe sync");
  return issues;
}
export const stripeConfigured = () => stripeConfigurationIssues().length === 0;
export function ensureStripeReady() {
  root.kidvestStripeReady ??= initializeStripe().catch((error) => {
    root.kidvestStripeReady = undefined;
    const reason = error instanceof Error ? error.message : "Unknown setup error";
    console.warn("[stripe] test payment setup failed:", reason);
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
