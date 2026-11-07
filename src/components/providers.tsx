"use client";

import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n";

/** Global providers: language (EN/JA) + toast notifications for the theme. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--surface-2)",
            border: "1px solid var(--border-strong)",
            color: "var(--foreground)",
          },
        }}
      />
    </I18nProvider>
  );
}
