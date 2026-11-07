"use client";

import { useRef, useState, type FormEvent } from "react";
import { Edit3, ListChecks, LoaderCircle, MessageSquare, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { cn } from "@/lib/utils";
import { updateProjectAction } from "@/app/actions/projects";
import { useLang } from "@/lib/i18n";
import { explainApi } from "@/lib/i18n/dictionary";
import { PROJECT_GRADIENTS, gradientClassFor } from "@/lib/gradients";
import type { DictKey } from "@/lib/i18n/dictionary";
import type { ProjectDefaultQuestionDTO, ProjectDTO } from "@/lib/types";
import { apiFetch } from "@/lib/fetcher";

/** One editable quick-add template row (mirrors the ticket question shape). */
type TemplateRow = ProjectDefaultQuestionDTO;

/** Fresh empty choice row used by the "add to set" button. */
function blankRow(): TemplateRow {
  return {
    prompt: "",
    type: "choice",
    options: [
      { label: "", withText: false },
      { label: "", withText: false },
    ],
    allowMultiple: false,
    required: false,
  };
}

interface ProjectEditDialogProps {
  project: ProjectDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Refresh the server-rendered board header after a successful save. */
  onSaved?: () => void;
}

/** Admin/team editor for the project's name + description + card header
 * gradient + quick-add default question set (write-level RBAC enforced
 * server-side by updateProjectMeta). */
export function ProjectEditDialog({
  project,
  open,
  onOpenChange,
  onSaved,
}: ProjectEditDialogProps) {
  const { t } = useLang();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [gradientKey, setGradientKey] = useState<string | null>(
    project.gradientKey ?? null,
  );
  const [templateRows, setTemplateRows] = useState<TemplateRow[]>(
    project.defaultQuestions?.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o })) })) ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Media keys uploaded this session (description editor) - cleaned on
   *  close: the backend keeps any key referenced by saved content. */
  const sessionMediaRef = useRef<string[]>([]);

  function cleanupSessionMedia() {
    const candidates = [...new Set(sessionMediaRef.current)].filter(Boolean);
    if (candidates.length === 0) return;
    void apiFetch("/api/content/graphics/cleanup", {
      method: "POST",
      json: { projectId: project.id, keys: candidates },
    }).catch(() => undefined);
  }

  function handleDialogChange(open: boolean) {
    if (!open) cleanupSessionMedia();
    onOpenChange(open);
  }

  function patchRow(index: number, patch: Partial<TemplateRow>) {
    setTemplateRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }
  function patchOption(rowIndex: number, optIndex: number, patch: { label?: string; withText?: boolean }) {
    setTemplateRows((prev) =>
      prev.map((row, i) =>
        i === rowIndex
          ? {
              ...row,
              options: row.options.map((o, j) => (j === optIndex ? { ...o, ...patch } : o)),
            }
          : row,
      ),
    );
  }

  /**
   * Partial rows must not block saving: drop rows without a prompt, drop
   * blank option labels. The server still sanitizes (and degrades choice
   * entries with < 2 options to text questions).
   */
  function cleanTemplates(): TemplateRow[] {
    return templateRows
      .map((q) => {
        const options = (q.type === "choice" ? q.options : [])
          .map((o) => ({ label: o.label.trim(), withText: o.withText }))
          .filter((o) => o.label.length > 0);
        return {
          prompt: q.prompt.trim(),
          type: q.type,
          options,
          allowMultiple: q.allowMultiple,
          required: q.required,
        };
      })
      .filter((q) => q.prompt.length > 0)
      .slice(0, 5);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await updateProjectAction({
        projectId: project.id,
        patch: {
          name: name.trim(),
          description: description.trim(),
          gradientKey,
          defaultQuestions: cleanTemplates(),
        },
      });
      if (!result.ok || !result.data) {
        setError(explainApi(result, t, "prj.saveFail"));
        return;
      }
      toast.success(t("prj.saved"));
      onOpenChange(false);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      {/* size lg / max-w-2xl: the template editor (prompts + option rows)
          needs width - narrow md clipped labels and broke the rows. */}
      <DialogContent size="lg" data-testid="project-edit-dialog">
        {/* key on open: re-seed fields from the current project each open */}
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>{t("prj.edit")}</DialogTitle>
            <DialogDescription>{t("prj.editDesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-5 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-project-name">{t("home.dialogName")}</Label>
              <Input
                id="edit-project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("home.namePh")}
                required
                minLength={2}
                maxLength={120}
                data-testid="edit-project-name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("home.dialogDesc")}</Label>
              {/* Rich project description (Tiptap): formatting + IMAGE upload
                  (images only, max 5) - the description card/board header
                  surfaces render a plain-text projection via stripRichHtml. */
              }
              <RichTextEditor
                value={description}
                onChange={(html) => setDescription(html)}
                placeholder={t("home.descPh")}
                testid="edit-project-desc"
                minHeight="96px"
                projectId={project.id}
                onMediaKeyUploaded={(key) => sessionMediaRef.current.push(key)}
              />
            </div>

            {/* Quick-add default question set: team-configurable, saved with
                the same PATCH; feeds the ticket modal's one-tap button. */}
            <div className="flex flex-col gap-2" data-testid="default-questions-editor">
              <div className="flex items-center justify-between gap-2">
                <Label>{t("dq.title")}</Label>
                {templateRows.length > 0 && (
                  <button
                    type="button"
                    className="text-[11.5px] text-muted transition-colors hover:text-danger"
                    onClick={() => setTemplateRows([])}
                    data-testid="dq-clear-all"
                  >
                    {t("dq.clearAll")}
                  </button>
                )}
              </div>
              <p className="text-[11.5px] text-muted">{t("dq.desc")}</p>

              {templateRows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="rounded-lg border border-border bg-surface-2/50 px-3 py-2.5"
                  data-testid={`dq-row-${rowIndex}`}
                >
                  {/* Prompt line wraps on narrow viewports: prompt keeps as
                      much width as it can grab (min-w-0 prevents clipping),
                      type + remove stay on the trailing side. */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {rowIndex + 1}
                    </span>
                    <Input
                      value={row.prompt}
                      onChange={(e) => patchRow(rowIndex, { prompt: e.target.value })}
                      placeholder={t("q.promptPh")}
                      className="h-8 min-w-[180px] flex-1 text-[12.5px]"
                      data-testid={`dq-prompt-${rowIndex}`}
                    />
                    <Select
                      value={row.type}
                      onValueChange={(v) =>
                        patchRow(rowIndex, { type: v as TemplateRow["type"] })
                      }
                    >
                      <SelectTrigger
                        className="h-8 w-[104px] shrink-0 text-[12px]"
                        aria-label={t("q.answerType")}
                        data-testid={`dq-type-${rowIndex}`}
                      >
                        {row.type === "choice" ? <ListChecks size={13} /> : <MessageSquare size={13} />}
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* short labels here: the descriptive ones (used in
                            the ticket question editor) don't fit this row */}
                        <SelectItem value="choice">{t("dq.typeChoice")}</SelectItem>
                        <SelectItem value="text">{t("dq.typeText")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted hover:text-danger"
                      aria-label={t("dq.removeRow", { n: rowIndex + 1 })}
                      onClick={() =>
                        setTemplateRows((prev) => prev.filter((_, i) => i !== rowIndex))
                      }
                      data-testid={`dq-remove-${rowIndex}`}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>

                  {row.type === "choice" && (
                    <div className="mt-1.5 flex flex-col gap-1">
                      {row.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-1.5">
                          <Input
                            value={opt.label}
                            onChange={(e) =>
                              patchOption(rowIndex, optIndex, { label: e.target.value })
                            }
                            placeholder={t("q.optionNumPh", { n: optIndex + 1 })}
                            className="h-7 min-w-[140px] flex-1 text-[12px]"
                            data-testid={`dq-opt-label-${rowIndex}-${optIndex}`}
                          />
                          <Button
                            type="button"
                            variant={opt.withText ? "default" : "outline"}
                            size="sm"
                            aria-pressed={opt.withText}
                            className="h-7 shrink-0 px-1.5 text-[11px]"
                            title={opt.withText ? t("q.textOnTitle") : t("q.textOffTitle")}
                            onClick={() =>
                              patchOption(rowIndex, optIndex, {
                                withText: !opt.withText,
                              })
                            }
                            data-testid={`dq-opt-text-${rowIndex}-${optIndex}`}
                          >
                            <Edit3 size={11} />
                          </Button>
                          {row.options.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 text-muted hover:text-danger"
                              aria-label={t("q.removeOption", { n: optIndex + 1 })}
                              onClick={() =>
                                patchRow(rowIndex, {
                                  options: row.options.filter((_, j) => j !== optIndex),
                                })
                              }
                              data-testid={`dq-opt-remove-${rowIndex}-${optIndex}`}
                            >
                              <X size={12} />
                            </Button>
                          )}
                        </div>
                      ))}
                      {row.options.length < 8 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 self-start text-[11.5px]"
                          onClick={() =>
                            patchRow(rowIndex, {
                              options: [...row.options, { label: "", withText: false }],
                            })
                          }
                          data-testid={`dq-opt-add-${rowIndex}`}
                        >
                          <Plus size={12} />
                          {t("q.addOption")}
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center gap-1.5">
                    {row.type === "choice" && (
                      <div className="flex gap-1">
                        {[
                          { label: t("q.single"), value: false },
                          { label: t("q.multi"), value: true },
                        ].map((m) => (
                          <button
                            key={String(m.value)}
                            type="button"
                            aria-pressed={row.allowMultiple === m.value}
                            onClick={() =>
                              patchRow(rowIndex, { allowMultiple: m.value })
                            }
                            data-testid={`dq-multi-${m.value ? "multi" : "single"}-${rowIndex}`}
                            className={cn(
                              "press rounded-md border px-2 py-0.5 text-[11px] transition-colors",
                              row.allowMultiple === m.value
                                ? "border-primary/60 bg-primary/10 text-primary"
                                : "border-border text-muted hover:text-foreground",
                            )}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11.5px] text-muted">
                      <input
                        type="checkbox"
                        checked={row.required}
                        onChange={(e) => patchRow(rowIndex, { required: e.target.checked })}
                        className="size-3.5 accent-primary"
                        data-testid={`dq-req-${rowIndex}`}
                      />
                      {t("q.requiredFlag")}
                    </label>
                  </div>
                </div>
              ))}

              {templateRows.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => setTemplateRows((prev) => [...prev, blankRow()])}
                  data-testid="dq-add-row"
                >
                  <Plus size={13} />
                  {t("dq.addRow")}
                </Button>
              )}
            </div>

            {/* Card header gradient picker (saved with the same PATCH;
                click again to go back to the automatic name-hash cover). */}
            <div className="flex flex-col gap-1.5">
              <Label>{t("grad.pick")}</Label>
              <div className="flex flex-wrap gap-2" data-testid="gradient-picker">
                {PROJECT_GRADIENTS.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    title={t(g.dictKey as DictKey)}
                    aria-label={t(g.dictKey as DictKey)}
                    aria-pressed={gradientKey === g.key}
                    onClick={() =>
                      setGradientKey((cur) => (cur === g.key ? null : g.key))
                    }
                    data-testid={`grad-swatch-${g.key}`}
                    className={`press h-9 w-14 rounded-lg ${g.className} ring-1 ring-inset ring-white/20 transition-all ${
                      gradientKey === g.key
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-[var(--surface)]"
                        : "hover:scale-105"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11.5px] text-muted">
                {gradientKey ? t("grad.usesPreset") : t("grad.usesAuto")}
                <span
                  className={`ml-2 inline-block h-2.5 w-10 rounded-full align-middle ${
                    gradientClassFor(gradientKey) ?? "bg-gradient-primary"
                  }`}
                />
              </p>
            </div>

            {error && (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {t("home.cancel")}
            </Button>
            <Button type="submit" disabled={busy} data-testid="project-edit-save">
              {busy && <LoaderCircle size={13} className="animate-spin" />}
              {t("prj.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
