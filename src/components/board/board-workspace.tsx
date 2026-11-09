"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { debounce } from "lodash";
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Files,
  FilterX,
  Image as ImageIcon,
  LayoutGrid,
  LoaderCircle,
  Plus,
  Search,
  SquarePen,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableView } from "@/components/board/table-view";
import { TicketModal } from "@/components/board/ticket-modal";
import { MembersDialog } from "@/components/board/members-dialog";
import { BackgroundDialog } from "@/components/board/background-dialog";
import { ProjectEditDialog } from "@/components/board/project-edit-dialog";
import { useLang } from "@/lib/i18n";
import { explainApi } from "@/lib/i18n/dictionary";
import type { DictKey } from "@/lib/i18n/dictionary";
import { apiFetch } from "@/lib/fetcher";
import { cn, timeAgo } from "@/lib/utils";
import { consumePendingTicket, usePendingTicket } from "@/lib/pending-ticket";
import { stripRichHtml } from "@/lib/sanitize";
import {
  COLUMN_KEYS,
  COLUMN_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  type ColumnKey,
  type Priority,
  type ProjectDTO,
  type TicketDTO,
} from "@/lib/types";

const COLUMN_COLORS: Record<ColumnKey, string> = {
  todo: "bg-todo",
  in_progress: "bg-progress",
  in_review: "bg-review",
  done: "bg-done",
};

const REVIEW_BADGES: Record<string, "success" | "progress" | "danger"> = {
  approved: "success",
  under_review: "progress",
  changes_requested: "danger",
};

const REVIEW_LABELS: Record<string, DictKey> = {
  approved: "review.approved",
  under_review: "review.under_review",
  changes_requested: "review.changes_requested",
};

/* ------------------------- view mode external store ------------------------- */

const viewListeners = new Set<() => void>();

function emitViewChange() {
  for (const listener of viewListeners) listener();
}

function subscribeToView(listener: () => void): () => void {
  viewListeners.add(listener);
  window.addEventListener("storage", emitViewChange);
  return () => {
    viewListeners.delete(listener);
    window.removeEventListener("storage", emitViewChange);
  };
}

function readView(): "board" | "list" {
  try {
    return window.localStorage.getItem("orcaboard-view") === "list" ? "list" : "board";
  } catch {
    return "board";
  }
}

/* ------------------------- hydration gate ------------------------- */

const noopUnsubscribe = () => undefined;

function emptySubscribe(): () => void {
  return noopUnsubscribe;
}

