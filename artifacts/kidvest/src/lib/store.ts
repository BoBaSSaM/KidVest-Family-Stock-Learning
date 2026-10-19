import mongoose from "mongoose";
import fs from "node:fs/promises";
import path from "node:path";
import { models } from "@/models";
import { emptyState, HttpError, type State, type StoredUser } from "./domain";

type Cache = { connection?: Promise<typeof mongoose>; queue: Promise<unknown> };
const root = globalThis as typeof globalThis & { kidvestStore?: Cache };
const cache = root.kidvestStore ??= { queue: Promise.resolve() };
const filename = path.join(process.cwd(), ".data", "learning-demo.json");
export const storageMode = () => process.env.MONGODB_URI ? "mongodb" : "local-demo";
async function connect() {
  if (!process.env.MONGODB_URI) throw new HttpError(503, "MongoDB connection is not configured.");
  cache.connection ??= mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 }).then(async db => {
    await Promise.all(Object.values(models).map(model => model.init()));
    return db;
  }).catch(() => {
    cache.connection = undefined;
    throw new HttpError(503, "MongoDB is unavailable. Check the connection and Atlas network access.");
  });
  await cache.connection;
}
async function localRead(): Promise<State> {
  if (process.env.NODE_ENV === "production") throw new HttpError(503, "Configure MongoDB before publishing. Local demo storage is development-only.");
  try { return JSON.parse(await fs.readFile(filename, "utf8")); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return emptyState(); throw e; }
}
async function localWrite(s: State) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(`${filename}.tmp`, JSON.stringify(s), { mode: 0o600 });
  await fs.rename(`${filename}.tmp`, filename);
}
function filterFor(key: keyof State, parentId?: string) {
  return !parentId ? {} : key === "users" ? { $or: [{ _id: parentId }, { parentId }] } : { parentId };
}
function fromMongo(doc: Record<string, unknown>) {
  const { _id, ...rest } = doc;
  return { ...rest, id: String(_id) };
}
async function mongoRead(parentId?: string, session?: mongoose.ClientSession): Promise<State> {
  const s = emptyState();
  for (const key of Object.keys(models) as (keyof State)[]) {
    const q = models[key].find(filterFor(key, parentId)).lean();
    if (session) q.session(session);
    (s[key] as unknown[]) = (await q.exec()).map(doc => fromMongo(doc as unknown as Record<string, unknown>));
  }
  return s;
}
export async function readState(parentId?: string): Promise<State> {
  if (!process.env.MONGODB_URI) {
    const s = await localRead();
    if (!parentId) return s;
    return {
      users: s.users.filter(u => u.id === parentId || u.parentId === parentId),
      wallets: s.wallets.filter(x => x.parentId === parentId),
      requests: s.requests.filter(x => x.parentId === parentId),
      holdings: s.holdings.filter(x => x.parentId === parentId),
      transactions: s.transactions.filter(x => x.parentId === parentId),
      activity: s.activity.filter(x => x.parentId === parentId),
    };
  }
  await connect();
  return mongoRead(parentId);
}
// Atlas transactions + parent revision writes serialize all family financial changes.
// Driver retries transient write conflicts; no lost wallet updates or double approvals.
export async function mutateState<T>(parentId: string, fn: (state: State) => Promise<T> | T): Promise<T> {
  if (!process.env.MONGODB_URI) {
    const task = cache.queue.catch(() => undefined).then(async () => {
      const s = await localRead();
      const result = await fn(s);
      await localWrite(s);
      return result;
    });
    cache.queue = task.catch(() => undefined);
    return task;
  }
  await connect();
  return mongoose.connection.transaction(async session => {
    const before = await mongoRead(parentId, session);
    const after = structuredClone(before);
    const result = await fn(after);
    const parent = after.users.find(u => u.id === parentId);
    if (parent) parent.revision = (parent.revision || 0) + 1;
    // Execute sequentially: MongoDB does not support parallel operations in transactions.
    for (const key of Object.keys(models) as (keyof State)[]) {
      const current = after[key];
      const removed = before[key].filter(x => !current.some(y => y.id === x.id)).map(x => x.id);
      if (removed.length) await models[key].deleteMany({ _id: { $in: removed } }, { session });
      for (const row of current) {
        const { id, ...fields } = row;
        await models[key].replaceOne({ _id: id }, { _id: id, ...fields }, { session, upsert: true });
      }
    }
    return result;
  });
}
export async function findUser(identifierOrId: string): Promise<StoredUser | undefined> {
  if (!process.env.MONGODB_URI) return (await localRead()).users.find(u => u.id === identifierOrId || u.identifier === identifierOrId.toLowerCase());
  await connect();
  const doc = await models.users.findOne({ $or: [{ _id: identifierOrId }, { identifier: identifierOrId.toLowerCase() }] }).lean();
  return doc ? fromMongo(doc as unknown as Record<string, unknown>) as StoredUser : undefined;
}
export async function findDemoUser(key: string, role: "parent" | "kid") {
  if (!process.env.MONGODB_URI) return (await localRead()).users.find(u => u.demoKey === key && u.role === role);
  await connect();
  const doc = await models.users.findOne({ demoKey: key, role }).lean();
  return doc ? fromMongo(doc as unknown as Record<string, unknown>) as StoredUser : undefined;
}
