"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

/** Root error boundary (matches the (app) boundary, full-screen). */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLang();

  useEffect(() => {
    console.error("[root] route error:", error);
  }, [error]);

  return (
    <div className="bg-gradient-mesh flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface ring-1 ring-inset ring-border">
        <AlertTriangle size={24} className="text-warning" />
      </span>
      <h1 className="text-lg font-semibold tracking-tight">{t("err.somethingWrong")}</h1>
      <p className="max-w-md text-[13px] text-muted">
        {error.message || t("err.unexpected")}
      </p>
      <Button variant="secondary" size="sm" onClick={reset}>
        <RotateCcw size={13} />
        {t("err.retry")}
      </Button>
    </div>
  );
}
