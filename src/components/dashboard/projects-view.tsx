"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { debounce } from "lodash";
import { BarChart3, BrainCircuit, LoaderCircle, Plus, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProjectAction } from "@/app/actions/projects";
import { useLang } from "@/lib/i18n";
import { stripRichHtml } from "@/lib/sanitize";
import { gradientClassFor } from "@/lib/gradients";
import type { GlobalRole, ProjectDTO } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

interface ProjectsViewProps {
  projects: ProjectDTO[];
  canCreate: boolean;
  role: GlobalRole;
}

/** Deterministic cover gradient per project name - deep navy/indigo family. */
const COVERS = [
  "bg-gradient-primary",
  "from-[#312e81] via-[#4338ca] to-[#1e3a5f] bg-gradient-to-br",
  "from-[#1e3a5f] via-[#4353c6] to-[#312e81] bg-gradient-to-br",
  "from-[#26345f] via-[#3f5db4] to-[#253a75] bg-gradient-to-br",
  "from-[#3b3f9e] via-[#4a6cc0] to-[#2c4a70] bg-gradient-to-br",
];

function coverFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COVERS[Math.abs(hash) % COVERS.length];
}

export function ProjectsView({ projects, canCreate, role }: ProjectsViewProps) {
  const router = useRouter();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* --- project search (lodash debounce: one input event, one delayed filter) */
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const debouncedTerm = useMemo(
    () => debounce((value: string) => setTerm(value.trim().toLowerCase()), 250),
    [],
  );
  useEffect(() => () => debouncedTerm.cancel(), [debouncedTerm]);
  const searching = term.length > 0;
  const visible = searching
    ? projects.filter((p) =>
        [p.name, p.description].some((v) => v.toLowerCase().includes(term)),
      )
    : projects;

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await createProjectAction({ name: name.trim(), description: description.trim() });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? t("home.createFail"));
      return;
    }
    toast.success(t("home.projectCreated"));
    setOpen(false);
    setName("");
    setDescription("");
    router.refresh();
    if (result.data) router.push(`/projects/${result.data.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Workspace banner - brand navy gradient, layered depth, quick stats */}
      <section className="bg-gradient-banner elev-card relative overflow-hidden rounded-2xl px-6 py-7 sm:px-8">
        {/* Decorative layers: soft glows + hairline rings + grid texture */}
        <span className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-sky-300/15 blur-2xl" />
        <span className="pointer-events-none absolute left-1/3 top-0 h-24 w-72 rounded-full bg-indigo-200/15 blur-2xl" />
        <span
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, white 0 1px, transparent 1px 56px), repeating-linear-gradient(0deg, white 0 1px, transparent 1px 56px)",
          }}
        />
        <span className="pointer-events-none absolute -right-24 bottom-[-90px] h-64 w-64 rounded-full border border-white/15" />
        <span className="pointer-events-none absolute -right-10 bottom-[-110px] h-80 w-80 rounded-full border border-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.14em] text-white/70">
              <Ticket size={13} />
              {t("home.eyebrow")}
            </p>
            <h1 className="mt-1.5 text-[22px] font-semibold tracking-tight text-white sm:text-2xl">
              {role === "client" ? t("home.titleClient") : t("home.titleTeam")}
            </h1>
            <p className="mt-1 max-w-xl text-[13.5px] leading-5 text-white/75">
              {role === "client"
                ? t("home.subClient")
                : t("home.subTeam")}
            </p>
            <p className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] text-white/70">
              <span className="rounded-full bg-white/10 px-2.5 py-1">{projects.length} {projects.length === 1 ? t("home.project") : t("home.projects")}</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">
                {new Set(projects.flatMap((p) => p.members.map((m) => m.user.id))).size} {t("home.collaborators")}
              </span>
            </p>
          </div>
          {canCreate && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/analytics"
                data-testid="banner-analytics-link"
                className="press inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/25 px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-white/10"
              >
                <BarChart3 size={15} />
                {t("nav.analytics")}
              </Link>
              <Link
                href="/knowledge"
                data-testid="banner-knowledge-link"
                className="press inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/25 px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-white/10"
              >
                <BrainCircuit size={15} />
                {t("nav.knowledge")}
              </Link>
              <Button
                onClick={() => setOpen(true)}
                data-testid="new-project"
                className="press h-10 rounded-xl bg-white/95 px-4 text-[13.5px] font-medium text-indigo-800 transition-colors hover:bg-white"
              >
                <Plus size={16} />
                {t("home.newProject")}
              </Button>
            </div>
          )}
        </div>
      </section>

      {projects.length === 0 && !canCreate ? (
        <div className="elev-card flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-10 text-center sm:flex-row sm:text-left">
          <Image
            src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=800&q=80"
            alt=""
            width={320}
            height={200}
            sizes="320px"
            className="h-36 w-full rounded-xl object-cover sm:w-64"
          />
          <div>
            <h2 className="text-[15px] font-medium">{t("home.emptyClientTitle")}</h2>
            <p className="mt-1 max-w-sm text-[13px] text-muted">
              {t("home.emptyClientSub")}
            </p>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="elev-card flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center sm:flex-row sm:text-left">
          <Image
            src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=800&q=80"
            alt=""
            width={320}
            height={200}
            sizes="320px"
            className="h-36 w-full rounded-xl object-cover opacity-90 sm:w-64"
          />
          <div>
            <h2 className="text-[15px] font-medium">{t("home.emptyTeamTitle")}</h2>
            <p className="mt-1 max-w-sm text-[13px] text-muted">
              {t("home.emptyTeamSub")}
            </p>
            {canCreate && (
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => setOpen(true)}>
                <Plus size={14} />
                {t("home.newProject")}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Search row: type to filter the project grid instantly (250ms
              lodash debounce keeps typing smooth on big workspaces). */}
          <div className="relative max-w-md w-full sm:w-80">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                debouncedTerm(e.target.value);
              }}
              placeholder={t("home.searchPh")}
              className="h-9 rounded-xl pl-8.5 pr-8 shadow-[0_1px_2px_rgba(13,18,38,0.04),0_2px_10px_rgba(37,51,116,0.07)]"
              data-testid="project-search"
            />
            {search && (
              <button
                type="button"
                aria-label={t("home.searchClear")}
                onClick={() => {
                  setSearch("");
                  debouncedTerm.cancel();
                  setTerm("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {searching && (
            <p className="text-[12px] text-muted">
              {visible.length === 0
                ? t("home.searchNoMatch")
                : `${visible.length} / ${projects.length} ${t("home.projects")}`}
            </p>
          )}
          {searching && visible.length === 0 ? (
            <div className="elev-card flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
              <p className="text-[14px] font-medium">{t("home.searchNoMatch")}</p>
              <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setTerm(""); }}>
                {t("home.searchClear")}
              </Button>
            </div>
          ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="project-grid"
        >
          {visible.map((project) => {
            const shown = project.members.slice(0, 4);
            const extra = project.members.length - shown.length;
            const coverClass =
              gradientClassFor(project.gradientKey) ?? coverFor(project.name);
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="elev-card group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
                data-testid="project-card"
                data-gradient={project.gradientKey ?? "auto"}
              >
                <span className={`h-14 w-full ${coverClass} transition-transform duration-300 group-hover:scale-[1.02]`}>
                  <span className="flex h-full items-center justify-center text-[13px] font-semibold uppercase tracking-[0.2em] text-white/85">
                    {project.name.slice(0, 2).toUpperCase()}
                  </span>
                </span>
                <div className="flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-1 text-[15px] font-medium text-foreground group-hover:text-primary">
                      {project.name}
                    </h2>
                    <Badge variant="outline">{project.members.length}</Badge>
                  </div>
                  <p className="line-clamp-2 mt-1 min-h-10 text-[13px] text-muted">
                    {stripRichHtml(project.description ?? "") || t("home.noDescription")}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {shown.map((m) => (
                        <Avatar
                          key={m.user.id}
                          name={m.user.name}
                          email={m.user.email}
                          size="sm"
                        />
                      ))}
                      {extra > 0 && (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] text-muted ring-1 ring-inset ring-border">
                          +{extra}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted">
                      {t("home.updatedAgo")} {timeAgo(project.updatedAt)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>{t("home.create")}</DialogTitle>
              <DialogDescription>
                {t("home.dialogDescSub")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 px-5 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project-name">{t("home.dialogName")}</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("home.namePh")}
                  required
                  minLength={2}
                  maxLength={120}
                  autoFocus
                  data-testid="project-name-input"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project-desc">{t("home.dialogDesc")}</Label>
                <Textarea
                  id="project-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("home.descPh")}
                  maxLength={600}
                  className="min-h-16"
                />
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
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                {t("home.cancel")}
              </Button>
              <Button type="submit" disabled={busy} data-testid="project-submit">
                {busy && <LoaderCircle size={13} className="animate-spin" />}
                {t("home.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
