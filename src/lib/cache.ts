/**
 * Tiny in-process TTL cache for expensive read-only aggregates (org stats,
 * knowledge graph). The app runs a single Node process, so a Map is the right
 * tool; every entry carries tags and any document mutation drops the affected
 * entries instantly via Mongoose middleware (see src/lib/models.ts).
 *
 * Interleaving model (what is cached vs always-fresh):
 *  - cached: derived, read-mostly aggregates (analytics org stats 2 min,
 *    knowledge graph 5 min). Cross-user edits appear at most TTL later; the
 *    editing user sees their own change immediately (middleware invalidation).
 *  - never cached: ticket/board/comments/reviews/questions reads, project
 *    detail, user lists - collaboration data must always be the latest.
 */

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Read-through cache. Returns the fresh-ENOUGH cached value while it lives,
 * otherwise builds it - concurrent callers share one in-flight build so a
 * burst of navigations causes a single DB round trip.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  build: () => Promise<T>,
): Promise<T> {
  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;

  const job = build()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, job);
  return job;
}

/** Drop every cached aggregate entry (called from model write middleware). */
export function invalidateReadCaches(): void {
  store.clear();
  inflight.clear();
}
