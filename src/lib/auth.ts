import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { UserModel, GLOBAL_ROLES, type GlobalRole } from "./models";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
} from "./session-token";
import { ApiError } from "./api";

const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function createSessionCookie(userId: string) {
  const token = await signSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  globalRole: GlobalRole;
}

interface IdentifiableDoc {
  _id: { toString(): string };
  name: string;
  email: string;
  globalRole?: string;
}

export function toSessionUser(doc: IdentifiableDoc): SessionUser {
  const globalRole = GLOBAL_ROLES.includes(doc.globalRole as GlobalRole)
    ? (doc.globalRole as GlobalRole)
    : "team";
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    globalRole,
  };
}

/** Read the signed-in user from the session cookie, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  if (!/^[a-f\d]{24}$/i.test(userId)) return null;
  // LAYOUTS/PAGES call this directly - unlike API routes they never await
  // connectDB() first, so the model op would buffer with Mongoose DEFAULT
  // timeouts (the "buffering timed out after 10000ms" incident class on
  // serverless: cold instance + slow first connect). Cached + idempotent.
  await connectDB();
  const user = await UserModel.findById(userId).lean();
  if (!user) return null;
  return toSessionUser(
    user as unknown as { _id: { toString(): string }; name: string; email: string; globalRole?: string },
  );
}

/** Guard for API routes / server actions: throws 401 API error when absent. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "You must be signed in.");
  return user;
}
