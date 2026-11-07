"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import type { KnowledgeGraphDTO, GraphNodeDTO } from "@/lib/services/knowledge";

/* ------------------------- force simulation ------------------------- */

interface SimNode extends SimulationNodeDatum {
  id: string;
  kind: GraphNodeDTO["kind"];
  label: string;
  state: string;
  weight: number;
  meta: string;
}

const KIND_FILL: Record<GraphNodeDTO["kind"], Record<string, string>> = {
  project: { project: "var(--primary, #4f46e5)" },
  ticket: {
    todo: "var(--status-todo, #64748b)",
    in_progress: "var(--status-progress, #2563eb)",
    in_review: "var(--status-review, #d97706)",
    done: "var(--status-done, #16a34a)",
  },
  member: {
    admin: "#312e81",
    team: "#4338ca",
    client: "#7c8db5",
  },
  question: { needs_answer: "var(--danger, #dc2626)" },
};

const LINK_COLOR: Record<string, string> = {
  contains: "var(--border-strong, #d5d8e0)",
  member_of: "var(--border, #e7e9ee)",
  assigned: "var(--status-progress, #2563eb)",
  needs_answer: "var(--danger, #dc2626)",
};

function buildLayout(graph: KnowledgeGraphDTO): Map<string, { x: number; y: number }> {
  const simNodes: SimNode[] = graph.nodes.map((n, i) => ({
    ...n,
    x: Math.cos((i / Math.max(graph.nodes.length, 1)) * Math.PI * 2) * 180,
    y: Math.sin((i / Math.max(graph.nodes.length, 1)) * Math.PI * 2) * 120,
  }));
  const simLinks: SimulationLinkDatum<SimNode>[] = graph.links.map((l) => ({
    source: l.source,
    target: l.target,
  }));
  const index = new Map(simNodes.map((n) => [n.id, n]));
  const nodeOf = (ref: string | number | SimNode | null | undefined): SimNode | undefined => {
    if (typeof ref === "string") return index.get(ref);
    if (typeof ref === "number") return simNodes[ref];
    return ref ?? undefined;
  };

  const sim = forceSimulation<SimNode>(simNodes)
    .force(
      "link",
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
        .id((d) => d.id)
        .distance((l) => {
          const s = nodeOf(l.source)?.kind;
          const t = nodeOf(l.target)?.kind;
          if (s === "question" || t === "question") return 34;
          if (s === "project" || t === "project") return 78;
          return 56;
        })
        .strength(0.6),
    )
    .force("charge", forceManyBody<SimNode>().strength(-190))
    .force("collide", forceCollide<SimNode>().radius((d) => d.weight + 4))
    .force("center", forceCenter(0, 0))
    .stop();

  sim.tick(280);
  return new Map(simNodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
}

/* ------------------------------ component --------------------------- */

const VIEW_W = 860;
const VIEW_H = 560;

export function KnowledgeGraphView({ graph }: { graph: KnowledgeGraphDTO }) {
  const { t } = useLang();
  // Force simulation coordinates drift at float-LSB level between the server
  // and the browser → compute layout client-side only (same hydration gate as
  // the dnd board) and render a skeleton pre-mount. useSyncExternalStore gate
  // mirrors board-workspace: server snapshot false, client snapshot true.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const positions = useMemo(
    () => (mounted ? buildLayout(graph) : new Map<string, { x: number; y: number }>()),
    [graph, mounted],
  );
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of graph.links) {
      if (!map.has(l.source)) map.set(l.source, new Set());
      if (!map.has(l.target)) map.set(l.target, new Set());
      map.get(l.source)!.add(l.target);
      map.get(l.target)!.add(l.source);
    }
    return map;
  }, [graph.links]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Stale selection (node vanished during a refetch) is simply ignored -
  // derived, so no state-clearing effect is needed.
  const selectedIdActive =
    selectedId !== null && graph.nodes.some((n) => n.id === selectedId)
      ? selectedId
      : null;

  const focus = selectedIdActive ?? hoverId;
  const neighbors = focus ? (adjacency.get(focus) ?? new Set<string>()) : null;
  const [x0, y0, x1, y1] = useMemo(() => {
    const xs = [...positions.values()].map((p) => p.x);
    const ys = [...positions.values()].map((p) => p.y);
    if (xs.length === 0) return [0, 0, VIEW_W, VIEW_H] as const;
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as const;
  }, [positions]);
  const pad = 80;
  const vb = `${x0 - pad} ${y0 - pad} ${Math.max(x1 - x0 + pad * 2, 1)} ${Math.max(y1 - y0 + pad * 2, 1)}`;

  const selected =
    selectedIdActive === null ? null : graph.nodes.find((n) => n.id === selectedIdActive) ?? null;
  const dim = (id: string) => focus && id !== focus && !neighbors?.has(id);

  return (
    <div className="flex flex-col gap-5" data-testid="knowledge-view">
      <div>
        <h1 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
          <BrainCircuit size={18} className="text-primary" />
          {t("kb.title")}
        </h1>
        <p className="text-[12.5px] text-muted">
          {t("kb.subtitle")}
        </p>
      </div>

      {graph.nodes.length === 0 ? (
        <div className="elev-card rounded-xl border border-border bg-surface px-6 py-10 text-center">
          <p className="text-[13px] font-medium">{t("kb.emptyTitle")}</p>
          <p className="mt-1 text-[12.5px] text-muted">
            {t("kb.emptySub")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
          {/* Graph panel */}
          <section className="elev-card overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5 text-[11px] text-muted">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--primary,#4f46e5)]" /> {t("kb.project")}</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--status-todo,#64748b)]" /> {t("kb.legendTodo")}</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--status-progress,#2563eb)]" /> {t("kb.legendInProgress")}</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--status-review,#d97706)]" /> {t("table.review")}</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--status-done,#16a34a)]" /> {t("kb.legendDone")}</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[var(--danger,#dc2626)]" /> {t("q.needsAnswer")}</span>
            </div>
            {mounted ? (
            <svg
              viewBox={vb}
              className="h-[440px] w-full"
              data-testid="knowledge-graph"
              role="img"
              aria-label={t("kb.graphLabel")}
            >
              {graph.links.map((l, i) => {
                const a = positions.get(l.source);
                const b = positions.get(l.target);
                if (!a || !b) return null;
                const highlighted =
                  focus && (l.source === focus || l.target === focus);
                const faded = focus && !highlighted;
                return (
                  <line
                    key={i}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={LINK_COLOR[l.kind] ?? "var(--border)"}
                    strokeWidth={highlighted ? 2 : 1}
                    strokeDasharray={l.kind === "needs_answer" ? "4 3" : undefined}
                    opacity={faded ? 0.18 : l.kind === "needs_answer" ? 0.9 : 0.7}
                  />
                );
              })}
              {graph.nodes.map((n) => {
                const p = positions.get(n.id);
                if (!p) return null;
                const isDim = dim(n.id);
                const fill = (KIND_FILL[n.kind]?.[n.state]) ?? "var(--primary)";
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x},${p.y})`}
                    className="cursor-pointer"
                    opacity={isDim ? 0.22 : 1}
                    onMouseEnter={() => setHoverId(n.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => setSelectedId(n.id === selectedId ? null : n.id)}
                    data-testid="knowledge-node"
                    data-node-kind={n.kind}
                  >
                    {n.kind === "question" && (
                      <circle r={n.weight + 6} fill="var(--danger, #dc2626)" opacity={0.15}>
                        <animate attributeName="r" values={`${n.weight + 4};${n.weight + 9};${n.weight + 4}`} dur="2.6s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle r={n.weight} fill={fill} stroke="var(--surface, #fff)" strokeWidth={1.5} />
                    <text
                      y={n.weight + 10}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--muted-foreground, #616b78)"
                      style={{ pointerEvents: "none" }}
                    >
                      {n.label.length > 22 ? `${n.label.slice(0, 22)}…` : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            ) : (
              <div className="flex h-[440px] w-full items-center justify-center rounded-lg bg-surface-2/50 text-[12px] text-muted">
                {t("kb.detailHint")}
              </div>
            )}
          </section>

          {/* Detail + scores panel */}
          <div className="flex flex-col gap-4">
            <section className="elev-card rounded-xl border border-border bg-surface px-4 py-3.5" data-testid="knowledge-detail">
              {selected ? (
                <>
                  <p className="flex items-center gap-2 text-[12px] text-muted">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: KIND_FILL[selected.kind]?.[selected.state] ?? "var(--primary)" }}
                    />
                    {selected.kind}
                  </p>
                  <h3 className="mt-1 text-[14px] font-semibold leading-snug">{selected.label}</h3>
                  <p className="mt-1 text-[12.5px] text-muted">{selected.meta}</p>
                  <p className="mt-2 text-[11.5px] text-muted">
                    {neighbors?.size ?? 0} {(neighbors?.size ?? 0) === 1 ? t("kb.connections") : t("kb.connectionsPlural")}
                  </p>
                  {selected.kind === "ticket" && (
                    <Link
                      href={`/projects/${selected.id.replace("ticket:", "").split(":")[0]}`}
                      className="mt-2 inline-block text-[12px] font-medium text-primary hover:underline"
                    >
                      {t("kb.openBoard")}
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-[12.5px] text-muted">
                  {t("kb.detailHint")}
                </p>
              )}
            </section>

            {/* Health scores + transparent formula */}
            <section className="elev-card rounded-xl border border-border bg-surface px-4 py-3.5" data-testid="knowledge-scores">
              <h3 className="text-[13px] font-medium">{t("kb.health")}</h3>
              <p className="mt-0.5 text-[11px] text-muted">
                {t("kb.formula")}
              </p>
              <div className="mt-3 flex flex-col gap-3">
                {graph.scores.map((s) => (
                  <div key={s.projectId}>
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="font-medium">{s.name}</span>
                      <span
                        className={cn(
                          "font-semibold",
                          s.score >= 70 ? "text-done" : s.score >= 40 ? "text-review" : "text-danger",
                        )}
                      >
                        {s.score}/100
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          s.score >= 70 ? "bg-done" : s.score >= 40 ? "bg-review" : "bg-danger",
                        )}
                        style={{ width: `${s.score}%` }}
                      />
                    </div>
                    <ul className="mt-1 grid grid-cols-2 gap-x-3 text-[10.5px] text-muted">
                      {s.factors.map((f) => (
                        <li key={f.label} className="flex justify-between">
                          <span>{f.label}</span>
                          <span className="tabular-nums">{f.points}/{Math.round(f.weight * 100)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-3 gap-2 text-center">
              {([
                { key: "kb.summaryProjects", value: graph.summary.projects },
                { key: "kb.summaryTickets", value: graph.summary.tickets },
                { key: "kb.summaryMembers", value: graph.summary.members },
                { key: "kb.summaryQuestions", value: graph.summary.questionsTotal },
                { key: "kb.summaryAnswers", value: graph.summary.answersTotal },
                { key: "kb.summaryComments", value: graph.summary.commentsTotal },
              ] as const).map((c) => (
                <div key={c.key} className="rounded-lg border border-border bg-surface px-2 py-2">
                  <p className="text-[15px] font-semibold leading-none">{c.value}</p>
                  <p className="mt-1 text-[10.5px] text-muted">{t(c.key)}</p>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
