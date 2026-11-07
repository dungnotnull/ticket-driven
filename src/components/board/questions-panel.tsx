"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ChevronDown,
  Edit3,
  ListChecks,
  LoaderCircle,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, timeAgo } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { apiFetch } from "@/lib/fetcher";
import type {
  ProjectDefaultQuestionDTO,
  QuestionType,
  TicketDTO,
  TicketQuestionDTO,
} from "@/lib/types";

/** Create-form/edit option row: label + whether selecting it opens a text input. */
type OptionRow = { label: string; withText: boolean };

/** Per-question answer draft (texts keyed by option index). */
type Draft = { indexes: number[]; texts: Record<number, string>; text: string };

interface QuestionsPanelProps {
  /** Saved ticket id - required when persistence is "ticket". */
  ticketId?: string;
  questions: TicketQuestionDTO[];
  canWrite: boolean;
  /** Signed-in member id (own answers, default-open behaviour). */
  myUserId: string;
  memberName: (id: string | null) => string | null;
  /** "ticket": persisted questions (API-backed). "draft": pre-create builder. */
  persistence: "ticket" | "draft";
  onTicketUpdated?: (ticket: TicketDTO) => void;
  onDraftChange?: (questions: TicketQuestionDTO[]) => void;
  /** Admin/team-configured quick-add templates (project-level, dynamic). */
  defaultQuestions?: ProjectDefaultQuestionDTO[];
}

/** Smooth accordion body powered by a 0fr→1fr grid transition. */
function AccordionBody({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className={cn("overflow-hidden", open ? "" : "invisible")}>{children}</div>
    </div>
  );
}

function answerSummary(
  question: TicketQuestionDTO,
  indexes: number[],
  texts: Record<number, string>,
): string {
  return indexes
    .map((i) => {
      const label = question.options[i] ?? "";
      const extra = texts[i];
      return extra ? `${label} - "${extra}"` : label;
    })
    .filter(Boolean)
    .join(", ");
}

function rowsToLabels(rows: OptionRow[]): { labels: string[]; textOptionIndexes: number[] } {
  const labels: string[] = [];
  const textOptionIndexes: number[] = [];
  rows.forEach((row) => {
    const label = row.label.trim();
    if (!label) return;
    if (row.withText) textOptionIndexes.push(labels.length);
    labels.push(label);
  });
  return { labels, textOptionIndexes };
}

