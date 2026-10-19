import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

// Fresh connection credentials on each call: never persist or log connector secrets.
async function getStripeCredentials(): Promise<{ secretKey: string; webhookSecret?: string }> {
  if (process.env.STRIPE_SECRET_KEY) {
    if (!process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")) throw new Error("KidVest only accepts Stripe test-mode keys.");
    return { secretKey: process.env.STRIPE_SECRET_KEY, webhookSecret: process.env.STRIPE_WEBHOOK_SECRET };
  }
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY ? `repl ${process.env.REPL_IDENTITY}` : process.env.WEB_REPL_RENEWAL ? `depl ${process.env.WEB_REPL_RENEWAL}` : null;
  if (!hostname || !token) throw new Error("Stripe connector credentials are unavailable.");
  const response = await fetch(`https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`, {
    headers: { Accept: "application/json", X_REPLIT_TOKEN: token }, signal: AbortSignal.timeout(10000), cache: "no-store",
  });
  if (!response.ok) throw new Error("Stripe connector credentials are unavailable.");
  const data = await response.json();
  const settings = data.items?.[0]?.settings;
  if (!settings?.secret_key) throw new Error("The Stripe connection does not expose the server credentials required for signed webhooks.");
  if (!settings.secret_key.startsWith("sk_test_")) throw new Error("KidVest only accepts Stripe test-mode keys.");
  return { secretKey: settings.secret_key, webhookSecret: settings.webhook_secret };
}
export async function getUncachableStripeClient() {
  return new Stripe((await getStripeCredentials()).secretKey);
}
export async function getStripeSync() {
  if (!process.env.DATABASE_URL) throw new Error("PostgreSQL is required for Stripe-managed sync.");
  const credentials = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: process.env.DATABASE_URL, max: 2 },
    stripeSecretKey: credentials.secretKey, stripeWebhookSecret: credentials.webhookSecret || "",
    logger: { info() {}, warn() {}, error() {} },
  });
}
