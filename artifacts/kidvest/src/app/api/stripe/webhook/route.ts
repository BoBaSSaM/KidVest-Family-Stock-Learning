import { NextResponse } from "next/server";
import { WebhookHandlers } from "@/lib/payments";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  const raw = Buffer.from(await req.arrayBuffer());
  if (raw.length > 1048576) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  try {
    await WebhookHandlers.processWebhook(raw, signature);
    return NextResponse.json({ received: true });
  } catch {
    // Never log raw payment events, signatures, keys or provider exceptions.
    return NextResponse.json({ error: "The webhook could not be verified or processed. Retry delivery." }, { status: 400 });
  }
}