export function QuestionsPanel({
  ticketId,
  questions,
  canWrite,
  myUserId,
  memberName,
  persistence,
  onTicketUpdated,
  onDraftChange,
  defaultQuestions = [],
}: QuestionsPanelProps) {
  const { t } = useLang();
  const isDraft = persistence === "draft";

  /* --------------------- quick-add default set --------------------- */
  /* The set is fully configurable per project (project edit dialog) -  */
  /* nothing here is hard-coded; an empty set hides the button.         */

  const [quickBusy, setQuickBusy] = useState(false);
  const templates = defaultQuestions.filter((q) => q.prompt.trim().length > 0);

  function templateToDraftQuestion(tq: ProjectDefaultQuestionDTO): TicketQuestionDTO {
    const options = tq.options.map((o) => o.label).filter((l) => l.trim());
    const choice = tq.type === "choice" && options.length >= 2;
    return {
      id: `draft-${crypto.randomUUID()}`,
      prompt: tq.prompt,
      type: choice ? "choice" : "text",
      options: choice ? options : [],
      textOptionIndexes: choice
        ? tq.options
            .map((o, i) => (o.withText ? i : -1))
            .filter((i) => i >= 0 && i < options.length)
        : [],
      allowMultiple: choice ? Boolean(tq.allowMultiple) : false,
      required: Boolean(tq.required),
      createdById: myUserId,
      createdAt: new Date().toISOString(),
      answers: [],
    };
  }

  async function applyDefaultSet() {
    if (templates.length === 0 || quickBusy) return;
    setQuickBusy(true);
    try {
      if (isDraft) {
        onDraftChange?.([...questions, ...templates.map(templateToDraftQuestion)]);
        toast.success(t("quick.addedDraft", { n: templates.length }));
      } else {
        let last: TicketDTO | null = null;
        for (const tq of templates) {
          const mapped = templateToDraftQuestion(tq);
          const result = await apiFetch<{ ticket: TicketDTO }>(
            `/api/tickets/${ticketId}/questions`,
            {
              method: "POST",
              json: {
                prompt: mapped.prompt,
                type: mapped.type,
                options: mapped.options ?? [],
                textOptionIndexes: mapped.textOptionIndexes ?? [],
                allowMultiple: mapped.allowMultiple,
                required: mapped.required,
              },
            },
          );
          last = result.ticket;
        }
        if (last) onTicketUpdated?.(last);
        toast.success(t("quick.added", { n: templates.length }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("quick.fail"));
    } finally {
      setQuickBusy(false);
    }
  }

  /* ---------------------- accordion open state ---------------------- */

  const firstUnanswered = questions.find(
    (q) => !q.answers.some((a) => a.userId === myUserId),
  )?.id;
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [openNew, setOpenNew] = useState(false);
  const [confirmDeleteQuestion, setConfirmDeleteQuestion] = useState<TicketQuestionDTO | null>(null);

  function isOpen(id: string) {
    if (openIds.has(id)) return true;
    return id === firstUnanswered && !openIds.has(`closed:${id}`);
  }
  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (isOpen(id)) {
        next.delete(id);
        next.add(`closed:${id}`);
      } else {
        next.delete(`closed:${id}`);
        next.add(id);
      }
      return next;
    });
  }

  /* --------------------------- answer drafts -------------------------- */

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);

  function draftFor(question: TicketQuestionDTO): Draft {
    const own = question.answers.find((a) => a.userId === myUserId);
    return (
      drafts[question.id] ?? {
        indexes: own?.choiceIndexes ?? [],
        texts: Object.fromEntries((own?.optionTexts ?? []).map((t) => [t.index, t.text])),
        text: own?.text ?? "",
      }
    );
  }

  function missingOptionText(question: TicketQuestionDTO, draft: Draft): number | null {
    return (
      (question.textOptionIndexes ?? []).find(
        (i) => draft.indexes.includes(i) && !(draft.texts[i] ?? "").trim(),
      ) ?? null
    );
  }

  /* ------------------------ question create form ---------------------- */

  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<QuestionType>("choice");
  const [optionRows, setOptionRows] = useState<OptionRow[]>([
    { label: "", withText: false },
    { label: "", withText: false },
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [required, setRequired] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  /* --------------------------- edit-in-place -------------------------- */

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editType, setEditType] = useState<QuestionType>("choice");
  const [editRows, setEditRows] = useState<OptionRow[]>([]);
  const [editAllowMultiple, setEditAllowMultiple] = useState(false);
  const [editRequired, setEditRequired] = useState(false);

  function startEditing(question: TicketQuestionDTO) {
    setEditingId(question.id);
    setEditError(null);
    setEditPrompt(question.prompt);
    setEditType(question.type);
    setEditRows(
      question.type === "choice"
        ? (question.options ?? []).map((label, index) => ({
            label,
            withText: (question.textOptionIndexes ?? []).includes(index),
          }))
        : [],
    );
    setEditAllowMultiple(question.allowMultiple);
    setEditRequired(question.required);
  }

  /* --------------------------- persistence ---------------------------- */

  function clearCreateForm() {
    setPrompt("");
    setOptionRows([
      { label: "", withText: false },
      { label: "", withText: false },
    ]);
    setAllowMultiple(false);
    setRequired(false);
    setOpenNew(false);
  }

  async function submitCreateQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    const cleanPrompt = prompt.trim();
    const { labels, textOptionIndexes } = rowsToLabels(optionRows);
    if (cleanPrompt.length < 5) {
      setCreateError(t("q.minChars"));
      return;
    }
    if (type === "choice" && labels.length < 2) {
      setCreateError(t("q.needTwoOptions"));
      return;
    }
    setCreating(true);
    try {
      if (isDraft) {
        const draftQuestion: TicketQuestionDTO = {
          id: `draft-${crypto.randomUUID()}`,
          prompt: cleanPrompt,
          type,
          options: labels,
          textOptionIndexes,
          allowMultiple,
          required,
          createdById: myUserId,
          createdAt: new Date().toISOString(),
          answers: [],
        };
        onDraftChange?.([...questions, draftQuestion]);
        toast.success(t("q.addedDraft"));
      } else {
        const result = await apiFetch<{ ticket: TicketDTO }>(
          `/api/tickets/${ticketId}/questions`,
          {
            method: "POST",
            json: { prompt: cleanPrompt, type, options: labels, textOptionIndexes, allowMultiple, required },
          },
        );
        toast.success(t("q.added"));
        onTicketUpdated?.(result.ticket);
      }
      clearCreateForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("q.addFail");
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  async function submitAnswer(question: TicketQuestionDTO) {
    setAnswerError(null);
    const draft = draftFor(question);
    if (question.type === "choice") {
      const missing = missingOptionText(question, draft);
      if (missing !== null) {
        setAnswerError(`"${question.options[missing]}" ${t("q.needShortNote")}`);
        toast.error(`"${question.options[missing]}" ${t("q.needShortNote")}`);
        return;
      }
    }
    setSavingId(question.id);
    try {
      const body =
        question.type === "choice"
          ? {
              choiceIndexes: draft.indexes,
              optionTexts: draft.indexes
                .filter((i) => (question.textOptionIndexes ?? []).includes(i))
                .map((i) => ({ index: i, text: (draft.texts[i] ?? "").trim() })),
            }
          : { text: draft.text };
      const result = await apiFetch<{ ticket: TicketDTO }>(
        `/api/tickets/${ticketId}/questions/${question.id}/answer`,
        { method: "POST", json: body },
      );
      toast.success(t("q.answerSaved"));
      setOpenIds((prev) => {
        const next = new Set(prev);
        next.delete(`closed:${question.id}`);
        next.add(question.id); // stay open after saving - no surprise collapse
        return next;
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[question.id];
        return next;
      });
      onTicketUpdated?.(result.ticket);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("q.answerFail");
      setAnswerError(message);
      toast.error(message);
    } finally {
      setSavingId(null); // spinner must clear once the data is in
    }
  }

  async function submitEditQuestion(question: TicketQuestionDTO) {
    setEditError(null);
    const cleanPrompt = editPrompt.trim();
    if (cleanPrompt.length < 5) {
      setEditError(t("q.minChars"));
      return;
    }
    const { labels, textOptionIndexes } = rowsToLabels(editRows);
    if (editType === "choice" && labels.length < 2) {
      setEditError(t("q.needTwoOptions"));
      return;
    }
    setEditBusy(true);
    try {
      if (isDraft) {
        onDraftChange?.(
          questions.map((q) =>
            q.id === question.id
              ? {
                  ...q,
                  prompt: cleanPrompt,
                  options: editType === "choice" ? labels : q.options,
                  textOptionIndexes: editType === "choice" ? textOptionIndexes : [],
                  allowMultiple: editType === "choice" ? editAllowMultiple : q.allowMultiple,
                  required: editRequired,
                }
              : q,
          ),
        );
        toast.success(t("q.updated"));
      } else {
        const result = await apiFetch<{ ticket: TicketDTO }>(
          `/api/tickets/${ticketId}/questions/${question.id}`,
          {
            method: "PUT",
            json:
              editType === "choice"
                ? {
                    prompt: cleanPrompt,
                    options: labels,
                    textOptionIndexes,
                    allowMultiple: editAllowMultiple,
                    required: editRequired,
                  }
                : { prompt: cleanPrompt, required: editRequired },
          },
        );
        toast.success(t("q.updated"));
        onTicketUpdated?.(result.ticket);
      }
      setEditingId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("q.updateFail");
      setEditError(message);
      toast.error(message);
    } finally {
      setEditBusy(false);
    }
  }

  async function removeQuestion(question: TicketQuestionDTO) {
    try {
      if (isDraft) {
        onDraftChange?.(questions.filter((q) => q.id !== question.id));
        toast.success(t("q.deleted"));
        return;
      }
      const result = await apiFetch<{ ticket: TicketDTO }>(
        `/api/tickets/${ticketId}/questions/${question.id}`,
        { method: "DELETE", json: {} },
      );
      toast.success(t("q.deleted"));
      onTicketUpdated?.(result.ticket);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("q.deleteFail"));
    }
    setConfirmDeleteQuestion(null);
  }

  /* --------------------- shared option/multi editor -------------------- */
  /* Rendered INSIDE either the create form or the edit-in-place form.    */

  function renderEditorFields(mode: "create" | "edit") {
    const isEdit = mode === "edit";
    const rows = isEdit ? editRows : optionRows;
    const setRowsState = isEdit ? setEditRows : setOptionRows;
    const multi = isEdit ? editAllowMultiple : allowMultiple;
    const setMulti = isEdit ? setEditAllowMultiple : setAllowMultiple;
    const qType = isEdit ? editType : type;
    const error = isEdit ? editError : createError;
    if (qType !== "choice") return null;
    return (
      <>
        <div className="flex flex-col gap-1">
          <Label className="text-[12px]">{t("q.options")}</Label>
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Input
                value={row.label}
                onChange={(e) =>
                  setRowsState((prev) =>
                    prev.map((o, i) => (i === index ? { ...o, label: e.target.value } : o)),
                  )
                }
                placeholder={t("q.optionNumPh", { n: index + 1 })}
                className="text-[13px]"
                data-testid={`${isEdit ? "question-edit" : "question"}-option-input-${index}`}
              />
              <Button
                type="button"
                variant={row.withText ? "default" : "outline"}
                size="sm"
                aria-pressed={row.withText}
                title={
                  row.withText
                    ? t("q.textOnTitle")
                    : t("q.textOffTitle")
                }
                onClick={() =>
                  setRowsState((prev) =>
                    prev.map((o, i) => (i === index ? { ...o, withText: !o.withText } : o)),
                  )
                }
                data-testid={`${isEdit ? "question-edit" : "question"}-option-text-toggle-${index}`}
                className="shrink-0 px-2"
              >
                <Edit3 size={12} />
                {t("q.textFlag")}
              </Button>
              {rows.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("q.removeOption", { n: index + 1 })}
                  className="shrink-0 text-muted hover:text-danger"
                  onClick={() => setRowsState((prev) => prev.filter((_, i) => i !== index))}
                >
                  <X size={13} />
                </Button>
              )}
            </div>
          ))}
          {rows.length < 8 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setRowsState((prev) => [...prev, { label: "", withText: false }])}
              data-testid={`${isEdit ? "question-edit" : "question"}-add-option`}
            >
              <Plus size={13} />
              {t("q.addOption")}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-[12px]">{t("q.clientCanPick")}</Label>
          <div className="flex gap-1.5">
            {[
              { label: t("q.single"), value: false },
              { label: t("q.multi"), value: true },
            ].map((m) => (
              <button
                key={String(m.value)}
                type="button"
                aria-pressed={multi === m.value}
                onClick={() => setMulti(m.value)}
                data-testid={`question-multi-${m.value ? "multi" : "single"}`}
                className={cn(
                  "press rounded-md border px-2.5 py-1 text-[12px] transition-colors",
                  multi === m.value
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border text-muted hover:border-border-strong hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-[12px] text-danger" role="alert">
            {error}
          </p>
        )}
      </>
    );
  }

  function renderEditorFooter(mode: "create" | "edit") {
    const isEdit = mode === "edit";
    const busy = isEdit ? editBusy : creating;
    const error = isEdit ? editError : createError;
    return (
      <>
        {!isEdit && error && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-[12px] text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => (isEdit ? setEditingId(null) : setOpenNew(false))}
            disabled={busy}
          >
            {t("q.cancel")}
          </Button>
          <Button type="submit" size="sm" disabled={busy} className="whitespace-nowrap" data-testid={isEdit ? "question-edit-save" : "question-submit"}>
            {busy && <LoaderCircle size={13} className="animate-spin" />}
            {isEdit ? t("q.saveChanges") : t("q.addQuestion")}
          </Button>
        </div>
      </>
    );
  }

  /* ------------------------------ render ------------------------------ */

  return (
    <section
      className="rounded-xl border border-border bg-surface px-3 py-3"
      data-testid="questions-panel"
      aria-label={t("q.sectionLabel")}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-[13px] font-medium">{t("q.title")}</h3>
        <span className="text-[11px] text-muted">
          {questions.length} {questions.length === 1 ? t("q.question") : t("q.questions")}
        </span>
      </div>

      {isDraft && (
        <p className="mb-2 px-1 text-[11px] text-muted">
          {t("q.draftHint")}{" "}
          <span className="font-medium text-foreground">{t("q.createTicketCta")}</span>.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {questions.map((question) => {
          const open = isOpen(question.id);
          const own = question.answers.find((a) => a.userId === myUserId);
          const unansweredRequired = question.required && question.answers.length === 0;
          const draft = draftFor(question);
          const hasTextInputOptions = (question.textOptionIndexes ?? []).length > 0;
          const others = question.answers.filter((a) => a.userId !== myUserId);
          const editing = editingId === question.id;
          return (
            <div
              key={question.id}
              className={cn(
                "overflow-hidden rounded-lg border transition-colors",
                open ? "border-primary/50" : "border-border",
              )}
            >
              {/* Accordion header */}
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(question.id)}
                data-testid="question-item"
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="text-muted">
                  {question.type === "choice" ? <ListChecks size={14} /> : <MessageSquare size={14} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                  {question.prompt}
                </span>
                {unansweredRequired && (
                  <Badge variant="danger" data-testid="question-required-badge">
                    {t("q.needsAnswer")}
                  </Badge>
                )}
                {question.answers.length > 0 && (
                  <Badge variant="success">
                    {question.answers.length} {question.answers.length === 1 ? t("q.answer") : t("q.answers")}
                  </Badge>
                )}
                {question.required && question.answers.length > 0 && (
                  <Badge variant="primary">{t("q.required")}</Badge>
                )}
                <ChevronDown
                  size={14}
                  className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")}
                />
              </button>

              {/* Accordion body */}
              <AccordionBody open={open}>
                <div className="border-t border-border px-3 py-2.5">
                  {editing && canWrite ? (
                    /* -------- edit-in-place (admin/team, anytime) -------- */
                    <form
                      className="flex flex-col gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void submitEditQuestion(question);
                      }}
                      data-testid="question-edit-form"
                    >
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`edit-prompt-${question.id}`} className="text-[12px]">
                          {t("q.promptLabel")}
                        </Label>
                        <Input
                          id={`edit-prompt-${question.id}`}
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          className="text-[13px]"
                          data-testid="question-edit-prompt"
                        />
                      </div>
                      {question.type === "text" && (
                        <p className="text-[11px] text-muted">
                          {t("q.textTypeNote")}
                        </p>
                      )}
                      {renderEditorFields("edit")}
                      <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted">
                        <input
                          type="checkbox"
                          checked={editRequired}
                          onChange={(e) => setEditRequired(e.target.checked)}
                          className="size-3.5 accent-primary"
                          data-testid="question-edit-required"
                        />
                        {t("q.requiredFlag")}
                      </label>
                      {renderEditorFooter("edit")}
                    </form>
                  ) : (
                    <>
                      {question.type === "choice" && (
                        <div className="flex flex-col gap-1.5" role="group">
                          {question.options.map((option, index) => {
                            const checked = draft.indexes.includes(index);
                            const withText = (question.textOptionIndexes ?? []).includes(index);
                            const pickers = others
                              .filter((a) => (a.choiceIndexes ?? []).includes(index))
                              .map((a) => a.userId);
                            const notes = others
                              .filter(
                                (a) =>
                                  (a.choiceIndexes ?? []).includes(index) &&
                                  (a.optionTexts ?? []).some((t) => t.index === index),
                              )
                              .map((a) => ({
                                name: memberName(a.userId) ?? t("q.member"),
                                text:
                                  (a.optionTexts ?? []).find((t) => t.index === index)?.text ?? "",
                              }));
                            return (
                              <div key={index}>
                                <label
                                  className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-2.5 py-1.5 text-[12.5px] transition-colors hover:border-border-strong has-[:checked]:border-primary/60 has-[:checked]:bg-primary/5"
                                  data-testid="question-option"
                                >
                                  <input
                                    type={question.allowMultiple ? "checkbox" : "radio"}
                                    name={`question-${question.id}`}
                                    checked={checked}
                                    onChange={(e) => {
                                      setDrafts((prev) => {
                                        const base = prev[question.id] ?? {
                                          indexes: own?.choiceIndexes ?? [],
                                          texts: Object.fromEntries(
                                            (own?.optionTexts ?? []).map((t) => [t.index, t.text]),
                                          ),
                                          text: "",
                                        };
                                        const indexes = question.allowMultiple
                                          ? e.target.checked
                                            ? [...base.indexes, index]
                                            : base.indexes.filter((i) => i !== index)
                                          : [index];
                                        return { ...prev, [question.id]: { ...base, indexes } };
                                      });
                                    }}
                                    className="size-3.5 shrink-0 accent-primary"
                                  />
                                  <span className="min-w-0 flex-1">{option}</span>
                                  {withText && (
                                    <span className="flex shrink-0 items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                                      <Edit3 size={10} />
                                      {t("q.textChip")}
                                    </span>
                                  )}
                                  {/* Client picks stay visible to every role */}
                                  {pickers.length > 0 && (
                                    <span
                                      className="flex shrink-0 flex-wrap items-center gap-1"
                                      data-testid="question-picks"
                                    >
                                      {pickers.slice(0, 4).map((uid, i) => (
                                        <span
                                          key={`${uid}-${i}`}
                                          className="flex items-center gap-0.5 rounded-full bg-done/10 px-1.5 py-0.5 text-[10px] font-medium text-done"
                                          title={t("q.pickedBy", { name: memberName(uid) ?? t("q.aMember") })}
                                        >
                                          ✓ {memberName(uid)?.split(" ")[0] ?? "?"}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                </label>
                                {notes.map((note, i) => (
                                  <p key={i} className="ml-6 mt-0.5 text-[11px] italic text-muted">
                                    &ldquo;{note.text}&rdquo; - {note.name}
                                  </p>
                                ))}
                                {withText && checked && !isDraft && (
                                  <Input
                                    value={draft.texts[index] ?? ""}
                                    onChange={(e) =>
                                      setDrafts((prev) => {
                                        const base = prev[question.id] ?? {
                                          indexes: own?.choiceIndexes ?? [],
                                          texts: {},
                                          text: "",
                                        };
                                        return {
                                          ...prev,
                                          [question.id]: {
                                            ...base,
                                            texts: { ...base.texts, [index]: e.target.value },
                                          },
                                        };
                                      })
                                    }
                                    placeholder={`${t("q.detailsPh")} "${option}"…`}
                                    className="mt-1 ml-6 w-[calc(100%-1.5rem)] text-[12.5px]"
                                    data-testid="question-option-text-input"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {question.type === "text" && (
                        <Textarea
                          value={draft.text}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [question.id]: {
                                indexes: own?.choiceIndexes ?? [],
                                texts: Object.fromEntries(
                                  (own?.optionTexts ?? []).map((t) => [t.index, t.text]),
                                ),
                                text: e.target.value,
                              },
                            }))
                          }
                          placeholder={t("q.textPh")}
                          className="min-h-16 text-[13px]"
                          data-testid="question-text-input"
                        />
                      )}

                      {isDraft ? (
                        <>
                          <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted">
                            {t("q.preview")}
                          </p>
                          <div className="flex justify-end gap-1 pt-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(question)}
                              data-testid="question-edit-toggle"
                              className="text-muted hover:text-foreground"
                            >
                              <Pencil size={12} />
                              {t("q.edit")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={t("q.delete")}
                              className="text-muted hover:text-danger"
                              onClick={() => setConfirmDeleteQuestion(question)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted">
                            {own
                              ? `${t("q.youAnswered")} ${timeAgo(own.answeredAt)}`
                              : question.type === "choice"
                                ? hasTextInputOptions
                                  ? t("q.pickOptionText")
                                  : t("q.pickOption")
                                : t("q.writeAnswer")}
                          </span>
                          <div className="flex items-center gap-1">
                            {canWrite && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditing(question)}
                                  data-testid="question-edit-toggle"
                                  className="text-muted hover:text-foreground"
                                >
                                  <Pencil size={12} />
                                  {t("q.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={t("q.delete")}
                                  className="text-muted hover:text-danger"
                                  onClick={() => setConfirmDeleteQuestion(question)}
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                savingId === question.id ||
                                (question.type === "choice"
                                  ? draft.indexes.length === 0 ||
                                    missingOptionText(question, draft) !== null
                                  : !draft.text.trim())
                              }
                              onClick={() => void submitAnswer(question)}
                              data-testid="answer-submit"
                            >
                              {savingId === question.id && (
                                <LoaderCircle size={13} className="animate-spin" />
                              )}
                              {own ? t("q.updateAnswer") : t("q.saveAnswer")}
                            </Button>
                          </div>
                        </div>
                      )}

                      {answerError && savingId === question.id && (
                        <p className="mt-1.5 text-[11.5px] text-danger" role="alert">
                          {answerError}
                        </p>
                      )}

                      {others.length > 0 && (
                        <div className="mt-2.5 border-t border-border pt-2">
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                            {t("q.answersHeading")}
                          </p>
                          <ul className="flex flex-col gap-1" data-testid="question-answers">
                            {others.map((answer, i) => (
                              <li key={`${answer.userId}-${i}`} className="text-[12px] text-muted">
                                <span className="font-medium text-foreground">
                                  {memberName(answer.userId) ?? t("q.member")}
                                </span>
                                {" · "}
                                {question.type === "choice"
                                  ? answerSummary(
                                      question,
                                      answer.choiceIndexes,
                                      Object.fromEntries(
                                        (answer.optionTexts ?? []).map((t) => [t.index, t.text]),
                                      ),
                                    ) || "-"
                                  : answer.text}
                                <span className="text-[10.5px]"> · {timeAgo(answer.answeredAt)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </AccordionBody>
            </div>
          );
        })}

        {/* Quick-add: one tap inserts the project's configured default set
            (admin/team only; hidden while the set is empty, never hard-coded). */}
        {canWrite && templates.length > 0 && (
          <button
            type="button"
            onClick={() => void applyDefaultSet()}
            title={t("quick.setHint")}
            disabled={quickBusy}
            data-testid="quick-questions"
            className="press flex items-center gap-2 rounded-lg border border-primary/35 bg-primary/5 px-2.5 py-2 text-left text-[12.5px] font-medium text-primary transition-colors hover:border-primary/60 hover:bg-primary/10"
          >
            {quickBusy ? (
              <LoaderCircle size={14} className="animate-spin text-primary" />
            ) : (
              <Zap size={14} />
            )}
            {t("quick.set")}
            <span className="text-[11px] font-normal text-muted">
              {t("quick.setCount", { n: templates.length })}
            </span>
          </button>
        )}

        {/* Create-question accordion (admin/team only) */}
        {canWrite && (
          <div
            className={cn(
              "overflow-hidden rounded-lg border transition-colors",
              openNew ? "border-primary/50" : "border-dashed border-border",
            )}
          >
            <button
              type="button"
              aria-expanded={openNew}
              onClick={() => setOpenNew((v) => !v)}
              data-testid="new-question-toggle"
              className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[12.5px] font-medium transition-colors hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Plus size={14} className="text-primary" />
              {t("q.newQuestion")}
              <ChevronDown
                size={14}
                className={cn("ml-auto text-muted transition-transform", openNew && "rotate-180")}
              />
            </button>

            <AccordionBody open={openNew}>
              <form
                onSubmit={submitCreateQuestion}
                className="border-t border-border px-3 py-2.5"
                data-testid="question-create-form"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="question-prompt" className="text-[12px]">{t("q.promptLabel")}</Label>
                    <Input
                      id="question-prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t("q.promptPh")}
                      className="text-[13px]"
                      data-testid="question-prompt"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-[12px]">{t("q.answerType")}</Label>
                    <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
                      <SelectTrigger data-testid="question-type-select" aria-label={t("q.answerType")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="choice">{t("q.typeChoice")}</SelectItem>
                        <SelectItem value="text">{t("q.typeText")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {renderEditorFields("create")}

                  <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted">
                    <input
                      type="checkbox"
                      checked={required}
                      onChange={(e) => setRequired(e.target.checked)}
                      className="size-3.5 accent-primary"
                      data-testid="question-required"
                    />
                    {t("q.requiredFlag")}
                  </label>

                  {renderEditorFooter("create")}
                </div>
              </form>
            </AccordionBody>
          </div>
        )}

        {questions.length === 0 && !canWrite && (
          <p className="px-1 py-1.5 text-[12px] text-muted">
            {t("q.emptyClient")}
          </p>
        )}
      </div>

      {/* Branded destructive-action confirmation (no window.confirm) */}
      <ConfirmDialog
        open={confirmDeleteQuestion !== null}
        onOpenChange={(open) => !open && setConfirmDeleteQuestion(null)}
        title={t("q.deleteConfirm")}
        confirmLabel={t("confirm.delete")}
        cancelLabel={t("q.cancel")}
        onConfirm={() => {
          if (confirmDeleteQuestion) void removeQuestion(confirmDeleteQuestion);
        }}
      />
    </section>
  );
}
