import { test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { verifyStripeWebhookPayload } from "../src/lib/payments";
import { stripeConfigurationIssues, stripeConfigured } from "../src/lib/stripe-setup";

const keys = [
  "VERCEL",
  "VERCEL_URL",
  "REPLIT_CONNECTORS_HOSTNAME",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "MONGODB_URI",
  "DATABASE_URL",
  "NEXTAUTH_URL",
] as const;

function withEnv(values: Partial<Record<(typeof keys)[number], string | undefined>>, run: () => void) {
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    for (const key of keys) {
      const value = values[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("Vercel Stripe checkout needs a test key, webhook secret, HTTPS origin and MongoDB, not PostgreSQL", () => {
  withEnv({
    VERCEL: "1",
    STRIPE_SECRET_KEY: "sk_test_example",
    STRIPE_WEBHOOK_SECRET: "whsec_example",
    MONGODB_URI: "mongodb://example",
    NEXTAUTH_URL: "https://sahim.example",
    DATABASE_URL: undefined,
  }, () => assert.equal(stripeConfigured(), true));
});

test("Vercel checkout stays unavailable until the signed webhook and origin are configured", () => {
  const base = {
    VERCEL: "1",
    STRIPE_SECRET_KEY: "sk_test_example",
    MONGODB_URI: "mongodb://example",
    NEXTAUTH_URL: "https://sahim.example",
    DATABASE_URL: undefined,
  };
  withEnv({ ...base, STRIPE_WEBHOOK_SECRET: undefined }, () => assert.equal(stripeConfigured(), false));
  withEnv({ ...base, STRIPE_WEBHOOK_SECRET: "whsec_example", NEXTAUTH_URL: "http://localhost:3000" }, () => assert.equal(stripeConfigured(), false));
});

test("Stripe setup logs can identify missing Vercel variable names without exposing values", () => {
  withEnv({
    VERCEL: "1",
    STRIPE_SECRET_KEY: undefined,
    STRIPE_WEBHOOK_SECRET: undefined,
    MONGODB_URI: undefined,
    NEXTAUTH_URL: undefined,
    DATABASE_URL: undefined,
  }, () => {
    assert.deepEqual(stripeConfigurationIssues(), [
      "MONGODB_URI",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "NEXTAUTH_URL must be the deployed HTTPS origin",
    ]);
  });
});

test("Replit Stripe-managed sync still requires PostgreSQL and accepts the connected Stripe credential", () => {
  const base = {
    VERCEL: undefined,
    VERCEL_URL: undefined,
    STRIPE_SECRET_KEY: undefined,
    STRIPE_WEBHOOK_SECRET: undefined,
    REPLIT_CONNECTORS_HOSTNAME: "connector.example",
    MONGODB_URI: "mongodb://example",
    NEXTAUTH_URL: undefined,
  };
  withEnv({ ...base, DATABASE_URL: undefined }, () => assert.equal(stripeConfigured(), false));
  withEnv({ ...base, DATABASE_URL: "postgres://example" }, () => assert.equal(stripeConfigured(), true));
});

test("direct Vercel webhook handling verifies the raw Stripe signature", () => {
  const stripe = new Stripe("sk_test_webhook_verification");
  const secret = "whsec_test_webhook_verification";
  const payload = JSON.stringify({
    id: "evt_test_webhook",
    object: "event",
    api_version: "2025-06-30.basil",
    created: 1,
    data: { object: {} },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: "checkout.session.completed",
  });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  const event = verifyStripeWebhookPayload(stripe, Buffer.from(payload), signature, secret);
  assert.equal(event.id, "evt_test_webhook");
  assert.throws(() => verifyStripeWebhookPayload(stripe, Buffer.from(payload), `${signature}invalid`, secret));
});
