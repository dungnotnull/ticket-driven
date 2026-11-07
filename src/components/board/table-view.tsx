"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Files, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLang } from "@/lib/i18n";
import {
  COLUMN_LABELS,
  PRIORITY_LABELS,
  type ColumnKey,
  type Priority,
  type TicketDTO,
} from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const STATUS_BADGE: Record<ColumnKey, "default" | "progress" | "warning" | "success"> = {
  todo: "default",
  in_progress: "progress",
  in_review: "warning",
  done: "success",
};

const PRIORITY_BADGE: Record<Priority, "default" | "progress" | "warning" | "danger"> = {
  low: "default",
  medium: "progress",
  high: "warning",
  urgent: "danger",
};

type SortKey = "title" | "status" | "priority" | "assignee" | "updatedAt";

interface TableViewProps {
  tickets: TicketDTO[];
  memberById: Map<string, { name: string; email: string; role: string }>;
  canWrite: boolean;
  onOpen: (id: string) => void;
}

export function TableView({ tickets, memberById, canWrite, onOpen }: TableViewProps) {
  void canWrite;
  const { t } = useLang();
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [assignee, setAssignee] = useState<string>("all");

  const assigneeOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const ticket of tickets) if (ticket.assigneeId) ids.add(ticket.assigneeId);
    return Array.from(ids)
      .map((id) => ({ id, name: memberById.get(id)?.name ?? t("board.unknownUser") }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tickets, memberById, t]);

  const rows = useMemo(() => {
    const list =
      assignee === "all"
        ? tickets
        : assignee === "unassigned"
          ? tickets.filter((t) => !t.assigneeId)
          : tickets.filter((t) => t.assigneeId === assignee);
    const factor = sortDir === "asc" ? 1 : -1;
    const value = (ticket: TicketDTO): string | number => {
      switch (sortKey) {
        case "title":
          return ticket.title.toLowerCase();
        case "status":
          return ticket.status;
        case "priority": {
          const order: Record<Priority, number> = { low: 0, medium: 1, high: 2, urgent: 3 };
          return order[ticket.priority];
        }
        case "assignee":
          return ticket.assigneeId ? (memberById.get(ticket.assigneeId)?.name ?? "").toLowerCase() : "";
        case "updatedAt":
          return new Date(ticket.updatedAt).getTime();
      }
    };
    return [...list].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av === bv) return a.title.localeCompare(b.title);
      return av > bv ? factor : -factor;
    });
  }, [tickets, assignee, sortKey, sortDir, memberById]);

  function header(key: SortKey, label: ReactNode) {
    const active = sortKey === key;
    return (
      <th key={key} className="whitespace-nowrap px-4 py-2 text-left align-middle">
        <button
          type="button"
          onClick={() => {
            if (active) {
              setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            } else {
              setSortKey(key);
              setSortDir("asc");
            }
          }}
          className={cn(
            "flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide transition-colors hover:text-foreground",
            active ? "text-foreground" : "text-muted",
          )}
        >
          {label}
          {active &&
            (sortDir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
        </button>
      </th>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="table-view">
      <div className="flex items-center gap-2">
        <User size={14} className="text-muted" />
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="w-48" aria-label={t("board.filterAssignee")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("board.allAssignees")}</SelectItem>
            <SelectItem value="unassigned">{t("ticket.unassigned")}</SelectItem>
            {assigneeOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[12px] text-muted">{t("board.ticketCount", { n: rows.length })}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[720px] table-fixed border-collapse">
          <thead className="border-b border-border bg-surface-2/50">
            <tr>
              {header("title", t("table.title"))}
              {header("status", t("table.status"))}
              {header("priority", t("table.priority"))}
              {header("assignee", t("table.assignee"))}
              {header("updatedAt", t("table.updated"))}
            </tr>
          </thead>
          <tbody>
            {rows.map((ticket) => {
              const rowAssignee = ticket.assigneeId
                ? memberById.get(ticket.assigneeId)
                : null;
              return (
                <tr
                  key={ticket.id}
                  onClick={() => onOpen(ticket.id)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onOpen(ticket.id)}
                  data-testid="table-row"
                  className="cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-surface-2/60 focus-visible:bg-surface-2/60 focus-visible:outline-none"
                >
                  <td className="truncate px-4 py-2.5 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="line-clamp-1 text-[13px] font-medium">
                        {ticket.title}
                      </span>
                      {ticket.attachments.length > 0 && (
                        <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-muted">
                          <Files size={11} />
                          {ticket.attachments.length}
                        </span>
                      )}
                      {ticket.dueDate && (
                        <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-muted">
                          <CalendarDays size={11} />
                          {new Date(ticket.dueDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 align-middle">
                    <Badge variant={STATUS_BADGE[ticket.status]}>
                      {COLUMN_LABELS[ticket.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 align-middle">
                    <Badge variant={PRIORITY_BADGE[ticket.priority]}>
                      {PRIORITY_LABELS[ticket.priority]}
                    </Badge>
                  </td>
                  <td className="truncate px-4 py-2.5 align-middle text-[12px] text-muted">
                    {rowAssignee ? (
                      <span className="flex items-center gap-1.5">
                        <Avatar name={rowAssignee.name} email={rowAssignee.email} size="sm" />
                        <span className="truncate">{rowAssignee.name}</span>
                      </span>
                    ) : (
                      <span className="italic">{t("ticket.unassigned")}</span>
                    )}
                  </td>
                  <td
                    suppressHydrationWarning
                    className="whitespace-nowrap px-4 py-2.5 align-middle text-[12px] text-muted"
                  >
                    {timeAgo(ticket.updatedAt)}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-[13px] text-muted"
                >
                  {t("board.noTickets")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
