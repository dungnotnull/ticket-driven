"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useSyncExternalStore } from "react";
import {
  DEFAULT_LANG,
  LANG_COOKIE,
  LANGS,
  type DictKey,
  type Lang,
  tFor,
} from "@/lib/i18n/dictionary";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

/**
 * External store for the UI language (same pattern as theme-store.ts):
 * React reads it via useSyncExternalStore - no setState-in-effect, and the
 * server snapshot ("en") matches the SSR HTML while the client re-renders to
 * the stored choice right after hydration.
 */
const listeners = new Set<() => void>();
let cached: Lang | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function readLang(): Lang {
  if (cached) return cached;
  let next: Lang = DEFAULT_LANG;
  try {
    const raw = window.localStorage.getItem(LANG_COOKIE);
    if (raw && (LANGS as readonly string[]).includes(raw)) next = raw as Lang;
  } catch {
    /* storage unavailable */
  }
  cached = next;
  return next;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANG_COOKIE) {
      cached = null;
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setLangStore(lang: Lang) {
  cached = lang;
  try {
    window.localStorage.setItem(LANG_COOKIE, lang);
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* storage unavailable */
  }
  document.documentElement.lang = lang;
  emit();
}

export function useLangStore(): Lang {
  return useSyncExternalStore(subscribe, readLang, () => DEFAULT_LANG);
}

/** Client language provider. Default stays "en" (QA-stable). */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang = useLangStore();

  const setLang = useCallback((next: Lang) => setLangStore(next), []);
  const toggle = useCallback(() => setLangStore(lang === "en" ? "ja" : "en"), [lang]);
  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => tFor(lang, key, vars),
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, toggle, t }),
    [lang, setLang, toggle, t],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  // Outside the provider (e.g. global-error): fall back to English keys.
  if (!ctx) {
    return {
      lang: DEFAULT_LANG,
      setLang: () => undefined,
      toggle: () => undefined,
      t: (key) => tFor(DEFAULT_LANG, key),
    };
  }
  return ctx;
}
