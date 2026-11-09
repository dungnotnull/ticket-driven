"use client";

import { useSyncExternalStore } from "react";

/**
 * Round-34b pending-ticket handoff: the notification bell drops a ticket
 * reference here BEFORE navigating, and whichever board view comes up next
 * (fresh mount OR an already-running one) picks it up and opens the modal.
 *
 * This makes every ticket-scope notification click deterministic:
 *  - soft navigation deduped by the router (same board already open) ->
 *    the event still reaches the mounted workspace (modal opens instantly);
 *  - a real navigation -> the new board hydrates and consumes the entry;
 *  - a hard load with ?ticket=<id> -> the server-prop path stays authoritative.
 *
 * Implemented as an external store (useSyncExternalStore, like the board
 * hydration gate) so effects never have to call setState to react to it.
 */

export type PendingTicket = { pid: string; tid: string; ts: number };

const KEY = "dym.pendingTicket";
const listeners = new Set<() => void>();
/** Stable cache: getSnapshot MUST return an identical value between renders. */
const cache: { raw: string | null | undefined; value: PendingTicket | null } = {
  raw: undefined,
  value: null,
};

function emit() {
  for (const l of listeners) l();
}

export function pushPendingTicket(pid: string, tid: string) {
  if (typeof window === "undefined" || !tid) return;
  const entry: PendingTicket = { pid, tid, ts: Date.now() };
  sessionStorage.setItem(KEY, JSON.stringify(entry));
  emit();
}

export function consumePendingTicket() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
  emit();
}

/** Peek (never consume) the newest pending ticket, or null on the server. */
export function usePendingTicket(): PendingTicket | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      window.addEventListener("storage", listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
    () => {
      const raw = typeof window === "undefined" ? null : sessionStorage.getItem(KEY);
      if (cache.raw === raw) return cache.value;
      let value: PendingTicket | null = null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as PendingTicket;
          value = parsed && Date.now() - parsed.ts < 15_000 ? parsed : null;
        } catch {
          value = null;
        }
      }
      cache.raw = raw;
      cache.value = value;
      return value;
    },
    () => null,
  );
}
