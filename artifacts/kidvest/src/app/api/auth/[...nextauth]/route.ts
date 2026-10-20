import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";
type AuthHandler = ReturnType<typeof NextAuth>;
const handler = (...args: Parameters<AuthHandler>): ReturnType<AuthHandler> =>
  NextAuth(getAuthOptions())(...args);
export { handler as GET, handler as POST };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
