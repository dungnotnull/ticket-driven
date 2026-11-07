"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text";
import { AttachmentUpload, type UploadDraft } from "./attachment-upload";
import { ActivityTimeline } from "./activity-timeline";
import { AiReviewPanel } from "./ai-review-panel";
import { QuestionsPanel } from "./questions-panel";
import { ReviewPanel } from "./review-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useLang } from "@/lib/i18n";
import { apiFetch } from "@/lib/fetcher";
import { timeAgo } from "@/lib/utils";
import { COLUMN_KEYS, COLUMN_LABELS, PRIORITY_LABELS } from "@/lib/types";
import type {
  ColumnKey,
  Priority,
  ProjectDTO,
  TicketDTO,
  TicketQuestionDTO,
} from "@/lib/types";

interface TicketModalProps {
  mode: "create" | "edit";
  project: ProjectDTO;
  myRole: "admin" | "team" | "client";
  /** Signed-in member id - powers the client-questions panel. */
  myUserId?: string;
  initialStatus?: ColumnKey;
  ticket?: TicketDTO;
  onClose: () => void;
  onCreated?: (ticket: TicketDTO) => void;
  onUpdated?: (ticket: TicketDTO) => void;
  onDeleted?: (id: string) => void;
}

export function TicketModal({
  mode,
  project,
  myRole,
  myUserId,
  initialStatus = "todo",
  ticket,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
}: TicketModalProps) {
  const { t } = useLang();
  const canWrite = myRole === "admin" || myRole === "team";
  const isEdit = mode === "edit" && ticket;

  const memberById = new Map(
    project.members.map((m) => [m.user.id, { name: m.user.name, email: m.user.email, role: m.role }]),
  );

  const [title, setTitle] = useState(ticket?.title ?? "");
  const [description, setDescription] = useState(ticket?.description ?? "");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [status, setStatus] = useState<ColumnKey>(ticket?.status ?? initialStatus);
  const [assigneeId, setAssigneeId] = useState<string | null>(ticket?.assigneeId ?? null);
  const [priority, setPriority] = useState(ticket?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(
    ticket?.dueDate ? new Date(ticket.dueDate).toISOString().slice(0, 10) : "",
  );
  const [drafts, setDrafts] = useState<UploadDraft[]>(
    (ticket?.attachments ?? []).map((a) => ({
      key: a.key,
      url: a.url,
      name: a.name,
      size: a.size,
      contentType: a.contentType,
      status: "done",
    })),
  );
  const [attachmentsDirty, setAttachmentsDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [commentEmpty, setCommentEmpty] = useState(true);
  const [commentNonce, setCommentNonce] = useState(0);
  const [commentBusy, setCommentBusy] = useState(false);
  /** Verification questions authored together with a NEW ticket (create mode). */
  const [draftQuestions, setDraftQuestions] = useState<TicketQuestionDTO[]>([]);
  /** Media keys uploaded inside THIS dialog session (editor images + pending
   * attachments). On close WITHOUT a successful save, the backend keeps any
   * key still referenced elsewhere and deletes only true orphans. */
  const sessionMediaRef = useRef<string[]>([]);

  const readyAttachments = drafts
    .filter((d) => d.status === "done" && d.key)
    .map((d) => ({
      key: d.key,
      url: d.url,
      name: d.name,
      size: d.size,
      contentType: d.contentType,
    }));

  const memberName = (id: string | null) => (id ? memberById.get(id)?.name ?? null : null);

  /** Fire-and-forget garbage collection for never-saved uploads. */
  function cleanupSessionMedia(keys: string[]) {
    const candidates = [...new Set(keys)].filter(Boolean);
    if (candidates.length === 0) return;
    void apiFetch("/api/content/graphics/cleanup", {
      method: "POST",
      json: { projectId: project.id, keys: candidates },
    }).catch(() => undefined);
  }

  function handleClose() {
    cleanupSessionMedia(sessionMediaRef.current);
    onClose();
  }

  /* ---------------------------- actions ---------------------------- */

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) return;
    setError(null);
    if (title.trim().length < 3) {
      setError(t("ticket.titleShort"));
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description,
        status,
        assigneeId,
        priority,
        dueDate: dueDate || null,
      };
      if (isEdit) {
        if (attachmentsDirty) payload.attachments = readyAttachments;
        const res = await apiFetch<{ ticket: TicketDTO }>(`/api/tickets/${ticket!.id}`, {
          method: "PATCH",
          json: payload,
        });
        onUpdated?.(res.ticket);
        toast.success(t("ticket.updated"));
        onClose();
      } else {
        payload.projectId = project.id;
        payload.attachments = readyAttachments;
        // Questions authored in the create-mode side panel ship with the ticket.
        payload.questions = draftQuestions.map((q) => ({
          prompt: q.prompt,
          type: q.type,
          options: q.options,
          textOptionIndexes: q.textOptionIndexes,
          allowMultiple: q.allowMultiple,
          required: q.required,
        }));
        const res = await apiFetch<{ ticket: TicketDTO }>("/api/tickets", {
          method: "POST",
          json: payload,
        });
        onCreated?.(res.ticket);
        toast.success(t("ticket.created"));
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ticket.saveFail"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !ticket) return;
    setBusy(true);
    try {
      await apiFetch(`/api/tickets/${ticket.id}`, { method: "DELETE", json: {} });
      onDeleted?.(ticket.id);
      toast.success(t("ticket.deleted"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("ticket.deleteFail"));
    } finally {
      setBusy(false);
    }
  }

  async function postComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = comment.trim();
    if (!body || !isEdit || commentBusy) return;
    setCommentBusy(true);
    try {
      const res = await apiFetch<{ ticket: TicketDTO }>(`/api/tickets/${ticket!.id}/comments`, {
        method: "POST",
        json: { body },
      });
      onUpdated?.(res.ticket);
      // Empty the editor via remount (Tiptap keeps its own doc state).
      setCommentNonce((n) => n + 1);
      setComment("");
      setCommentEmpty(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("ticket.commentFail"));
    } finally {
      setCommentBusy(false);
    }
  }

  /* ----------------------------- render ----------------------------- */

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        size="2xl"
        className="scrollbar-stable top-[4vh] max-h-[92vh] translate-y-0 md:overflow-hidden"
      >
        <div data-testid="ticket-modal" className="flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2 pr-8">
              <DialogTitle className="truncate">
                {isEdit ? t("ticket.editTitle") : t("ticket.newTitle")}
              </DialogTitle>
              {isEdit && ticket!.review.status && (
                <Badge
                  variant={
                    ticket!.review.status === "approved"
                      ? "success"
                      : ticket!.review.status === "under_review"
                        ? "progress"
                        : "danger"
                  }
                >
                  {ticket!.review.status === "approved"
                    ? t("review.approved")
                    : ticket!.review.status === "under_review"
                      ? t("review.under_review")
                      : t("review.changes_requested")}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Fixed-height grid on desktop: the dialog never grows or shrinks
              when accordions open (100% shift-free), columns scroll inside.
              The row is locked to the container via `grid-rows minmax(0,1fr)`
              - an implicit `auto` row would grow with the tallest column's
              content and push the whole dialog into an outer scroll with a
              blank tail on long-timeline tickets. */}
          <div className="grid gap-0 md:h-[78vh] md:grid-cols-[1.5fr_1fr] md:grid-rows-[minmax(0,1fr)]">
            {/* Left: fields - its own smooth scroll so the right column never shifts it */}
            <form
              onSubmit={handleSave}
              className="scroll-thin-xs flex min-h-0 flex-col gap-3.5 px-5 py-4 pb-6 md:h-full md:overflow-y-auto scrollbar-stable"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ticket-title">{t("ticket.fieldTitle")}</Label>
                <Input
                  id="ticket-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("ticket.fieldTitlePh")}
                  disabled={!canWrite || busy}
                  required
                  data-testid="ticket-title"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ticket-desc">{t("ticket.fieldDesc")}</Label>
                {/* Rich description (Tiptap): formatting + images (images only;
                    storage safety gate applies). `ticket-description` testid
                    rides the contenteditable for QA. */}
                <RichTextEditor
                  value={description}
                  onChange={(html) => setDescription(html)}
                  placeholder={t("ticket.fieldDescPh")}
                  testid="ticket-description"
                  disabled={!canWrite || busy}
                  projectId={project.id}
                  minHeight="150px"
                  onMediaKeyUploaded={(key) => sessionMediaRef.current.push(key)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ticket-status">{t("ticket.fieldColumn")}</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as ColumnKey)}
                    disabled={!canWrite || busy}
                  >
                    <SelectTrigger id="ticket-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {COLUMN_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ticket-assignee">{t("ticket.fieldAssignee")}</Label>
                  <Select
                    value={assigneeId ?? "none"}
                    onValueChange={(value) => setAssigneeId(value === "none" ? null : value)}
                    disabled={!canWrite || busy}
                  >
                    <SelectTrigger id="ticket-assignee">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("ticket.unassigned")}</SelectItem>
                      {project.members.map((member) => (
                        <SelectItem key={member.user.id} value={member.user.id}>
                          {member.user.name} · {member.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ticket-priority">{t("ticket.fieldPriority")}</Label>
                  <Select
                    value={priority}
                    onValueChange={(value) => setPriority(value as Priority)}
                    disabled={!canWrite || busy}
                  >
                    <SelectTrigger id="ticket-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["low", "medium", "high", "urgent"] as const).map((value) => (
                        <SelectItem key={value} value={value}>
                          {PRIORITY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ticket-due">{t("ticket.fieldDue")}</Label>
                  <Input
                    id="ticket-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={!canWrite || busy}
                  />
                </div>
              </div>

              {canWrite && (
                <div className="flex flex-col gap-1.5">
                  <Label>{t("ticket.attachments")}</Label>
                  <AttachmentUpload
                    projectId={project.id}
                    drafts={drafts}
                    disabled={busy}
                    onUploadedKey={(key) => sessionMediaRef.current.push(key)}
                    onChange={(updater) => {
                      setDrafts((prev) => updater(prev));
                      setAttachmentsDirty(true);
                    }}
                  />
                </div>
              )}

              {error && (
                <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted">
                  {isEdit ? `${t("ticket.updatedAgo")} ${timeAgo(ticket!.updatedAt)}` : ""}
                </span>
                <div className="flex items-center gap-2">
                   {isEdit && canWrite && (
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       onClick={() => setConfirmDeleteOpen(true)}
                       disabled={busy}
                       className="text-muted hover:text-danger"
                     >
                       <Trash2 size={13} />
                       {t("ticket.delete")}
                     </Button>
                   )}
                  {canWrite ? (
                    <Button type="submit" size="sm" disabled={busy} data-testid="ticket-save">
                      {busy && <LoaderCircle size={13} className="animate-spin" />}
                      {isEdit ? t("ticket.saveChanges") : t("ticket.createTicket")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </form>

            {/* Right: review + questions + activity - always present, so both
                create and edit forms show the client-questions panel */}
            <aside className="scroll-thin-xs flex min-h-0 min-w-0 flex-col gap-3 border-t border-border bg-surface-2/40 px-4 pt-4 pb-7 md:h-full md:overflow-y-auto md:border-l md:border-t-0 scrollbar-stable">
              {isEdit && (
                <ReviewPanel
                  ticket={ticket!}
                  myRole={myRole}
                  memberName={memberName}
                  onUpdated={onUpdated ?? (() => undefined)}
                />
              )}

              {/* Admin/team only: read-only AI content suggestions (never auto-applied) */}
              {isEdit && canWrite && <AiReviewPanel ticketId={ticket!.id} />}

              <QuestionsPanel
                ticketId={ticket?.id}
                questions={isEdit ? ticket!.questions ?? [] : draftQuestions}
                canWrite={canWrite}
                myUserId={myUserId ?? ""}
                memberName={memberName}
                persistence={isEdit ? "ticket" : "draft"}
                onTicketUpdated={onUpdated ?? (() => undefined)}
                onDraftChange={setDraftQuestions}
                defaultQuestions={project.defaultQuestions}
              />

              {isEdit && (
                <div className="flex min-h-0 flex-1 flex-col">
                  <h3 className="mb-1 px-1 text-[13px] font-medium">{t("ticket.activity")}</h3>
                  <div className="max-h-[46vh] min-h-40 overflow-y-auto pb-1 scroll-thin-xs">
                    <ActivityTimeline
                      activity={ticket!.activity}
                      memberById={memberById}
                    />
                  </div>

                  <form onSubmit={postComment} className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                    {/* Rich comment/reply editor (Tiptap): formatting + image
                        paste/upload (images only). contenteditable keeps the
                        `comment-input` testid so QA keeps working. */}
                <RichTextEditor
                  key={commentNonce}
                  value={comment}
                  onChange={(html, isEmpty) => {
                    setComment(html);
                    setCommentEmpty(isEmpty);
                  }}
                  placeholder={t("ticket.commentPh")}
                  testid="comment-input"
                  projectId={project.id}
                  minHeight="150px"
                  onMediaKeyUploaded={(key) => sessionMediaRef.current.push(key)}
                />
                    <div className="flex justify-end">
                      <Button type="submit" aria-label={t("ticket.send")} disabled={commentEmpty || commentBusy}>
                        {commentBusy ? (
                          <LoaderCircle size={13} className="animate-spin" />
                        ) : (
                          t("ticket.send")
                        )}
                      </Button>
                    </div>
                  </form>
                  {/* Bottom breathing space inside the scrollable column */}
                  <div aria-hidden className="h-6 shrink-0" />
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* Branded destructive-action confirmation (no window.confirm) */}
        <ConfirmDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title={`${t("ticket.deleteConfirm")} "${ticket?.title ?? ""}"${t("ticket.deleteQuote")}`}
          confirmLabel={t("confirm.delete")}
          cancelLabel={t("home.cancel")}
          busy={busy}
          onConfirm={() => {
            setConfirmDeleteOpen(false);
            void handleDelete();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
