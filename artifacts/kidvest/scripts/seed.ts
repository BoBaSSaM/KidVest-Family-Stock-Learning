import { loadEnvConfig } from "@next/env";
import { randomBytes, randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { mutateState, findUser } from "../src/lib/store";
import { now, type StoredUser } from "../src/lib/domain";

loadEnvConfig(process.cwd());
async function main() {
  const email = "parent@kidvest.example";
  if (await findUser(email)) {
    process.stdout.write("Demo parent already exists; no accounts were changed.\n");
    return;
  }
  const password = `Kv-${randomBytes(9).toString("base64url")}`;
  const passwordHash = await hash(password, 12);
  const id = randomUUID();
  const parent: StoredUser = { id, name: "Demo Parent", email, identifier: email, passwordHash, role: "parent", avatar: "parent", isDemo: true, completedLessons: [], notifications: true, dailyLimit: 0, monthlyLimit: 0, revision: 0, authVersion: 0, createdAt: now() };
  await mutateState(id, state => {
    state.users.push(parent);
    for (const [i, name] of ["Oliver", "Sophie"].entries()) {
      const kid: StoredUser = { ...parent, id: randomUUID(), email: undefined, name, username: `demo_${name.toLowerCase()}`, identifier: `demo_${name.toLowerCase()}`, role: "kid", parentId: id, avatar: i === 0 ? "fox" : "bunny", age: i === 0 ? 10 : 8, dailyLimit: 1000, monthlyLimit: 5000 };
      state.users.push(kid);
      state.wallets.push({ id: randomUUID(), kidId: kid.id, parentId: id, balance: 500, currency: "USD" });
      state.transactions.push({ id: randomUUID(), parentId: id, kidId: kid.id, kidName: name, amount: 500, type: "deposit", status: "completed", createdAt: now(), isDemo: true });
      state.requests.push({ id: randomUUID(), kidId: kid.id, parentId: id, kidName: name, kidAvatar: kid.avatar, symbol: i === 0 ? "DIS" : "NKE", companyName: i === 0 ? "Walt Disney" : "Nike", quantity: 1, priceAtRequest: i === 0 ? 112.84 : 73.42, totalCost: i === 0 ? 112.84 : 73.42, kidNote: "I want to learn how this company works.", parentComment: "", status: "pending", type: "buy", source: "demo", createdAt: now(), updatedAt: now() });
    }
  });
  // Generated per invocation, not a committed/shared credential. Do not use in production.
  process.stdout.write(`Local demo accounts created.\nParent: ${email}\nKids: demo_oliver, demo_sophie\nOne-time generated demo password: ${password}\n`);
}
main().then(() => process.exit(0)).catch(() => { process.stderr.write("Seed failed. Check MongoDB connection and network access.\n"); process.exit(1); });
