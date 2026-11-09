import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/admin"];

/**
 * Edge "proxy" (Next 16 middleware). Only performs the cheap JWT/cookie
 * check for optimistic redirects - every API route and server action
 * re-verifies the session + project RBAC on the server (defense in depth).
 *
 * Deliberately does NOT bounce signed-in visitors away from /login and
 * /register: the edge runtime cannot verify that the cookie's user still
 * exists in the DB, and bouncing would ping-pong with the (app) layout's
 * "user not found → /login" redirect into ERR_TOO_MANY_REDIRECTS (a stale
 * cookie pointing at a wiped/deleted user). /login must always terminate.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !userId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  // Authenticated documents must NEVER be edge-cached cross-user: the bare
  // Next default is `public, max-age=0, must-revalidate` WITHOUT `Vary:
  // Cookie`, so a render made for a signed-out visitor (the layout's
  // redirect-to-login shell) can be poisoned into the shared edge cache and
  // served to signed-in users as a 200 containing that meta redirect.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/admin/:path*",
  ],
};
