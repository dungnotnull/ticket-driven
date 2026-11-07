import { ApiError } from "./api";

/**
 * In-memory fixed-window rate limiter (single instance). Protects the
 * sensitive public/mutating APIs from scripted abuse and accidental spam:
 * login/register brute force, upload presign bursts, comment/review floods
 * and Gemini cost runaway. NOT shared across cluster instances - for the
 * deployed single-node setup that is exactly the intended scope.
 */

interface WindowState {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, WindowState>();

export interface RateLimitOptions {
  /** Max requests allowed inside one window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

/** Rate limits per critical API surface (bucket -> config). */
export const RATE_LIMITS: Record<string, RateLimitOptions> = {
  login: { limit: 10, windowMs: 5 * 60_000 },
  register: { limit: 5, windowMs: 15 * 60_000 },
  tickets: { limit: 30, windowMs: 60_000 },
  comments: { limit: 20, windowMs: 60_000 },
  review: { limit: 20, windowMs: 60_000 },
  questions: { limit: 40, windowMs: 60_000 },
  aiReview: { limit: 5, windowMs: 60_000 },
  presign: { limit: 30, windowMs: 60_000 },
  mediaCleanup: { limit: 15, windowMs: 60_000 },
};

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return ip;
}

/**
 * Throws ApiError(429) when the caller exceeds the bucket's fixed window.
 * `identity` (e.g. attempted email or ticket id) refines the key so one
 * hot account cannot lock out everyone else behind the same IP.
 */
export function enforceRateLimit(
  request: Request,
  bucket: keyof typeof RATE_LIMITS,
  identity?: string,
): void {
  const config = RATE_LIMITS[bucket];
  if (!config) return;
  const now = Date.now();
  const key = `${bucket}:${clientKey(request)}:${identity ?? "*"}`;
  const state = buckets.get(key);
  if (!state || state.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return;
  }
  state.count += 1;
  if (state.count > config.limit) {
    throw new ApiError(429, "Too many requests - please slow down and try again shortly.");
  }
}

/**
 * Login-specific brake that only FAILED attempts count: legitimate
 * users/batteries may log in repeatedly, brute-force attackers do not.
 * Reads the failure bucket WITHOUT incrementing (fast path when clean).
 */
export function assertLoginAllowed(
  request: Request,
  identity?: string,
): void {
  const config = RATE_LIMITS.login;
  const now = Date.now();
  const key = `login:${clientKey(request)}:${identity ?? "*"}`;
  const state = buckets.get(key);
  if (state && state.resetAt > now && state.count >= config.limit) {
    throw new ApiError(429, "Too many requests - please slow down and try again shortly.");
  }
}

/** Records one FAILED login attempt into the failure-only bucket. */
export function recordLoginFailure(request: Request, identity?: string): void {
  const config = RATE_LIMITS.login;
  const now = Date.now();
  const key = `login:${clientKey(request)}:${identity ?? "*"}`;
  const state = buckets.get(key);
  if (!state || state.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return;
  }
  state.count += 1;
}

/** Opportunistic cleanup so idle buckets do not grow the map forever. */
export function pruneRateLimits(now = Date.now()): void {
  for (const [key, state] of buckets) {
    if (state.resetAt <= now) buckets.delete(key);
  }
}
