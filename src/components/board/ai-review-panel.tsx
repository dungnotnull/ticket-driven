"use client";

import { useState } from "react";
import { LoaderCircle, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { explainApi } from "@/lib/i18n/dictionary";
import { apiFetch } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { AiReviewDTO } from "@/lib/services/ai-review";

interface AiReviewPanelProps {
  ticketId: string;
}

/**
 * Read-only AI content review (admin/team). Clicking asks the backend to send
 * the ticket content + questions to Gemini and returns suggestions that the
 * team may choose to apply manually - nothing is ever modified automatically.
 * Errors degrade to a maintenance toast; no page-level impact.
 */
export function AiReviewPanel({ ticketId }: AiReviewPanelProps) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<AiReviewDTO | null>(null);

  async function analyze() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await apiFetch<{ review: AiReviewDTO }>(`/api/tickets/${ticketId}/ai-review`, {
        method: "POST",
        json: {},
      });
      setReview(result.review);
      toast.success(t("ai.ready"));
    } catch (err) {
      // Maintenance / rate limits: calm toast only, the page keeps working.
      toast.error(explainApi(err, t, "ai.maintenance"));
      setReview(null);
    } finally {
      setBusy(false);
    }
  }

  const scoreTint =
    review === null ? "" : review.score >= 70 ? "text-done" : review.score >= 40 ? "text-review" : "text-danger";

  return (
    <section
      className="rounded-xl border border-dashed border-border bg-surface px-3 py-3"
      data-testid="ai-review-panel"
      aria-label={t("ai.title")}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 className="flex items-center gap-1.5 text-[13px] font-medium">
          <Sparkles size={13} className="text-primary" />
          {t("ai.title")}
        </h3>
        {review && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("ai.dismiss")}
            className="h-6 w-6 text-muted hover:text-foreground"
            onClick={() => setReview(null)}
          >
            <X size={12} />
          </Button>
        )}
      </div>

      {review === null ? (
        <>
          <p className="mb-2 px-1 text-[11px] text-muted">
            {t("ai.hint")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => void analyze()}
            disabled={busy}
            data-testid="ai-review-button"
          >
            {busy ? <LoaderCircle size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {busy ? t("ai.analyzing") : t("ai.analyze")}
          </Button>
        </>
      ) : (
        <div className="mt-1.5 flex flex-col gap-2" data-testid="ai-review-result">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted">{t("ai.score")}</span>
            <span className={cn("text-[17px] font-semibold", scoreTint)} data-testid="ai-review-score">
              {review.score}/100
            </span>
          </div>
          <p className="rounded-md bg-surface-2 px-2.5 py-1.5 text-[12px] leading-5 text-foreground/90">
            {review.summary}
          </p>
          <ul className="flex flex-col gap-2">
            {review.suggestions.map((s, i) => (
              <li key={i} className="rounded-lg border border-border px-2.5 py-2" data-testid="ai-suggestion">
                <p className="text-[10.5px] font-medium uppercase tracking-wide text-primary">
                  {s.target}
                </p>
                <p className="mt-0.5 text-[12px] text-muted">{s.issue}</p>
                <p className="mt-1 text-[12px] text-foreground/90">
                  <span className="font-medium">{t("ai.suggestion")}{" "}</span>
                  {s.suggestion}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-[10.5px] text-muted">
            {t("ai.readonlyNote")}
          </p>
        </div>
      )}
    </section>
  );
}
