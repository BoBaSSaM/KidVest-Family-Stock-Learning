import { HttpError, type StoredUser } from "./domain";

// Missing persisted values belong to pre-versioning accounts. Missing JWT
// claims, however, must force a fresh login, never adopt the current version.
export function authVersion(user: StoredUser): number {
  const version = user.authVersion ?? 0;
  if (!Number.isSafeInteger(version) || version < 0) throw new HttpError(401, "Please sign in again.");
  return version;
}

export type SessionIdentity = { id?: string; role?: string; authVersion?: number };

export function requireCurrentSession(identity: SessionIdentity | undefined, user: StoredUser | undefined): StoredUser {
  if (!identity?.id || !user || identity.id !== user.id) throw new HttpError(401, "Please sign in again.");
  if (identity.role !== user.role) throw new HttpError(403, "Access denied.");
  if (!Number.isSafeInteger(identity.authVersion) || identity.authVersion !== authVersion(user)) {
    throw new HttpError(401, "Your password has changed. Please sign in again.");
  }
  return user;
}

export function replacePassword(user: StoredUser, passwordHash: string) {
  const next = authVersion(user) + 1;
  if (!Number.isSafeInteger(next)) throw new HttpError(409, "Unable to change this password.");
  user.passwordHash = passwordHash;
  user.authVersion = next;
  // A demo key is also a login credential; it must not bypass a password reset.
  delete user.demoKey;
}
