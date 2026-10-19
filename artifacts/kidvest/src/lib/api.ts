import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "node:crypto";
import { hash, compare } from "bcryptjs";
import { z } from "zod";
import {
  RegisterParentBody, CreateKidBody, UpdateKidBody, CreateRequestBody,
  ReviewRequestBody, FundWalletBody, UpdateSettingsBody, CompleteLessonBody,
  GetStockChartQueryParams, GetStockQuoteQueryParams, SearchStocksQueryParams,
} from "@workspace/api-zod";
import { authOptions, rateLimit } from "./auth";
import { findUser, mutateState, readState, storageMode } from "./store";
import { HttpError, cents, now, publicUser, type State, type StoredUser } from "./domain";
import { createDemoFamily, logActivity } from "./seed";
import { chart, quote, search, popular } from "./market";
import { kidView, portfolio, ledgerChart } from "./portfolio";
import { lessonCatalog } from "./lessons";

const quantitySchema = z.number().finite().positive().max(100000).refine(n => Math.abs(n * 1e6 - Math.round(n * 1e6)) < 0.00001, "Use at most 6 decimal places.");
const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{3,30}$/, "Usernames use 3–30 letters, numbers, hyphens or underscores.");
function parentId(u: StoredUser) { return u.role === "parent" ? u.id : u.parentId!; }
function requireRole(u: StoredUser, role: "parent" | "kid") {
  if (u.role !== role) throw new HttpError(403, `This action is only available in the ${role} portal.`);
}
async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, "Please sign in to continue.");
  const user = await findUser(session.user.id);
  if (!user) throw new HttpError(401, "This account no longer exists.");
  if (user.role !== session.user.role) throw new HttpError(403, "Access denied.");
  return user;
}
function ownKid(s: State, user: StoredUser, id: string) {
  const kid = s.users.find(k => k.id === id && k.role === "kid" && k.parentId === parentId(user));
  if (!kid || (user.role === "kid" && id !== user.id)) throw new HttpError(404, "Child not found.");
  return kid;
}
function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin || !host) throw new HttpError(403, "A same-origin request is required.");
  try {
    if (new URL(origin).host !== host.split(",")[0].trim()) throw new Error();
  } catch { throw new HttpError(403, "Request origin is not allowed."); }
}
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function body(req: NextRequest) {
  const text = await req.text();
  if (text.length > 16384) throw new HttpError(413, "Request is too large.");
  try { return JSON.parse(text); } catch { throw new HttpError(400, "Invalid JSON."); }
}
function ensureUsd(currency: string) {
  if (currency !== "USD") throw new HttpError(422, "This wallet uses USD. You can explore this stock, but cross-currency requests are not supported yet.");
}
export async function handleApi(req: NextRequest, path: string[]): Promise<NextResponse> {
  try {
    if (!["GET", "HEAD"].includes(req.method)) assertSameOrigin(req);
    const route = path.join("/");
    const method = req.method;
    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (route === "healthz" && method === "GET") return json({ status: "ok" });
    if (route === "kv/demo" && method === "POST") {
      if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEMO !== "true") throw new HttpError(403, "Demo mode is disabled.");
      rateLimit(`demo:${ip}`, 12, 60 * 60 * 1000);
      return json(await createDemoFamily());
    }
    if (route === "kv/register" && method === "POST") {
      rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
      const data = RegisterParentBody.parse(await body(req));
      const email = data.email.trim().toLowerCase();
      if (await findUser(email)) throw new HttpError(409, "An account already uses this email.");
      const id = randomUUID();
      const user: StoredUser = { id, name: data.name.trim(), email, identifier: email, passwordHash: await hash(data.password, 12), role: "parent", avatar: "parent", isDemo: storageMode() === "local-demo", completedLessons: [], notifications: true, dailyLimit: 0, monthlyLimit: 0, createdAt: now(), revision: 0 };
      if (user.name.length < 2) throw new HttpError(400, "Please enter your name.");
      await mutateState(id, s => {
        if (s.users.some(u => u.identifier === email)) throw new HttpError(409, "An account already uses this email.");
        s.users.push(user);
        logActivity(s, user, "registration", "Created a KidVest family account.");
      });
      return json(publicUser(user), 201);
    }
    const user = await currentUser();
    const pid = parentId(user);
    if (route.startsWith("stocks/")) {
      rateLimit(`market:${user.id}`, 180, 60000);
      if (method !== "GET") throw new HttpError(405, "Method not allowed.");
      if (route === "stocks/trending") return json(await popular(user.isDemo));
      if (route === "stocks/search") return json(await search(SearchStocksQueryParams.parse(query).q, user.isDemo));
      if (route === "stocks/quote") return json(await quote(GetStockQuoteQueryParams.parse(query).symbol, user.isDemo));
      if (route === "stocks/chart") {
        const data = GetStockChartQueryParams.parse(query);
        return json(await chart(data.symbol, data.range, user.isDemo));
      }
    }
    if (route === "kv/settings") {
      if (method === "GET") return json(publicUser(user));
      if (method === "PATCH") {
        requireRole(user, "parent");
        const data = UpdateSettingsBody.parse(await body(req));
        if (data.newPassword && (!data.currentPassword || !await compare(data.currentPassword, user.passwordHash))) throw new HttpError(400, "Your current password is incorrect.");
        if (data.email) {
          const existing = await findUser(data.email.trim().toLowerCase());
          if (existing && existing.id !== user.id) throw new HttpError(409, "An account already uses this email.");
        }
        const passwordHash = data.newPassword ? await hash(data.newPassword, 12) : undefined;
        const updated = await mutateState(pid, s => {
          const u = s.users.find(x => x.id === user.id)!;
          if (data.name !== undefined) {
            if (data.name.trim().length < 2) throw new HttpError(400, "Please enter your name.");
            u.name = data.name.trim();
          }
          if (data.email) { u.email = data.email.trim().toLowerCase(); u.identifier = u.email; }
          if (data.notifications !== undefined) u.notifications = data.notifications;
          if (passwordHash) u.passwordHash = passwordHash;
          logActivity(s, u, "settings", "Updated account settings.");
          return publicUser(u);
        });
        return json(updated);
      }
    }
    if (route === "kv/kids") {
      requireRole(user, "parent");
      if (method === "GET") {
        const s = await readState(pid);
        return json(await Promise.all(s.users.filter(k => k.parentId === pid && k.role === "kid").map(k => kidView(s, k))));
      }
      if (method === "POST") {
        const data = CreateKidBody.parse(await body(req));
        const username = usernameSchema.parse(data.username);
        const name = data.name.trim();
        if (name.length < 2) throw new HttpError(400, "Please enter your child's name.");
        if (await findUser(username)) throw new HttpError(409, "This username is already taken.");
        const kid: StoredUser = { ...data, id: randomUUID(), name, username, identifier: username, passwordHash: await hash(data.password, 12), role: "kid", parentId: pid, isDemo: user.isDemo, notifications: true, completedLessons: [], revision: 0, createdAt: now() };
        // Never persist plaintext passwords from the parsed input.
        delete (kid as StoredUser & { password?: string }).password;
        const safe = await mutateState(pid, s => {
          if (s.users.some(u => u.identifier === username)) throw new HttpError(409, "This username is already taken.");
          s.users.push(kid);
          s.wallets.push({ id: randomUUID(), kidId: kid.id, parentId: pid, balance: 0, currency: "USD" });
          logActivity(s, user, "kid_created", `Added ${kid.name} to the family.`, kid.id);
          return kidView(s, kid);
        });
        return json(safe, 201);
      }
    }
    if (path[0] === "kv" && path[1] === "kids" && path.length === 3) {
      requireRole(user, "parent");
      const id = path[2];
      if (method === "PATCH") {
        const data = UpdateKidBody.parse(await body(req));
        if (data.username !== undefined) {
          data.username = usernameSchema.parse(data.username);
          const existing = await findUser(data.username);
          if (existing && existing.id !== id) throw new HttpError(409, "This username is already taken.");
        }
        const passwordHash = data.password ? await hash(data.password, 12) : undefined;
        return json(await mutateState(pid, s => {
          const kid = ownKid(s, user, id);
          for (const key of ["name", "avatar", "age", "dailyLimit", "monthlyLimit"] as const) {
            const v = data[key];
            if (v !== undefined) (kid as unknown as Record<string, unknown>)[key] = typeof v === "string" ? v.trim() : v;
          }
          if (kid.name.length < 2) throw new HttpError(400, "Please enter your child's name.");
          if (data.username) { kid.username = data.username; kid.identifier = data.username; }
          if (passwordHash) kid.passwordHash = passwordHash;
          // Keep historical request labels stable; use current name for pending reviews.
          s.requests.filter(r => r.kidId === id && r.status === "pending").forEach(r => { r.kidName = kid.name; r.kidAvatar = kid.avatar; });
          logActivity(s, user, "kid_updated", `Updated ${kid.name}'s profile or limits.`, kid.id);
          return kidView(s, kid);
        }));
      }
      if (method === "DELETE") {
        await mutateState(pid, s => {
          const kid = ownKid(s, user, id);
          s.users = s.users.filter(k => k.id !== id);
          s.wallets = s.wallets.filter(w => w.kidId !== id);
          s.holdings = s.holdings.filter(h => h.kidId !== id);
          for (const r of s.requests) if (r.kidId === id && r.status === "pending") { r.status = "cancelled"; r.updatedAt = now(); }
          logActivity(s, user, "kid_deleted", `Deleted ${kid.name}'s account, virtual wallet and holdings. Historical audit records retained.`, kid.id);
        });
        return json({ success: true });
      }
    }
    if (route === "kv/requests") {
      if (method === "GET") {
        const s = await readState(pid);
        return json(s.requests.filter(r => user.role === "parent" || r.kidId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
      if (method === "POST") {
        requireRole(user, "kid");
        rateLimit(`request:${user.id}`, 30, 60000);
        const data = CreateRequestBody.parse(await body(req));
        const quantity = quantitySchema.parse(data.quantity);
        const q = await quote(data.symbol, user.isDemo);
        ensureUsd(q.currency);
        if (cents(quantity * q.price) < 0.01) throw new HttpError(400, "The request must be worth at least $0.01.");
        const r = await mutateState(pid, s => {
          ownKid(s, user, user.id);
          if (data.type === "sell") {
            const holding = s.holdings.find(h => h.kidId === user.id && h.symbol === q.symbol);
            if (!holding || holding.quantity + 1e-8 < quantity) throw new HttpError(400, "You don't own enough shares to request this sale.");
          }
          const timestamp = now();
          const record = { id: randomUUID(), kidId: user.id, parentId: pid, kidName: user.name, kidAvatar: user.avatar, symbol: q.symbol, companyName: q.name, quantity, priceAtRequest: q.price, totalCost: cents(quantity * q.price), kidNote: data.kidNote?.trim() || "", parentComment: "", status: "pending" as const, type: data.type, source: q.source, createdAt: timestamp, updatedAt: timestamp };
          s.requests.push(record);
          logActivity(s, user, "request", `${user.name} requested to ${data.type} ${quantity} shares of ${q.symbol}.`, user.id);
          return record;
        });
        return json(r, 201);
      }
    }
    if (path[0] === "kv" && path[1] === "requests" && path.length === 3 && method === "PATCH") {
      const data = ReviewRequestBody.parse(await body(req));
      const id = path[2];
      const existing = (await readState(pid)).requests.find(r => r.id === id);
      if (!existing || (user.role === "kid" && existing.kidId !== user.id)) throw new HttpError(404, "Request not found.");
      if (data.action !== "cancel") requireRole(user, "parent");
      if (data.quantity !== undefined) quantitySchema.parse(data.quantity);
      const q = data.action === "approve" ? await quote(existing.symbol, user.isDemo) : undefined;
      if (q) ensureUsd(q.currency);
      const result = await mutateState(pid, s => {
        const r = s.requests.find(r => r.id === id);
        if (!r || r.status !== "pending") throw new HttpError(409, "This request has already been reviewed.");
        const kid = ownKid(s, user, r.kidId);
        if (data.action === "cancel") {
          if (user.role !== "kid") throw new HttpError(403, "Only the child can cancel their pending request.");
          r.status = "cancelled";
        } else if (data.action === "reject") {
          r.status = "rejected";
        } else {
          const quantity = data.quantity ?? r.quantity;
          const total = cents(quantity * q!.price);
          if (total < 0.01) throw new HttpError(400, "The request must be worth at least $0.01.");
          const wallet = s.wallets.find(w => w.kidId === r.kidId)!;
          let holding = s.holdings.find(h => h.kidId === r.kidId && h.symbol === r.symbol);
          if (r.type === "buy") {
            const approvedBuys = s.requests.filter(x => x.kidId === kid.id && x.status === "approved" && x.type === "buy");
            const day = now().slice(0, 10), month = now().slice(0, 7);
            const spent = (prefix: string) => cents(approvedBuys.filter(x => x.updatedAt.startsWith(prefix)).reduce((a, x) => a + x.totalCost, 0));
            if (spent(day) + total > kid.dailyLimit + 1e-8) throw new HttpError(400, `This exceeds ${kid.name}'s daily spending limit.`);
            if (spent(month) + total > kid.monthlyLimit + 1e-8) throw new HttpError(400, `This exceeds ${kid.name}'s monthly spending limit.`);
            if (wallet.balance < total) return { success: false, missingAmount: cents(total - wallet.balance), message: kid.isDemo ? `Add $${cents(total - wallet.balance).toFixed(2)} in demo credits to ${kid.name}'s wallet, then approve again.` : `The wallet needs $${cents(total - wallet.balance).toFixed(2)} more. Stripe test payments must be connected before topping up.` };
            wallet.balance = cents(wallet.balance - total);
            if (holding) {
              holding.avgBuyPrice = (holding.quantity * holding.avgBuyPrice + quantity * q!.price) / (holding.quantity + quantity);
              holding.quantity = +(holding.quantity + quantity).toFixed(6);
            } else s.holdings.push({ id: randomUUID(), kidId: kid.id, parentId: pid, symbol: r.symbol, companyName: r.companyName, quantity, avgBuyPrice: q!.price });
          } else {
            if (!holding || holding.quantity + 1e-8 < quantity) throw new HttpError(400, "Not enough shares remain for this sale.");
            holding.quantity = +(holding.quantity - quantity).toFixed(6);
            if (holding.quantity <= 0) s.holdings = s.holdings.filter(h => h.id !== holding!.id);
            wallet.balance = cents(wallet.balance + total);
          }
          r.quantity = quantity;
          r.priceAtApproval = q!.price;
          r.totalCost = total;
          r.source = q!.source;
          r.status = "approved";
          s.transactions.unshift({ id: randomUUID(), parentId: pid, kidId: kid.id, kidName: kid.name, amount: total, type: r.type === "buy" ? "purchase" : "sale", status: "completed", createdAt: now(), isDemo: user.isDemo, symbol: r.symbol, quantity });
        }
        r.parentComment = data.parentComment?.trim() || "";
        r.updatedAt = now();
        logActivity(s, user, r.status, `${user.name} ${r.status} ${kid.name}'s ${r.type} request for ${r.symbol}.`, kid.id);
        return { success: true, message: `Request ${r.status}.` };
      });
      return json(result);
    }
    if (route === "kv/portfolio" && method === "GET") {
      const s = await readState(pid);
      if (query.kidId) ownKid(s, user, query.kidId);
      const ids = user.role === "kid" ? [user.id] : query.kidId ? [query.kidId] : s.users.filter(u => u.parentId === pid && u.role === "kid").map(u => u.id);
      return json(await portfolio(s, ids, user.isDemo));
    }
    if (route === "kv/activity" && method === "GET") {
      const s = await readState(pid);
      return json(s.activity.filter(a => user.role === "parent" || a.kidId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100));
    }
    if (route === "kv/payments") {
      requireRole(user, "parent");
      if (method === "GET") {
        const s = await readState(pid);
        return json(s.transactions.filter(t => ["deposit", "refund"].includes(t.type)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
      if (method === "POST") {
        const data = FundWalletBody.parse(await body(req));
        rateLimit(`fund:${user.id}`, 30, 60000);
        if (!user.isDemo) throw new HttpError(503, "Stripe is not connected yet. No payment has been taken and no funds have been added. Connect Stripe test mode to enable checkout.");
        if (cents(data.amount) !== data.amount) throw new HttpError(400, "Use dollars and cents only.");
        await mutateState(pid, s => {
          const kid = ownKid(s, user, data.kidId);
          const wallet = s.wallets.find(w => w.kidId === kid.id)!;
          wallet.balance = cents(wallet.balance + data.amount);
          s.transactions.unshift({ id: randomUUID(), parentId: pid, kidId: kid.id, kidName: kid.name, amount: data.amount, type: "deposit", status: "completed", createdAt: now(), isDemo: true });
          logActivity(s, user, "demo_deposit", `Added $${data.amount.toFixed(2)} in demo credits to ${kid.name}'s virtual wallet. No payment was taken.`, kid.id);
        });
        return json({ success: true, message: "Demo credits added. No real payment was taken." });
      }
    }
    if (route === "kv/lessons" && method === "GET") {
      requireRole(user, "kid");
      return json(lessonCatalog.map(({ answer: _answer, ...lesson }) => ({ ...lesson, completed: user.completedLessons.includes(lesson.id) })));
    }
    if (path[0] === "kv" && path[1] === "lessons" && path[3] === "complete" && path.length === 4 && method === "POST") {
      requireRole(user, "kid");
      const lesson = lessonCatalog.find(l => l.id === path[2]);
      if (!lesson) throw new HttpError(404, "Lesson not found.");
      const data = CompleteLessonBody.parse(await body(req));
      if (data.answer !== lesson.answer) return json({ correct: false, message: "Not quite! Read the lesson and try again. You can do this.", xp: 0 });
      return json(await mutateState(pid, s => {
        const kid = ownKid(s, user, user.id);
        if (kid.completedLessons.includes(lesson.id)) return { correct: true, message: "You've already earned this badge. Great practice!", xp: 0 };
        kid.completedLessons.push(lesson.id);
        logActivity(s, kid, "lesson", `${kid.name} completed “${lesson.title}”.`, kid.id);
        return { correct: true, message: "Well done! You earned a new learning badge.", xp: lesson.xp };
      }));
    }
    if (route === "kv/dashboard" && method === "GET") {
      const s = await readState(pid);
      const kids = s.users.filter(k => k.role === "kid" && k.parentId === pid && (user.role === "parent" || k.id === user.id));
      const ids = kids.map(k => k.id);
      const p = await portfolio(s, ids, user.isDemo);
      const requests = s.requests.filter(r => ids.includes(r.kidId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const activity = s.activity.filter(a => user.role === "parent" || a.kidId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
      return json({
        user: publicUser(user), kids: await Promise.all(kids.map(k => kidView(s, k))),
        totalValue: p.totalValue, balance: p.balance, gainLoss: p.gainLoss,
        pendingCount: requests.filter(r => r.status === "pending").length,
        requests: requests.slice(0, 6), activity, chart: ledgerChart(s, ids),
        completedLessonCount: kids.reduce((a, k) => a + k.completedLessons.length, 0),
        xp: lessonCatalog.filter(l => user.completedLessons.includes(l.id)).reduce((a, l) => a + l.xp, 0),
        marketSource: user.isDemo ? "demo" : "live", storageMode: storageMode(), stripeEnabled: false,
      });
    }
    throw new HttpError(404, "Endpoint not found.");
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError || (error instanceof Error && error.name === "ZodError")) return json({ error: "Please check the form fields and try again.", details: (error as z.ZodError).issues?.map(i => ({ field: i.path.join("."), message: i.message })) }, 400);
    if ((error as { code?: number })?.code === 11000) return json({ error: "This email or username is already taken." }, 409);
    // Do not log raw exceptions: database/HTTP errors may contain credentials or user input.
    console.error("KidVest request failed", { route: path.slice(0, 2).join("/"), code: error instanceof Error ? error.name : "unknown" });
    return json({ error: "Something went wrong. Please try again shortly." }, 500);
  }
}
