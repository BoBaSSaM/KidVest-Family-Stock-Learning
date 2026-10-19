import { NextResponse } from "next/server";
// Deliberately fail closed until Stripe is connected and signature verification is configured.
export async function POST() {
  return NextResponse.json({ error: "Stripe integration is not configured. No event was processed." }, { status: 503 });
}
