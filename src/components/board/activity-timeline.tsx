"use client";

import { useState } from "react";
import {
  CircleAlert,
  CheckCircle2,
  Heart,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { looksLikeHtml } from "@/components/ui/rich-text";
import { RichNote } from "@/components/ui/rich-note";
import { apiFetch } from "@/lib/fetcher";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n/dictionary";
import { cn, initials, timeAgo } from "@/lib/utils";
import type { ActivityDTO, ActivityType, ColumnKey } from "@/lib/types";

type Translate = (key: DictKey, vars?: Record<string, string | number>) => string;

const TYPE_ICON: Record<ActivityType, { icon: React.ReactNode; tint: string }> = {
  created: { icon: <Plus size={12} />, tint: "text-progress" },
  edited: { icon: <Pencil size={12} />, tint: "text-muted" },
  moved: { icon: <ArrowRight size={12} />, tint: "text-primary" },
  comment: { icon: <MessageSquare size={12} />, tint: "text-muted" },
  attachment: { icon: <Paperclip size={12} />, tint: "text-progress" },
  review: { icon: <CheckCircle2 size={12} />, tint: "text-review" },
  deleted: { icon: <CircleAlert size={12} />, tint: "text-danger" },
};

interface ActivityTimelineProps {
  activity: ActivityDTO[];
  memberById: Map<string, { name: string; email: string; role: string }>;
  /** Round-35: ticket id used by the heart-toggle API. */
  ticketId: string;
  /** Round-35: current viewer id - decides the "mine" highlight. */
  myUserId?: string | null;
}

/** GitHub-style chronological activity feed, newest first. */
export function ActivityTimeline({
  activity,
  memberById,
  ticketId,
  myUserId,
}: ActivityTimelineProps) {
  const { t } = useLang();
  const memberNames = [...memberById.values()].map((m) => m.name);
  const sorted = [...activity].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-[12px] text-muted">
        {t("act.empty")}
      </p>
    );
  }

  return (
    <ol className="flex flex-col" data-testid="activity-timeline">
      {sorted.map((entry) => {
        const meta = TYPE_ICON[entry.type] ?? TYPE_ICON.edited;
        const member = entry.actorId ? (memberById.get(entry.actorId) ?? null) : null;
        const displayName = member?.name ?? entry.actorName ?? t("act.someone");
        return (
          <li key={entry.id}>
            {renderEntry(entry, meta, displayName, member, t, memberNames, ticketId, myUserId)}
          </li>
        );
      })}
    </ol>
  );
}

/** Sentence-style notes ("changed priority: …") carry the whole action. */
function noteIsSentence(entry: ActivityDTO): boolean {
  return (
    (entry.type === "edited" || entry.type === "attachment") &&
    typeof entry.note === "string" &&
    /^[a-z]/.test(entry.note)
  );
}

/** Round-35: replies (comments) and feedback notes accept hearts. */
function entryHeartable(entry: ActivityDTO): boolean {
  return (
    entry.type === "comment" ||
    (entry.type === "review" && (entry.note ?? "").trim() !== "")
  );
}

