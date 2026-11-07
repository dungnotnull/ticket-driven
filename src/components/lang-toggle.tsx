"use client";

import { Languages } from "lucide-react";
import { useLang } from "@/lib/i18n";

/** EN ⇄ JA chrome-language switcher, shared by the app header and the
 * auth (login/register) pages - chrome text only, user data untouched. */
export function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={lang === "en" ? "Switch language to Japanese" : "言語を英語に切り替える"}
      title={lang === "en" ? "日本語に切り替え" : "Switch to English"}
      data-testid="lang-toggle"
      className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-[11.5px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Languages size={13} />
      {lang === "en" ? "EN" : "JA"}
    </button>
  );
}
