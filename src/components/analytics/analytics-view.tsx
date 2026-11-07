"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  HelpCircle,
  Layers,
  MessageSquareText,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import type { OrgStatsDTO } from "@/lib/services/stats";

const STATUS_COLORS: Record<string, string> = {
  todo: "var(--status-todo, #64748b)",
  in_progress: "var(--status-progress, #2563eb)",
  in_review: "var(--status-review, #d97706)",
  done: "var(--status-done, #16a34a)",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#94a3b8",
  medium: "#4338ca",
  high: "#d97706",
  urgent: "#dc2626",
};

const REVIEW_COLORS = ["var(--status-done, #16a34a)", "var(--status-progress, #2563eb)", "var(--status-review, #d97706)", "var(--border-strong, #d5d8e0)"];

const GRID = "var(--border, #e7e9ee)";
const TEXT = "var(--muted-foreground, #616b78)";

const axisStyle = { fontSize: 11, fill: TEXT };
const tooltipStyle = {
  background: "var(--surface, #fff)",
  border: "1px solid var(--border, #e7e9ee)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--foreground, #14161b)",
  boxShadow: "var(--elev-card)",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

function Kpi({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tint?: string;
}) {
  return (
    <div className="elev-card rounded-xl border border-border bg-surface px-4 py-3.5" data-testid="stat-kpi">
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-md bg-surface-2", tint ?? "text-muted")}>
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-[11.5px] text-muted">{sub}</p>}
    </div>
  );
}

function Panel({
  title,
  hint,
  children,
  testid,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  testid?: string;
}) {
  return (
    <section className="elev-card rounded-xl border border-border bg-surface px-4 py-3.5" data-testid={testid}>
      <h3 className="text-[13px] font-medium">{title}</h3>
      {hint && <p className="mb-1 text-[11.5px] text-muted">{hint}</p>}
      <div className="mt-2 h-56">{children}</div>
    </section>
  );
}

export function AnalyticsView({ stats }: { stats: OrgStatsDTO }) {
  const { t } = useLang();
  const statusData = stats.byStatus.map((s) => ({ name: STATUS_LABEL[s.key], value: s.count, key: s.key }));
  const priorityData = stats.byPriority.map((p) => ({ name: p.key, value: p.count }));
  const coverage = Math.round(stats.clientResponse.coverageRate * 100);
  const openDone = stats.totals.tickets - (stats.byStatus.find((s) => s.key === "done")?.count ?? 0);

  return (
    <div className="flex flex-col gap-5" data-testid="analytics-view">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight">{t("an.title")}</h1>
        <p className="text-[12.5px] text-muted">
          {t("an.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<FolderKanban size={13} />} label={t("an.projects")} value={stats.totals.projects} sub={t("an.membersClients", { members: stats.totals.members, clients: stats.totals.clients })} />
        <Kpi icon={<Layers size={13} />} label={t("an.tickets")} value={stats.totals.tickets} sub={`${openDone} ${t("an.open")}`} />
        <Kpi icon={<CalendarClock size={13} />} label={t("an.overdue")} value={stats.totals.overdue} tint="text-danger" sub={t("an.overdueSub")} />
        <Kpi icon={<HelpCircle size={13} />} label={t("an.awaiting")} value={stats.totals.openQuestions} tint="text-review" sub={t("an.requiredSub")} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title={t("an.byColumn")} testid="stat-status">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} interval={0} />
              <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2, #f5f6f8)" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={46}>
                {statusData.map((d) => (
                  <Cell key={d.key} fill={STATUS_COLORS[d.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t("an.reviewOutcome")} hint={t("an.reviewHint")}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.byReview}
                dataKey="value"
                nameKey="name"
                innerRadius="52%"
                outerRadius="80%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {stats.byReview.map((_, i) => (
                  <Cell key={i} fill={REVIEW_COLORS[i]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t("an.created")} hint={t("an.createdHint")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.createdPerDay} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4338ca" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4338ca" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(5)} minTickGap={22} />
              <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke="#4338ca" strokeWidth={2} fill="url(#gradCreated)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t("an.activity")} hint={t("an.activityHint")}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.activityPerDay} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(5)} minTickGap={22} />
              <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="var(--status-done, #16a34a)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t("an.workload")} hint={t("an.workloadHint")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.topAssignees.map((a) => ({ name: a.name, total: a.total, done: a.done }))} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={92} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2, #f5f6f8)" }} />
              <Bar dataKey="total" fill="var(--border-strong, #d5d8e0)" radius={[0, 5, 5, 0]} maxBarSize={14} />
              <Bar dataKey="done" fill="var(--status-done, #16a34a)" radius={[0, 5, 5, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t("an.priorityMix")} hint={t("an.priorityHint")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)} />
              <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2, #f5f6f8)" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={46}>
                {priorityData.map((d) => (
                  <Cell key={d.name} fill={PRIORITY_COLORS[d.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="elev-card rounded-xl border border-border bg-surface px-4 py-3.5">
          <h3 className="text-[13px] font-medium">{t("an.clientResponse")}</h3>
          <p className="mb-2 text-[11.5px] text-muted">
            {t("an.verificationAnswered", { answered: stats.clientResponse.questionsAnswered, total: stats.clientResponse.questionsTotal })} ·{" "}
            {stats.clientResponse.answersTotal} {t("an.answeredTotal")}
          </p>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="bg-gradient-primary h-full rounded-full transition-[width] duration-500" style={{ width: `${coverage}%` }} />
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
            <MessageSquareText size={12} />
            {coverage}% {t("an.answeredPct")}
          </p>
        </section>

        <section className="elev-card rounded-xl border border-border bg-surface px-4 py-3.5">
          <h3 className="text-[13px] font-medium">{t("an.deliverySpeed")}</h3>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <Timer size={14} className="text-primary" />
            <span className="text-[22px] font-semibold leading-none tracking-tight">
              {stats.avgHoursToDone === null ? "-" : stats.avgHoursToDone}
            </span>
            <span className="text-[12px] text-muted">{t("an.avgHours")}</span>
          </p>
          <p className="mt-2 text-[11.5px] text-muted">
            {t("an.avgHoursSub")}
          </p>
        </section>

        <section className="elev-card rounded-xl border border-border bg-surface px-4 py-3.5">
          <h3 className="text-[13px] font-medium">{t("an.attention")}</h3>
          {stats.totals.overdue === 0 ? (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
              <CheckCircle2 size={13} className="text-done" />
              {t("an.nothingOverdue")}
            </p>
          ) : (
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {stats.overdueTitles.map((o) => (
                <li key={o.title} className="text-[12px]">
                  <span className="font-medium">{o.title}</span>
                  <span className="text-muted"> · {o.projectName} · {t("an.due")} {o.dueDate}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="elev-card rounded-xl border border-border bg-surface px-4 py-3.5">
        <h3 className="text-[13px] font-medium">{t("an.perProject")}</h3>
        <div className="mt-2 flex flex-col divide-y divide-border">
          {stats.perProject.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="press flex items-center justify-between px-1 py-2 text-[13px] transition-colors hover:text-primary"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-[12px] text-muted">
                {t("an.perProjectStat", { tickets: p.tickets, done: p.done })}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
