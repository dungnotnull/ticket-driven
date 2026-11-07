"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

/**
 * External store wrapping the <html data-theme> attribute so React can read
 * it without hydration-mismatched render-time DOM reads or setState-in-effect
 * lint violations.
 */
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Other tabs may change the theme too.
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function onStorage(event: StorageEvent) {
  if (event.key === "orcaboard-theme") emit();
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  try {
    window.localStorage.setItem("orcaboard-theme", next);
  } catch {
    /* storage unavailable */
  }
  emit();
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    readTheme,
    () => "light" as Theme,
  );
}
