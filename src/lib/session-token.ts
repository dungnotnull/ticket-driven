import { SignJWT, jwtVerify } from "jose";

/**
 * Edge-safe session token utilities (no DB / Mongoose imports here so that
 * `proxy.ts` can reuse them in the edge runtime).
 */

export const SESSION_COOKIE = "kanban_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const encoder = new TextEncoder();

function secretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ?? "insecure-dev-secret-change-me-in-env";
  return encoder.encode(secret);
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

/** Returns the user id encoded in a valid, unexpired session token. */
export async function verifySessionToken(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload, } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
