"use client";

import { useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Eye,
  LoaderCircle,
  MessageSquareWarning,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text";
import { useLang } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n/dictionary";
import { apiFetch } from "@/lib/fetcher";
import { cn, timeAgo } from "@/lib/utils";
import type { ReviewStatus, TicketDTO } from "@/lib/types";

const OPTIONS: Array<{
  value: ReviewStatus;
  labelKey: DictKey;
  hintKey: DictKey;
  icon: React.ReactNode;
  tint: string;
  activeTint: string;
}> = [
  {
    value: "approved",
    labelKey: "review.approved",
    hintKey: "review.approveHint",
    icon: <CheckCircle2 size={15} />,
    tint: "text-done",
    activeTint: "border-done/50 bg-done/10",
  },
  {
    value: "under_review",
    labelKey: "review.under_review",
    hintKey: "review.underReviewHint",
    icon: <Eye size={15} />,
    tint: "text-progress",
    activeTint: "border-progress/50 bg-progress/10",
  },
  {
    value: "changes_requested",
    labelKey: "review.changes_requested",
    hintKey: "review.changesHint",
    icon: <CircleAlert size={15} />,
    tint: "text-danger",
    activeTint: "border-danger/50 bg-danger/10",
  },
];

interface ReviewPanelProps {
  ticket: TicketDTO;
  myRole: "admin" | "team" | "client";
  memberName: (id: string | null) => string | null;
  onUpdated: (ticket: TicketDTO) => void;
}

/** Client review action center; team/admins see a read-only status card. */
export function ReviewPanel({ ticket, myRole, memberName, onUpdated }: ReviewPanelProps) {
  const { t } = useLang();
  const [selected, setSelected] = useState<ReviewStatus>("under_review");
  const [note, setNote] = useState("");
  const [noteNonce, setNoteNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const isClient = myRole === "client";

  async function submit() {
    if (!isClient) return;
    const trimmedNote = note.trim();
    if (selected === "changes_requested" && trimmedNote.length === 0) {
      toast.error(t("review.noteRequiredToast"));
      return;
    }
    setBusy(true);
    try {
      const result = await apiFetch<{ ticket: TicketDTO }>(
        `/api/tickets/${ticket.id}/review`,
        { method: "POST", json: { review: selected, note: trimmedNote } },
      );
      onUpdated(result.ticket);
      // Clear the rich editor via remount (Tiptap owns its own doc state).
      setNoteNonce((n) => n + 1);
      setNote("");
      toast.success(
        selected === "approved"
          ? t("review.approvedToast")
          : selected === "changes_requested"
            ? t("review.changesToast")
            : t("review.underReviewToast"),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("review.fail"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-2/60 p-3" data-testid="review-panel">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[13px] font-medium">
          <MessageSquareWarning size={14} className="text-review" />
          {t("review.title")}
        </h3>
        {ticket.review.status && (
          <Badge
            variant={
              ticket.review.status === "approved"
                ? "success"
                : ticket.review.status === "under_review"
                  ? "progress"
                  : "danger"
            }
          >
            {ticket.review.status === "approved"
              ? t("review.approved")
              : ticket.review.status === "under_review"
                ? t("review.under_review")
                : t("review.changes_requested")}
          </Badge>
        )}
      </div>

      {ticket.review.status && !isClient && ticket.review.reviewedAt && (
        <div className="mb-2 flex items-center gap-1.5 text-[12px] text-muted">
          <Avatar
            name={memberName(ticket.review.reviewedById) ?? "Client"}
            size="sm"
          />
          {t("review.reviewedBy")} {memberName(ticket.review.reviewedById) ?? t("review.aClient")} ·{" "}
          {timeAgo(ticket.review.reviewedAt)}
        </div>
      )}

      {isClient ? (
        <div className="flex flex-col gap-2.5">
          <div className="grid gap-1.5" role="radiogroup" aria-label={t("review.decisionLabel")}>
            {OPTIONS.map((option) => {
              const active = selected === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={busy}
                  onClick={() => setSelected(option.value)}
                  data-testid={`review-option-${option.value}`}
                  className={cn(
                    "flex items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-colors outline-none focus-visible:border-primary",
                    active ? option.activeTint : "border-border hover:border-border-strong",
                  )}
                >
                  <span className={cn("mt-0.5", option.tint)}>{option.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium">{t(option.labelKey)}</span>
                    <span className="block text-[11.5px] text-muted">{t(option.hintKey)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Rich client feedback note (Tiptap): formatting + images (only
              images upload; the cloud-storage safety gate applies). The
              contenteditable keeps the `review-note` testid for QA. */}
          <RichTextEditor
            key={noteNonce}
            value={note}
            onChange={(html) => {
              setNote(html);
            }}
            placeholder={
              selected === "changes_requested"
                ? t("review.noteRequiredPh")
                : t("review.noteOptionalPh")
            }
            testid="review-note"
            minHeight="150px"
          />

          <Button
            onClick={() => {
              void submit();
            }}
            disabled={busy}
            size="sm"
            data-testid="review-submit"
          >
            {busy && <LoaderCircle size={13} className="animate-spin" />}
            {selected === "approved"
              ? t("review.submitApprove")
              : selected === "changes_requested"
                ? t("review.requestChanges")
                : t("review.submitUnderReview")}
          </Button>
        </div>
      ) : (
        <p className="text-[12px] text-muted">
          {ticket.review.status
            ? t("review.recordedNote")
            : t("review.awaitingNote")}
        </p>
      )}
    </div>
  );
}
