import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (["/parent/login", "/parent/register", "/kid/login"].includes(path)) return NextResponse.next();
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET });
  const role = path.startsWith("/parent") ? "parent" : "kid";
  // This is a routing hint, not the authorization boundary. Node-side session
  // callbacks and protected APIs compare against the persisted account version.
  if (!token?.id || !Number.isSafeInteger(token.authVersion) || token.authVersion! < 0 || !["parent", "kid"].includes(token.role || "")) return NextResponse.redirect(new URL(`/${role}/login`, req.url));
  if (token.role !== role) return NextResponse.redirect(new URL(`/${token.role}/dashboard`, req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/parent/:path*", "/kid/:path*"] };
