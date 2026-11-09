import { Types } from "mongoose";
import { cached } from "@/lib/cache";
import { ProjectModel, TicketModel } from "@/lib/models";
import type { ColumnKey, Priority } from "@/lib/types";
import { COLUMN_KEYS, PRIORITIES } from "@/lib/types";
import type { SessionUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";

/* ------------------------------- DTOs ------------------------------ */

export interface StatsDayPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface AssigneeStat {
  userId: string;
  name: string;
  total: number;
  done: number;
}

export interface ProjectStatMini {
  id: string;
  name: string;
  tickets: number;
  done: number;
}

export interface OrgStatsDTO {
  totals: {
    projects: number;
    tickets: number;
    members: number;
    clients: number;
    overdue: number;
    openQuestions: number; // required questions with zero answers
  };
  byStatus: Array<{ key: ColumnKey; count: number }>;
  byPriority: Array<{ key: Priority; count: number }>;
  byReview: Array<{ name: string; value: number }>;
  createdPerDay: StatsDayPoint[]; // last 14 days
  activityPerDay: StatsDayPoint[]; // last 14 days
  clientResponse: {
    questionsTotal: number;
    questionsAnswered: number;
    answersTotal: number;
    coverageRate: number; // 0..1: answered/total questions
  };
  overdueTitles: Array<{ title: string; projectName: string; dueDate: string }>;
  topAssignees: AssigneeStat[];
  avgHoursToDone: number | null;
  perProject: ProjectStatMini[];
}

/* ----------------------------- internals --------------------------- */

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* ------------------------------ service ---------------------------- */

/**
 * Building block of the workspace stats (multi-pipeline MongoDB aggregation).
 * Wrapped by getOrgStats below for the read-through TTL cache.
 */
async function buildOrgStats(user: SessionUser): Promise<OrgStatsDTO> {
  await connectDB();

  const projectFilter =
    user.globalRole === "admin"
      ? {}
      : { "members.userId": new Types.ObjectId(user.id) };

  const projects = (await ProjectModel.find(projectFilter)
    .populate({ path: "members.userId", select: "name email globalRole" })
    .lean()) as unknown as Array<{
    _id: Types.ObjectId;
    name: string;
    members: Array<{
      userId: { _id?: Types.ObjectId; name?: string; email?: string; globalRole?: string };
      role: string;
    }>;
  }>;

  const projectIds = projects.map((p) => p._id);
  const projectById = new Map(projects.map((p) => [p._id.toString(), p]));

  const tickets = (await TicketModel.find({ projectId: { $in: projectIds } })
    .sort({ createdAt: 1 })
    .lean()) as unknown as Array<{
    _id: Types.ObjectId;
    projectId: Types.ObjectId;
    title: string;
    status: string;
    priority: string;
    assigneeId: Types.ObjectId | null;
    assigneeIds?: Types.ObjectId[];
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    questions?: Array<{ required?: boolean; answers?: unknown[] }>;
    activity?: Array<{ type?: string; to?: string; createdAt: Date }>;
  }>;

  /* ------------------------- counters ------------------------- */

  const byStatus = new Map<ColumnKey, number>(COLUMN_KEYS.map((k) => [k, 0]));
  const byPriority = new Map<Priority, number>(PRIORITIES.map((k) => [k, 0]));
  const reviewCounts = { approved: 0, under_review: 0, changes_requested: 0, none: 0 };

  let questionsTotal = 0;
  let questionsAnswered = 0;
  let answersTotal = 0;
  let requiredOpen = 0;

  const memberIds = new Set<string>();
  let clientCount = 0;

  for (const p of projects) {
    for (const m of p.members ?? []) {
      const uid = m.userId;
      const idStr = uid?._id ? String(uid._id) : "";
      if (idStr) memberIds.add(idStr);
      if (m.role === "client") clientCount += 1;
    }
  }

  for (const t of tickets) {
    byStatus.set((t.status as ColumnKey) ?? "todo", (byStatus.get((t.status as ColumnKey) ?? "todo") ?? 0) + 1);
    byPriority.set((t.priority as Priority) ?? "medium", (byPriority.get((t.priority as Priority) ?? "medium") ?? 0) + 1);
  }

  // Review split is computed over review-enabled tickets via activity-independent field
  const reviewRaw = await TicketModel.aggregate<{ _id: string | null; count: number }>([
    { $match: { projectId: { $in: projectIds } } },
    { $group: { _id: "$review.status", count: { $sum: 1 } } },
  ]);
  for (const row of reviewRaw) {
    const key = (row._id ?? "none") as keyof typeof reviewCounts;
    reviewCounts[key] = row.count;
  }

  /* --------------------- daily buckets (14d) -------------------- */

  const today = new Date();
  const days: string[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(today.getTime() - i * 86_400_000);
    days.push(dayKey(d));
  }
  const createdBuckets = new Map(days.map((d) => [d, 0]));
  const activityBuckets = new Map(days.map((d) => [d, 0]));
  const firstDay = new Date(`${days[0]}T00:00:00.000Z`).getTime();

  for (const t of tickets) {
    const ck = dayKey(new Date(t.createdAt));
    if (createdBuckets.has(ck)) createdBuckets.set(ck, (createdBuckets.get(ck) ?? 0) + 1);
  }
  // activity count needs full activity arrays - aggregate cheaply
  const activityRaw = await TicketModel.aggregate<{ _id: string; count: number }>([
    { $match: { projectId: { $in: projectIds } } },
    { $unwind: "$activity" },
    { $match: { "activity.createdAt": { $gte: new Date(firstDay) } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$activity.createdAt" } }, count: { $sum: 1 } } },
  ]);
  for (const row of activityRaw) {
    if (activityBuckets.has(row._id)) activityBuckets.set(row._id, row.count);
  }

  /* ------------------ questions / client response ------------------ */

  for (const t of tickets) {
    for (const q of t.questions ?? []) {
      questionsTotal += 1;
      const answered = (q.answers ?? []).length;
      if (answered > 0) questionsAnswered += 1;
      answersTotal += answered;
      if ((q.required ?? false) && answered === 0) requiredOpen += 1;
    }
  }

  /* --------------------------- overdue --------------------------- */

  const now = Date.now();
  const overdueTitles: OrgStatsDTO["overdueTitles"] = [];
  for (const t of tickets) {
    if (t.status !== "done" && t.dueDate && new Date(t.dueDate).getTime() < now) {
      const project = projectById.get(t.projectId.toString());
      overdueTitles.push({
        title: t.title,
        projectName: project?.name ?? "-",
        dueDate: new Date(t.dueDate).toISOString().slice(0, 10),
      });
    }
  }
  overdueTitles.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  /* ------------------------- top assignees ------------------------ */

  const assigneeMap = new Map<string, { name: string; total: number; done: number }>();
  for (const t of tickets) {
    // Round-34: count EVERY assignee (legacy single field mirrors list[0]).
    const ids = (t.assigneeIds ?? []).length
      ? (t.assigneeIds ?? []).map(String)
      : t.assigneeId
        ? [String(t.assigneeId)]
        : [];
    for (const key of ids) {
      const row = assigneeMap.get(key) ?? { name: key, total: 0, done: 0 };
      row.total += 1;
      if (t.status === "done") row.done += 1;
      assigneeMap.set(key, row);
    }
  }
  // resolve names via project members
  const nameById = new Map<string, string>();
  for (const p of projects) {
    for (const m of p.members ?? []) {
      const uid = m.userId;
      if (uid?._id) nameById.set(String(uid._id), uid.name ?? "Member");
    }
  }
  const topAssignees: AssigneeStat[] = [...assigneeMap.entries()]
    .map(([userId, row]) => ({ userId, name: nameById.get(userId) ?? "Member", total: row.total, done: row.done }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  /* --------------------- avg hours to done ------------------------ */

  let doneHoursSum = 0;
  let doneCount = 0;
  for (const t of tickets) {
    if (t.status !== "done") continue;
    const doneEntries = (t.activity ?? []).filter((a) => a.to === "done");
    const latest = doneEntries.reduce<number>(
      (acc, a) => Math.max(acc, new Date(a.createdAt).getTime()),
      0,
    );
    if (latest > 0) {
      doneHoursSum += (latest - new Date(t.createdAt).getTime()) / 3_600_000;
      doneCount += 1;
    }
  }

  /* --------------------------- per project ------------------------- */

  const perProject: ProjectStatMini[] = projects.map((p) => {
    const pts = tickets.filter((t) => t.projectId.toString() === p._id.toString());
    return {
      id: p._id.toString(),
      name: p.name,
      tickets: pts.length,
      done: pts.filter((t) => t.status === "done").length,
    };
  });

  return {
    totals: {
      projects: projects.length,
      tickets: tickets.length,
      members: memberIds.size,
      clients: clientCount,
      overdue: overdueTitles.length,
      openQuestions: requiredOpen,
    },
    byStatus: COLUMN_KEYS.map((k) => ({ key: k, count: byStatus.get(k) ?? 0 })),
    byPriority: PRIORITIES.map((k) => ({ key: k, count: byPriority.get(k) ?? 0 })),
    byReview: [
      { name: "Approved", value: reviewCounts.approved ?? 0 },
      { name: "Under review", value: reviewCounts.under_review ?? 0 },
      { name: "Changes requested", value: reviewCounts.changes_requested ?? 0 },
      { name: "Not reviewed", value: reviewCounts.none ?? 0 },
    ],
    createdPerDay: days.map((date) => ({ date, count: createdBuckets.get(date) ?? 0 })),
    activityPerDay: days.map((date) => ({ date, count: activityBuckets.get(date) ?? 0 })),
    clientResponse: {
      questionsTotal,
      questionsAnswered,
      answersTotal,
      coverageRate: questionsTotal === 0 ? 0 : questionsAnswered / questionsTotal,
    },
    overdueTitles: overdueTitles.slice(0, 5),
    topAssignees,
    avgHoursToDone: doneCount === 0 ? null : Math.round((doneHoursSum / doneCount) * 10) / 10,
    perProject,
  };
}

/**
 * Workspace statistics for admins/team leads. Global admins see every
 * project; team roles see projects they belong to.
 *
 * Cached read-through (in-process TTL): analytics is a derived, read-mostly
 * aggregate recomputing several pipelines per request otherwise. TTL is 2
 * minutes; ANY ticket/project/user write drops it instantly (Mongoose
 * middleware), so own edits are always visible and cross-user edits appear
 * at most TTL later. Per-user keys keep RBAC scoping intact.
 */
export function getOrgStats(user: SessionUser): Promise<OrgStatsDTO> {
  return cached(`org-stats:${user.id}`, 120_000, () => buildOrgStats(user));
}