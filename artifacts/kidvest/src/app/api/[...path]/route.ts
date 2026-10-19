import type { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function handler(req: NextRequest, context: Context) {
  return handleApi(req, (await context.params).path);
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
