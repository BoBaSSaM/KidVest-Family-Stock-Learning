import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { findUser, findDemoUser } from "./store";
import { HttpError } from "./domain";
import { authVersion, requireCurrentSession } from "./session-version";
import { demoEnabled } from "./demo-mode";

type Limiter = Map<string, { count: number; reset: number }>;
const root = globalThis as typeof globalThis & { kidvestLimiter?: Limiter; kidvestSecret?: string };
const attempts = root.kidvestLimiter ??= new Map();
export function rateLimit(key: string, max = 15, duration = 15 * 60 * 1000) {
  const at = Date.now();
  if (attempts.size > 10000) for (const [k, v] of attempts) if (v.reset < at) attempts.delete(k);
  const record = attempts.get(key);
  if (record && record.reset > at) {
    if (record.count >= max) throw new HttpError(429, "Too many attempts. Please try again later.");
    record.count++;
  } else attempts.set(key, { count: 1, reset: at + duration });
}
export function sessionSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("NEXTAUTH_SECRET is required.");
  return root.kidvestSecret ??= randomBytes(48).toString("hex");
}
export const authOptions: NextAuthOptions = {
  secret: sessionSecret(),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 },
  pages: { signIn: "/parent/login" },
  providers: [
    Credentials({
      name: "سهيم",
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Portal", type: "text" },
        demoKey: { label: "Demo", type: "text" },
      },
      async authorize(raw, req) {
        const ip = String(req.headers?.["x-forwarded-for"] || "unknown").split(",")[0];
        rateLimit(`login:${ip}`, 30);
        if (raw?.demoKey) {
          if (!demoEnabled()) return null;
          const parsed = z.object({ demoKey: z.string().regex(/^[a-f0-9]{64}$/), role: z.enum(["parent", "kid"]) }).safeParse(raw);
          if (!parsed.success) return null;
          const user = await findDemoUser(parsed.data.demoKey, parsed.data.role);
          return user ? { id: user.id, name: user.name, role: user.role, avatar: user.avatar, isDemo: true, authVersion: authVersion(user) } : null;
        }
        const parsed = z.object({ identifier: z.string().trim().min(3).max(254), password: z.string().min(1).max(72), role: z.enum(["parent", "kid"]) }).safeParse(raw);
        if (!parsed.success) return null;
        rateLimit(`account:${parsed.data.identifier.toLowerCase()}`, 10);
        const user = await findUser(parsed.data.identifier.toLowerCase());
        if (!user || user.role !== parsed.data.role || !await compare(parsed.data.password, user.passwordHash)) return null;
        return { id: user.id, name: user.name, role: user.role, avatar: user.avatar, isDemo: user.isDemo, authVersion: authVersion(user) };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; token.role = user.role; token.avatar = user.avatar; token.isDemo = user.isDemo; token.authVersion = user.authVersion;
      } else {
        // NextAuth clears the session cookie when this callback rejects. Never
        // refresh a revoked token, including on client-triggered session updates.
        requireCurrentSession(token, token.id ? await findUser(token.id) : undefined);
      }
      return token;
    },
    async session({ session, token }) {
      session.user = { ...session.user, id: token.id as string, role: token.role as "parent" | "kid", avatar: token.avatar as string, isDemo: token.isDemo as boolean, authVersion: token.authVersion };
      return session;
    },
  },
  logger: { error(code) { console.error("Authentication error:", code); }, warn(code) { console.warn("Authentication warning:", code); }, debug() {} },
};
export async function requestIp() { return (await headers()).get("x-forwarded-for")?.split(",")[0] || "unknown"; }
