"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

/** Route-group error boundary for dashboard/projects/admin segments. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLang();

  useEffect(() => {
    console.error("[app] route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-20 text-center">
      <AlertTriangle size={26} className="text-warning" />
      <h2 className="text-[15px] font-medium">{t("err.somethingWrong")}</h2>
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