function renderEntry(
  entry: ActivityDTO,
  meta: { icon: React.ReactNode; tint: string },
  displayName: string,
  member: { name: string; email: string; role: string } | null,
  t: Translate,
  memberNames: string[],
  ticketId: string,
  myUserId?: string | null,
) {
  const sentence = noteIsSentence(entry);
  const action = sentence
    ? entry.note!.charAt(0).toUpperCase() + entry.note!.slice(1)
    : describe(entry, t);
  return (
    <div className="flex gap-3 border-b border-border/60 px-1 py-3 last:border-b-0">
      <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
        {member ? (
          <Avatar name={member.name} email={member.email} size="sm" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-[9px] text-muted ring-1 ring-inset ring-border">
            {initials(displayName)}
          </span>
        )}
        <span className={cn("flex h-4 w-4 items-center justify-center", meta.tint)}>
          {meta.icon}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] leading-5">
          <span className="font-medium">{displayName}</span>{" "}
          <span className="text-muted">{action}</span>
          <span className="ml-1.5 whitespace-nowrap text-[11px] text-muted/80">
            {timeAgo(entry.createdAt)}
          </span>
        </p>

        {entry.note && entry.type !== "comment" && !sentence && (
          looksLikeHtml(entry.note) ? (
            <RichNote html={entry.note} className="mt-1" memberNames={memberNames} />
          ) : (
            <p className="mt-1 text-[12.5px] text-foreground/85">{entry.note}</p>
          )
        )}
        {entry.type === "comment" && (
          <blockquote className="mt-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5">
            {looksLikeHtml(entry.note ?? "") ? (
              <RichNote html={entry.note ?? ""} memberNames={memberNames} />
            ) : (
              <span className="text-[12.5px] text-foreground/90">{entry.note}</span>
            )}
          </blockquote>
        )}
        {entryHeartable(entry) && (
          <HeartButton
            ticketId={ticketId}
            entryId={entry.id}
            initialCount={(entry.hearts ?? []).length}
            initialMine={Boolean(
              myUserId && (entry.hearts ?? []).includes(myUserId),
            )}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

interface HeartButtonProps {
  ticketId: string;
  entryId: string;
  initialCount: number;
  initialMine: boolean;
  t: Translate;
}

/**
 * Facebook-style heart: every project member may heart a reply/feedback once;
 * clicking again removes their own heart. Optimistic UI, server count wins.
 */
function HeartButton({
  ticketId,
  entryId,
  initialCount,
  initialMine,
  t,
}: HeartButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [mine, setMine] = useState(initialMine);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const nextMine = !mine;
    setMine(nextMine);
    setCount((c) => Math.max(0, c + (nextMine ? 1 : -1)));
    try {
      const res = await apiFetch<{ hearts: number; heartedByMe: boolean }>(
        `/api/tickets/${ticketId}/hearts`,
        { method: "POST", json: { activityId: entryId } },
      );
      setCount(res.hearts);
      setMine(res.heartedByMe);
    } catch {
      // Revert the optimistic flip on any failure.
      setMine(!nextMine);
      setCount((c) => Math.max(0, c + (nextMine ? -1 : 1)));
      toast.error(nextMine ? t("heart.failAdd") : t("heart.failRemove"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1.5 flex items-center gap-1">
      <button
        type="button"
        data-testid="heart-button"
        data-mine={mine ? "true" : "false"}
        disabled={busy}
        onClick={toggle}
        aria-label={mine ? t("heart.remove") : t("heart.add")}
        aria-pressed={mine}
        title={mine ? t("heart.remove") : t("heart.add")}
        className={cn(
          "press flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] transition-colors",
          mine
            ? "bg-danger/10 text-danger"
            : "text-muted hover:bg-surface-2 hover:text-danger",
        )}
      >
        <Heart size={13} className={mine ? "fill-danger" : undefined} />
        {count > 0 && <span data-testid="heart-count">{count}</span>}
      </button>
    </div>
  );
}

function describe(entry: ActivityDTO, t: Translate): string {
  const column: Partial<Record<ColumnKey, string>> = {
    todo: "To Do",
    in_progress: "In Progress",
    in_review: "In Review",
    done: "Done",
  };
  switch (entry.type) {
    case "created":
      return t("act.created");
    case "edited":
      return entry.note ? t("act.edited") : t("act.updatedDetails");
    case "moved": {
      const from = entry.from ? ` ${column[entry.from] ?? entry.from}` : "";
      const to = entry.to ? ` ${column[entry.to] ?? entry.to}` : "";
      if (from && to) return `${t("act.movedFrom")}${from} ${t("act.movedTo")}${to}`;
      if (from) return `${t("act.movedFrom")}${from}`;
      if (to) return `${t("act.movedTicketTo")}${to}`;
      return t("act.movedTicket");
    }
    case "attachment":
      return t("act.uploadedFull", { name: entry.attachmentName });
    case "comment":
      return t("act.commented");
    case "review":
      switch (entry.review) {
        case "approved":
          return t("act.approved");
        case "under_review":
          return t("act.underReview");
        case "changes_requested":
          return t("act.changesRequested");
        default:
          return t("act.submittedReview");
      }
    default:
      return t("act.updatedTicket");
  }
}