/** Column placeholders shown until the dnd tree is safely hydrated. */
function BoardSkeleton() {
  return (
    <div
      className="grid grid-flow-col auto-cols-[300px] gap-4 overflow-hidden pb-6"
      aria-hidden="true"
    >
      {["To Do", "In Progress", "In Review", "Done"].map((label, columnIndex) => (
        <div
          key={label}
          className="flex min-h-72 flex-col gap-2 rounded-lg border border-border bg-surface p-2"
        >
          <div className="flex items-center gap-2 border-b border-border px-1 py-2">
            <span className="h-2 w-2 rounded-full bg-muted/40" />
            <span className="h-3.5 w-16 animate-pulse rounded bg-surface-2" />
          </div>
          {Array.from({ length: columnIndex === 0 ? 2 : 1 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-md border border-border bg-surface-2"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface BoardWorkspaceProps {
  project: ProjectDTO;
  tickets: TicketDTO[];
  myRole: "admin" | "team" | "client";
  myUserId: string;
  /** Round-34 deep link: /projects/x?ticket=<id> opens the modal directly
   *  (notification clicks land here). */
  initialTicketId?: string | null;
}

export function BoardWorkspace({
  project,
  tickets: initialTickets,
  myRole,
  myUserId,
  initialTicketId = null,
}: BoardWorkspaceProps) {
  const router = useRouter();
  const { t } = useLang();
  const canWrite = myRole === "admin" || myRole === "team";
  const canManage = myRole === "admin";

  const memberById = useMemo(() => {
    const map = new Map<string, { name: string; email: string; role: string }>();
    for (const member of project.members) {
      map.set(member.user.id, { name: member.user.name, email: member.user.email, role: member.role });
    }
    return map;
  }, [project.members]);

  const [tickets, setTickets] = useState(initialTickets);
  const [activeId, setActiveId] = useState<string | null>(null);
  /* -- round-34 deep link: ?ticket=<id> auto-opens that ticket's modal.
        Validated against the server list in the lazy initializer so the
        modal is simply born open (no setState-in-effect dance). The board
        PAGE also keys this workspace on the id, so a soft navigation that
        only changes the ?ticket= query remounts and re-runs this. -- */
  const deepLinked =
    initialTicketId && initialTickets.some((tk) => tk.id === initialTicketId)
      ? initialTicketId
      : null;
  const [openTicketId, setOpenTicketId] = useState<string | null>(deepLinked);

  /* -- round-34b: bell clicks hand their ticket to the pending store, so the
        modal opens on EVERY ticket-scope notification click - even when this
        board is already open and the router dedupes the navigation. -- */
  const pending = usePendingTicket();
  const pendingHere =
    pending && pending.pid === project.id && tickets.some((tk) => tk.id === pending.tid)
      ? pending.tid
      : null;
  const effectiveOpenId = openTicketId ?? pendingHere;

  // Latch: once the pending ticket opened the modal, pin it to state and
  // clear the store (queued microtask - no synchronous setState in effect).
  useEffect(() => {
    if (!pendingHere) return;
    const tid = pendingHere;
    queueMicrotask(() => {
      consumePendingTicket();
      setOpenTicketId(tid);
    });
  }, [pendingHere]);

  // A deep-linked ticket that no longer exists -> calm toast, no crash.
  useEffect(() => {
    if (initialTicketId && !deepLinked) {
      toast.error(t("board.ticketGone"));
    }
    // Clean the ?ticket= query off once consumed (DOM-only; no state writes).
    if (initialTicketId) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast wording is stable per mount
  }, [initialTicketId, deepLinked]);
  const [createStatus, setCreateStatus] = useState<ColumnKey | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [persisting, setPersisting] = useState(false);

  /* ------ board filters: text search + assignee + priority (UX aid) ------ */
  const [searchVal, setSearchVal] = useState("");
  const [term, setTerm] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState(""); // "" | "none" | userId
  const [priorityFilter, setPriorityFilter] = useState<Priority | "">("");
  const debouncedTerm = useMemo(
    () => debounce((value: string) => setTerm(value.toLowerCase().trim()), 200),
    [],
  );
  useEffect(() => () => debouncedTerm.cancel(), [debouncedTerm]);
  const filterActive = term !== "" || assigneeFilter !== "" || priorityFilter !== "";

  /** Description bodies may be rich HTML - strip tags for text search. */
  const descriptionText = useCallback(
    (html: string) => html.replace(/<[^>]*>/g, " "),
    [],
  );

  const visibleTickets = useMemo(() => {
    if (!filterActive) return tickets;
    return tickets.filter((ticket) => {
      if (priorityFilter && ticket.priority !== priorityFilter) return false;
      // Round-34 multi-assignee: "none" = no assignees; otherwise match ANY.
      if (assigneeFilter === "none" && ticket.assigneeIds.length > 0) return false;
      if (
        assigneeFilter &&
        assigneeFilter !== "none" &&
        !ticket.assigneeIds.includes(assigneeFilter)
      )
        return false;
      if (
        term &&
        !(`${ticket.title}`.toLowerCase().includes(term) ||
          descriptionText(ticket.description).toLowerCase().includes(term))
      )
        return false;
      return true;
    });
  }, [tickets, filterActive, priorityFilter, assigneeFilter, term, descriptionText]);

  // Trello-style board background (curated gallery; admin/team pick it).
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(
    project.backgroundUrl ?? null,
  );
  // Admin/team edit the project's name/description via this dialog.
  const [editOpen, setEditOpen] = useState(false);

  // View preference lives in localStorage, exposed as an external store so
  // React can read it without impure render reads or setState-in-effect.
  const view = useSyncExternalStore(subscribeToView, readView, () => "board" as const);

  // dnd-kit generates its screen-reader ids from a module-level counter, so
  // SSR and client hydration disagree (DndDescribedBy-0 vs -1). Render a
  // skeleton during SSR + the hydration pass, then swap to the live board.
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);

  function setViewAndStore(next: "board" | "list") {
    try {
      window.localStorage.setItem("orcaboard-view", next);
    } catch { /* ignore */ }
    emitViewChange();
  }

  /* ------------------------ optimistic DnD ------------------------ */

  const grouped = useMemo(() => {
    const groups = new Map<ColumnKey, TicketDTO[]>([
      ["todo", []],
      ["in_progress", []],
      ["in_review", []],
      ["done", []],
    ]);
    for (const ticket of tickets) {
      groups.get(ticket.status)?.push(ticket);
    }
    for (const arr of groups.values()) arr.sort((a, b) => a.order - b.order);
    return groups;
  }, [tickets]);

  const visibleGrouped = useMemo(() => {
    const groups = new Map<ColumnKey, TicketDTO[]>([
      ["todo", []],
      ["in_progress", []],
      ["in_review", []],
      ["done", []],
    ]);
    for (const ticket of visibleTickets) {
      groups.get(ticket.status)?.push(ticket);
    }
    for (const arr of groups.values()) arr.sort((a, b) => a.order - b.order);
    return groups;
  }, [visibleTickets]);

  const findTicket = useCallback(
    (id: string | unknown) => tickets.find((t) => t.id === id),
    [tickets],
  );

  const persistMove = useCallback(
    async (updates: Array<{ id: string; status: ColumnKey; order: number }>, snapshot: TicketDTO[]) => {
      if (updates.length === 0) return;
      setPersisting(true);
      try {
        await apiFetch(`/api/tickets/${updates[0].id}/move`, {
          method: "POST",
          json: { updates },
        });
      } catch (error) {
        setTickets(snapshot);
        toast.error(explainApi(error, t, "board.moveFail"));
      } finally {
        setPersisting(false);
      }
    },
    [t],
  );

  /**
   * Order planning works on the FULL per-column lists even while filters hide
   * cards: `anchorId` ("drop before this visible ticket", null = end of the
   * full column) translates the VISIBLE drop position into a REAL order slot,
   * so dragging through a filtered board can never corrupt ordering.
   */
  function buildMovePlan(
    activeTicketId: string,
    target: ColumnKey,
    anchorId: string | null,
  ): { next: TicketDTO[]; updates: Array<{ id: string; status: ColumnKey; order: number }>; snapshot: TicketDTO[] } | null {
    const activeTicket = tickets.find((t) => t.id === activeTicketId);
    if (!activeTicket) return null;
    const source: ColumnKey = activeTicket.status;
    const updateMap = new Map<string, { status: ColumnKey; order: number }>();

    if (source === target) {
      const list = [...(grouped.get(source) ?? [])];
      const from = list.findIndex((t) => t.id === activeTicketId);
      if (from === -1) return null;
      const anchorIndex =
        anchorId === null
          ? list.length - 1
          : list.findIndex((t) => t.id === anchorId);
      if (anchorIndex === -1) return null;
      if (from === anchorIndex) return null;
      const [item] = list.splice(from, 1);
      list.splice(anchorIndex, 0, item);
      list.forEach((t, index) => {
        if (index !== t.order) updateMap.set(t.id, { status: target, order: index });
      });
    } else {
      const item = (grouped.get(source) ?? []).find((t) => t.id === activeTicketId);
      if (!item) return null;
      const destinations = [...(grouped.get(target) ?? [])];
      let insertAt = destinations.length;
      if (anchorId !== null) {
        const anchorIndex = destinations.findIndex((t) => t.id === anchorId);
        if (anchorIndex !== -1) insertAt = anchorIndex;
      }
      destinations.splice(insertAt, 0, item);
      // The moved ticket always needs its status update, even when its order
      // digit coincidentally matches the destination slot.
      updateMap.set(item.id, { status: target, order: insertAt });
      destinations.forEach((t, index) => {
        if (t.id !== item.id && index !== t.order) {
          updateMap.set(t.id, { status: target, order: index });
        }
      });
    }

    if (updateMap.size === 0) return null;
    const patch = new Map(
      Array.from(updateMap, ([id, u]) => [id, { ...u, id }]),
    );
    const next = tickets.map((t) => {
      const u = patch.get(t.id);
      return u ? { ...t, status: u.status, order: u.order } : t;
    });
    const updates = Array.from(patch.values(), ({ id, status, order }) => ({ id, status, order }));
    return { next, updates, snapshot: tickets };
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "ticket") setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeTicket = findTicket(active.id);
    if (!activeTicket) return;
    const activeStatus = activeTicket.status;

    if (over.data.current?.type === "column") {
      const targetStatus = over.data.current.key as ColumnKey;
      if (targetStatus === activeStatus) return;
      // Drop onto the column body = append at the END of the full column.
      const plan = buildMovePlan(activeTicket.id, targetStatus, null);
      if (plan) {
        setTickets(plan.next);
        void persistMove(plan.updates, plan.snapshot);
      }
      return;
    }

    const overTicket = findTicket(over.id);
    if (!overTicket) return;
    // Dropping onto a CARD anchors "before this card" in the visible order;
    // buildMovePlan translates that anchor into the real full-list slot.
    const plan = buildMovePlan(activeTicket.id, overTicket.status, String(over.id));
    if (plan) {
      setTickets(plan.next);
      void persistMove(plan.updates, plan.snapshot);
    }
  }

  /* ------------------------- modal state ------------------------- */

  const activeTicket = effectiveOpenId
    ? tickets.find((t) => t.id === effectiveOpenId) ?? null
    : null;

  function handleUpdated(updated: TicketDTO) {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleCreated(ticket: TicketDTO) {
    setTickets((prev) => [...prev, ticket]);
  }

  function handleDeleted(id: string) {
    setTickets((prev) => prev.filter((t) => t.id !== id));
    setOpenTicketId(null);
  }

  const dragPreview = activeId ? findTicket(activeId) : null;

  return (
    <div
      data-testid="board-root"
      className="relative flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col gap-5 overflow-hidden p-4 sm:p-5"
      style={
        backgroundUrl
          ? {
              backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.72), rgba(255,255,255,0.82) 220px), url("${backgroundUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className={cn("min-w-0", backgroundUrl && "rounded-lg bg-surface/75 px-3 py-1.5 backdrop-blur-sm")}>
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-tight">{project.name}</h1>
            <Badge variant={myRole === "client" ? "primary" : myRole === "admin" ? "danger" : "outline"}>
              {myRole}
            </Badge>
            {canWrite && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditOpen(true)}
                aria-label={t("prj.edit")}
                title={t("prj.edit")}
                data-testid="project-edit-button"
                className="h-6 w-6 text-muted hover:text-foreground"
              >
                <SquarePen size={13} />
              </Button>
            )}
            {persisting && <LoaderCircle size={13} className="animate-spin text-muted" />}
          </div>
          <p className="hidden truncate text-[13px] text-muted sm:block">
            {stripRichHtml(project.description ?? "") || t("home.noDescription")}
          </p>
        </div>

        {/* Controls: full-width wrapping row on mobile (buttons may stack),
            single right-aligned line from sm up. */}
        <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          {/* View switcher */}
          <div className="flex rounded-md border border-border bg-surface p-0.5" role="tablist" aria-label={t("board.viewMode")}>
            <button
              type="button"
              role="tab"
              aria-selected={view === "board"}
              onClick={() => setViewAndStore("board")}
              data-testid="view-board"
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-[12px] font-medium transition-colors",
                view === "board" ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              <LayoutGrid size={13} />
              {t("board.boardView")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "list"}
              onClick={() => setViewAndStore("list")}
              data-testid="view-list"
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-[12px] font-medium transition-colors",
                view === "list" ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              <ClipboardList size={13} />
              {t("board.listView")}
            </button>
          </div>

          {(canManage || canWrite) && (
            <Button variant="secondary" size="sm" onClick={() => setMembersOpen(true)}>
              <Users size={14} />
              {t("board.members")}
            </Button>
          )}
          {canWrite && (
            <Button variant="secondary" size="sm" onClick={() => setBackgroundOpen(true)} data-testid="background-button">
              <ImageIcon size={14} />
              {t("bg.button")}
            </Button>
          )}
          {canWrite && (
            <Button size="sm" onClick={() => setCreateStatus("todo")} data-testid="new-ticket">
              <Plus size={14} />
              {t("board.newTicket")}
            </Button>
          )}
        </div>
      </div>

      <ProgressStrip tickets={tickets} />

      {/* Filters: search + assignee + priority. Works on both board and list
          view; drag ordering stays correct on the full list via anchor
          translation (buildMovePlan). */}
      <div className="flex flex-wrap items-center gap-2" data-testid="board-filterbar">
        <div className="relative w-full sm:w-64">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              debouncedTerm(e.target.value);
            }}
            placeholder={t("filt.search")}
            className="h-9 rounded-xl pl-8.5 shadow-[0_1px_2px_rgba(13,18,38,0.04),0_2px_10px_rgba(37,51,116,0.07)]"
            data-testid="ticket-search"
          />
          {searchVal && (
            <button
              type="button"
              aria-label={t("home.searchClear")}
              onClick={() => {
                setSearchVal("");
                debouncedTerm.cancel();
                setTerm("");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <Select
          value={assigneeFilter || "all"}
          onValueChange={(v) => setAssigneeFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger
            className="h-9 w-[180px] rounded-xl text-[12.5px]"
            data-testid="assignee-filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filt.assigneeAll")}</SelectItem>
            <SelectItem value="none">{t("filt.unassigned")}</SelectItem>
            {project.members.map((m) => (
              <SelectItem key={m.user.id} value={m.user.id}>
                {m.user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter || "all"}
          onValueChange={(v) => setPriorityFilter(v === "all" ? "" : (v as Priority))}
        >
          <SelectTrigger
            className="h-9 w-[160px] rounded-xl text-[12.5px]"
            data-testid="priority-filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filt.priorityAll")}</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchVal("");
              debouncedTerm.cancel();
              setTerm("");
              setAssigneeFilter("");
              setPriorityFilter("");
            }}
            data-testid="filter-reset"
          >
            <FilterX size={13} />
            {t("filt.reset")}
          </Button>
        )}
        <span className="ml-auto text-[12px] text-muted" data-testid="filter-count">
          {filterActive
            ? t("filt.showing", { shown: visibleTickets.length, total: tickets.length })
            : t("board.ticketCount", { n: tickets.length })}
        </span>
      </div>

      {view === "board" ? (
        hydrated ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex gap-4 overflow-x-auto pb-6" data-testid="kanban-board">
            {COLUMN_KEYS.map((key) => (
              <KanbanColumn
                key={key}
                columnKey={key}
                items={visibleGrouped.get(key) ?? []}
                canWrite={canWrite}
                memberById={memberById}
                onOpen={(id) => setOpenTicketId(id)}
                onAdd={() => setCreateStatus(key)}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {dragPreview && (
              <div className="bg-gradient-soft elev-card w-[280px] rotate-1 rounded-xl border border-primary/60 p-3">
                <p className="text-gradient-primary line-clamp-2 text-[13px] font-semibold">
                  {dragPreview.title}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
        ) : (
          <BoardSkeleton />
        )
      ) : (
        <TableView
          tickets={visibleTickets}
          memberById={memberById}
          canWrite={canWrite}
          onOpen={(id) => setOpenTicketId(id)}
        />
      )}

      {createStatus && (
        <TicketModal
          mode="create"
          project={project}
          myRole={myRole}
          myUserId={myUserId}
          initialStatus={createStatus}
          onClose={() => setCreateStatus(null)}
          onCreated={handleCreated}
        />
      )}
      {activeTicket && !createStatus && (
        <TicketModal
          key={activeTicket.id}
          mode="edit"
          project={project}
          myRole={myRole}
          myUserId={myUserId}
          ticket={activeTicket}
          onClose={() => setOpenTicketId(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      <MembersDialog
        key={membersOpen ? "members-open" : "members-closed"}
        project={project}
        open={membersOpen}
        onOpenChange={setMembersOpen}
        canManage={canManage}
        myRole={myRole}
        onChanged={() => router.refresh()}
      />

      <BackgroundDialog
        projectId={project.id}
        current={backgroundUrl}
        open={backgroundOpen}
        onOpenChange={setBackgroundOpen}
        onApplied={(url) => {
          setBackgroundUrl(url);
          router.refresh();
        }}
      />

      <ProjectEditDialog
        key={editOpen ? "edit-open" : "edit-closed"}
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

/* ============================== Column ============================= */

function KanbanColumn({
  columnKey,
  items,
  canWrite,
  memberById,
  onOpen,
  onAdd,
}: {
  columnKey: ColumnKey;
  items: TicketDTO[];
  canWrite: boolean;
  memberById: Map<string, { name: string; email: string; role: string }>;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const { t } = useLang();
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${columnKey}`,
    data: { type: "column", key: columnKey },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[300px] shrink-0 flex-col rounded-2xl border bg-surface-2/60 transition-colors",
        isOver ? "border-primary/60 bg-surface-2 ring-1 ring-primary/30" : "border-border",
      )}
      data-testid={`column-${columnKey}`}
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className={cn("h-2 w-2 rounded-full", COLUMN_COLORS[columnKey])} />
        <h2 className="text-[13px] font-medium">{COLUMN_LABELS[columnKey]}</h2>
        <span className="rounded-full bg-surface-2 px-1.5 text-[11px] text-muted">
          {items.length}
        </span>
        {canWrite && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={t("board.addTicketTo", { column: COLUMN_LABELS[columnKey] })}
            className="ml-auto rounded p-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <Plus size={14} />
          </button>
        )}
      </header>
      <div className="flex max-h-[calc(100dvh-220px)] min-h-[160px] flex-col gap-2 overflow-y-auto p-2">
        <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {items.map((ticket) => (
            <KanbanCard
              key={ticket.id}
              ticket={ticket}
              canWrite={canWrite}
              memberById={memberById}
              onOpen={() => onOpen(ticket.id)}
            />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border p-4 text-[12px] text-muted">
            {t("board.emptyColumn")}
          </div>
        )}
      </div>
    </section>
  );
}

/* =============================== Card ============================== */

function KanbanCard({
  ticket,
  canWrite,
  memberById,
  onOpen,
}: {
  ticket: TicketDTO;
  canWrite: boolean;
  memberById: Map<string, { name: string; email: string; role: string }>;
  onOpen: () => void;
}) {
  const { t } = useLang();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
    data: { type: "ticket", status: ticket.status },
    disabled: !canWrite,
  });

  // Round-34: multi-assignee row - first member chip + a "+N" counter.
  const cardAssignees = (ticket.assigneeIds ?? [])
    .map((id) => memberById.get(id))
    .filter((m): m is { name: string; email: string; role: string } => Boolean(m));
  const overdue = ticket.overdue;

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...(canWrite ? { ...attributes, ...listeners } : {})}
      onClick={onOpen}
      onKeyDown={(event) => {
        // Enter opens the ticket; everything else routes to the dnd-kit
        // keyboard sensor (Space lifts, arrows move, Space drops).
        if (canWrite && event.key === "Enter") {
          onOpen();
          return;
        }
        if (canWrite) listeners?.onKeyDown?.(event);
      }}
      role="button"
      tabIndex={0}
      data-testid="kanban-card"
      className={cn(
        "group cursor-grab rounded-xl border border-border bg-surface px-3 py-2.5 transition-all outline-none hover:border-primary/40 hover:elev-card focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30 aria-disabled:cursor-default",
        canWrite && "active:cursor-grabbing",
        isDragging && "border-primary/60 opacity-40",
      )}
    >
      <p className="line-clamp-2 text-[13px] font-medium leading-5">{ticket.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {ticket.review.status && (
          <Badge variant={REVIEW_BADGES[ticket.review.status] ?? "default"}>
            {t(REVIEW_LABELS[ticket.review.status])}
          </Badge>
        )}
        {ticket.attachments.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-muted">
            <Files size={11} />
            {ticket.attachments.length}
          </span>
        )}
        {ticket.dueDate && (
          <span
            className={cn(
              "flex items-center gap-1 text-[11px]",
              overdue ? "text-danger" : "text-muted",
            )}
          >
            <CalendarDays size={11} />
            {new Date(ticket.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
        {/* suppressHydrationWarning: relative minutes can cross a boundary
            between SSR and hydration (e.g. "3m ago" -> "4m ago"); React just
            re-renders - silence the (benign, rare) mismatch noise. */}
        <span suppressHydrationWarning className="ml-auto text-[10px] text-muted">{timeAgo(ticket.updatedAt)}</span>
      </div>

      {cardAssignees.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          {cardAssignees.slice(0, 2).map((m, i) => (
            <span
              key={m.name + i}
              className={cn("flex items-center gap-1", i > 0 && "-ml-3 rounded-full bg-surface pl-1.5 pr-1 py-0.5")}
            >
              <Avatar name={m.name} email={m.email} size="sm" />
              <span className="truncate text-[11px] text-muted max-w-24">
                {i === 0 ? m.name : ""}
              </span>
            </span>
          ))}
          {cardAssignees.length > 2 && (
            <span
              data-testid="kanban-assignee-more"
              className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              +{cardAssignees.length - 2}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

/* =========================== Progress strip =========================== */

/**
 * "Overview progress" collapsible (default closed to keep the board tidy):
 * the trigger carries a notification-style badge with the completion % (green
 * at 100%). Expanding reveals a compact, max-width-400px panel with the
 * status-segmented bar (colors match the kanban columns) - values derive
 * LIVE from ticket status, so drag moves update the badge instantly.
 */
function ProgressStrip({ tickets }: { tickets: TicketDTO[] }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const total = tickets.length;
  const counts = new Map<ColumnKey, number>(COLUMN_KEYS.map((k) => [k, 0]));
  for (const ticket of tickets) {
    counts.set(ticket.status, (counts.get(ticket.status) ?? 0) + 1);
  }
  const done = counts.get("done") ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <section data-testid="progress-section" className="w-full max-w-[400px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="progress-collapse"
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface/85 px-3 py-2 text-left backdrop-blur-sm transition-colors hover:border-border-strong"
      >
        <ChevronDown
          size={14}
          className={cn("text-muted transition-transform duration-200", open && "rotate-180")}
        />
        <span className="text-[13px] font-medium">{t("prog.title")}</span>
        {total > 0 && (
          <span
            data-testid="progress-percent"
            aria-label={t("prog.donePct", { pct })}
            className={cn(
              "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white shadow-sm",
              "bg-done",
            )}
          >
            {pct}%
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border bg-surface/85 p-3 shadow-sm">
          {total === 0 ? (
            <p className="text-[12.5px] text-muted">{t("prog.empty")}</p>
          ) : (
            <>
              <div
                data-testid="progress-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={t("prog.title")}
                className="flex h-2 overflow-hidden rounded-full bg-surface-2"
              >
                {COLUMN_KEYS.map((key) => {
                  const value = counts.get(key) ?? 0;
                  if (value === 0) return null;
                  return (
                    <div
                      key={key}
                      data-testid={`progress-seg-${key}`}
                      style={{ width: `${(value / total) * 100}%` }}
                      className={cn("h-full", COLUMN_COLORS[key])}
                    />
                  );
                })}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                {COLUMN_KEYS.map((key) => (
                  <span key={key} className="flex items-center gap-1 text-[11px] text-muted">
                    <span className={cn("h-1.5 w-1.5 rounded-full", COLUMN_COLORS[key])} />
                    {COLUMN_LABELS[key]}
                    <span className="font-medium text-foreground">{counts.get(key) ?? 0}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
