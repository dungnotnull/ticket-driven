"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AtSign,
  Bell,
  CheckCheck,
  Eye,
  ArrowRightLeft,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Menu, MenuContent, MenuTrigger } from "@/components/ui/dropdown-menu";
import { apiFetch, ApiClientError } from "@/lib/fetcher";
import { explainApi } from "@/lib/i18n/dictionary";
import { useLang } from "@/lib/i18n";
import { COLUMN_LABELS } from "@/lib/types";
import { pushPendingTicket } from "@/lib/pending-ticket";
import type { NotificationDTO } from "@/lib/types";
import type { SessionUser } from "@/lib/auth";
import { cn, timeAgo } from "@/lib/utils";

/** Poll cadence for the unread badge (light "realtime" for serverless). */
const POLL_MS = 20_000;

function NotifIcon({ type }: { type: NotificationDTO["type"] }) {
  const cls = "mt-0.5 size-3.5 shrink-0 text-primary";
  switch (type) {
    case "mention":
      return <AtSign size={14} className={cls} />;
    case "comment":
      return <MessageSquare size={14} className={cls} />;
    case "status_change":
      return <ArrowRightLeft size={14} className={cls} />;
    case "assignment":
      return <UserPlus size={14} className={cls} />;
    case "feedback_approved":
      return <ThumbsUp size={14} className={cls} />;
    case "feedback_changes":
      return <ThumbsDown size={14} className={cls} />;
    case "feedback_requested":
      return <Eye size={14} className={cls} />;
    default:
      return <Bell size={14} className={cls} />;
  }
}

/**
 * Round-34 bell (next to the avatar, Facebook-style). Global admins render
 * NOTHING - they opted out of notifications entirely.
 * Realtime = lightweight visibility-aware polling of a tiny projection
 * (serverless platform friendly; no websockets needed).
 */
export function NotificationsBell({ user }: { user: SessionUser }) {
  const router = useRouter();
  const { t } = useLang();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const [open, setOpen] = useState(false);

  const refreshBadge = useCallback(async () => {
    try {
      const res = await apiFetch<{ unread: number }>("/api/notifications/unread-count");
      setUnread(res.unread);
    } catch {
      // Badge silently keeps the last value; never nags the user.
    }
  }, []);

  const refreshList = useCallback(
    async (which: "unread" | "all") => {
      try {
        const res = await apiFetch<{ items: NotificationDTO[]; unread: number }>(
          `/api/notifications?tab=${which}&limit=30`,
        );
        setItems(res.items);
        setUnread(res.unread);
      } catch (err) {
        if (err instanceof ApiClientError) toast.error(explainApi(err, t, "notif.empty"));
      }
    },
    [t],
  );

  // Initial badge + visibility-aware poll (pause in hidden tabs = cheap).
  // The kickoff goes through setTimeout so no setState is called synchronously
  // inside the effect body (react-compiler rule). Window focus also triggers
  // an immediate catch-up so switching back to the tab feels realtime.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      if (document.visibilityState === "visible") void refreshBadge();
    };
    const kickoff = setTimeout(tick, 0);
    timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearTimeout(kickoff);
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [refreshBadge]);

  // Open/switching tabs pull the fresh list (event-driven, lint-safe).
  function handlePanelChange(next: boolean) {
    setOpen(next);
    if (next) void refreshList(tab);
  }

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refreshList(tab);
    }, POLL_MS);
    const onFocus = () => {
      if (document.visibilityState === "visible") void refreshList(tab);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [open, tab, refreshList]);

  async function markSeen(id: string, seen: boolean) {
    try {
      const res = await apiFetch<{ unread: number }>("/api/notifications", {
        method: "POST",
        json: { action: "seen", id, seen },
      });
      setUnread(res.unread);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, seen } : n)));
    } catch {
      toast.error(t("notif.markRead"));
    }
  }

  async function markAll() {
    try {
      await apiFetch("/api/notifications", { method: "POST", json: { action: "seen-all" } });
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, seen: true })));
      toast.success(t("notif.markAll"));
    } catch {
      toast.error(t("notif.markRead"));
    }
  }

  /** Facebook-style: click = mark seen + navigate (deep-link opens the
   *  ticket). Round-34b: the ticket is ALSO dropped into the pending store,
   *  so an already-open board opens the modal instantly (router pushes to
   *  the same URL are deduped - the store event is not). */
  function go(n: NotificationDTO) {
    if (!n.seen) void markSeen(n.id, true);
    setOpen(false);
    const target = n.ticket
      ? `/projects/${n.project.id}?ticket=${n.ticket.id}`
      : `/projects/${n.project.id}`;
    if (n.ticket) pushPendingTicket(n.project.id, n.ticket.id);
    router.push(target);
  }

  function sentence(n: NotificationDTO): string {
    const params = {
      actor: n.actor.name || "A member",
      ticket: n.ticket?.title || n.project.name,
      column: n.statusTo
        ? (COLUMN_LABELS as Record<string, string>)[n.statusTo] ?? n.statusTo
        : "",
    };
    return t(`notif.${n.type}` as never, params as never);
  }

  if (user.globalRole === "admin") return null; // requirement: admins skip notifications

  return (
    <Menu open={open} onOpenChange={handlePanelChange}>
      <MenuTrigger
        className="relative flex size-8 items-center justify-center rounded-full outline-none transition-colors hover:bg-surface-2"
        aria-label={t("notif.title")}
        data-testid="notifications-bell"
      >
        <Bell size={16} className="text-muted" />
        {unread > 0 && (
          <span
            data-testid="notifications-badge"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </MenuTrigger>
      <MenuContent align="end" className="w-[min(92vw,384px)] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <span className="text-[13px] font-semibold">{t("notif.title")}</span>
          <button
            type="button"
            onClick={() => void markAll()}
            data-testid="notifications-mark-all"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <CheckCheck size={12} />
            {t("notif.markAll")}
          </button>
        </div>

        <div className="flex gap-1 border-b border-border px-3 py-1.5">
          {(["unread", "all"] as const).map((which) => (
            <button
              key={which}
              type="button"
              onClick={() => {
                setTab(which);
                if (open) void refreshList(which); // event-driven pull
              }}
              data-testid={`notifications-tab-${which}`}
              className={cn(
                "press rounded-md px-2.5 py-1 text-[12px] transition-colors",
                tab === which
                  ? "bg-surface-2 font-medium text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {which === "unread" ? t("notif.unread") : t("notif.all")}
            </button>
          ))}
        </div>

        <div
          className="max-h-[52vh] overflow-y-auto p-1.5 scroll-thin-xs"
          data-testid="notifications-list"
        >
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-[12.5px] text-muted">{t("notif.empty")}</p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                data-testid="notification-item"
                className={cn(
                  "group flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2/70",
                  !n.seen && "bg-primary/5",
                )}
                onClick={() => go(n)}
              >
                {!n.seen && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                <NotifIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[12.5px] leading-snug", !n.seen && "font-medium")}>
                    {sentence(n)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {n.project.name} · {timeAgo(n.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={n.seen ? t("notif.markUnread") : t("notif.markRead")}
                  className="shrink-0 rounded p-1 text-muted opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 max-md:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    void markSeen(n.id, !n.seen);
                  }}
                >
                  {n.seen ? <Bell size={12} /> : <X size={12} />}
                </button>
              </div>
            ))
          )}
        </div>
      </MenuContent>
    </Menu>
  );
}
