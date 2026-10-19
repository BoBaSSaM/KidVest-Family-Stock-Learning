export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.STRIPE_SECRET_KEY) {
    const { ensureStripeReady } = await import("./lib/stripe-setup");
    try { await ensureStripeReady(); }
    catch { console.warn("Stripe test initialization unavailable. Checkout will retry setup; no live payments are enabled."); }
  }
}
