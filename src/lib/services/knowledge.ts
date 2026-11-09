import { Types } from "mongoose";
import { cached } from "@/lib/cache";
import { ProjectModel, TicketModel } from "@/lib/models";
import type { SessionUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";

/* ------------------------------- DTOs ------------------------------ */

export type GraphNodeKind = "project" | "ticket" | "member" | "question";

export interface GraphNodeDTO {
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** Column key for tickets; role for members. Drives the node colour. */
  state: string;
  /** Relative node radius driver (4–22). */
  weight: number;
  /** Human one-liner shown in the detail panel. */
  meta: string;
}

export interface GraphLinkDTO {
  source: string;
  target: string;
  kind: "contains" | "member_of" | "assigned" | "needs_answer";
}

export interface ScoreFactorDTO {
  label: string;
  /** Weight share (e.g. 0.4). */
  weight: number;
  /** Raw ratio 0..1 achieved for this factor. */
  value: number;
  /** Points contributed = weight * 100 * value. */
  points: number;
}

export interface ProjectScoreDTO {
  projectId: string;
  name: string;
  score: number; // 0..100
  factors: ScoreFactorDTO[];
  tickets: number;
}

export interface KnowledgeGraphDTO {
  nodes: GraphNodeDTO[];
  links: GraphLinkDTO[];
  scores: ProjectScoreDTO[];
  summary: {
    projects: number;
    tickets: number;
    members: number;
    questionsTotal: number;
    answersTotal: number;
    commentsTotal: number;
  };
}

/* ----------------------------- internals --------------------------- */

interface LeanProjectAgg {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  members: Array<{
    userId: { _id?: Types.ObjectId; name?: string; email?: string; globalRole?: string } | null;
    role: string;
  }>;
}

interface LeanTicketAgg {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  assigneeId: Types.ObjectId | null;
  assigneeIds?: Types.ObjectId[];
  review?: { status?: string | null };
  questions?: Array<{ prompt?: string; required?: boolean; answers?: unknown[] }>;
  activity?: Array<{ type?: string; createdAt: Date }>;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Project health score (0–100), fully deterministic and explainable:
 *   Delivery   40%  done tickets / all tickets
 *   Review     20%  approved / (reviewed tickets), neutral 0.5 when none
 *   Feedback   25%  client question coverage (answered/total), neutral 0.5
 *   Momentum   15%  activity freshness within the last 14 days
 * score = Σ weight·100·value, rounded.
 */
export function scoreProject(input: {
  total: number;
  done: number;
  approved: number;
  reviewed: number;
  questionsTotal: number;
  questionsAnswered: number;
  lastActivityAt: Date | null;
}): { score: number; factors: ScoreFactorDTO[] } {
  const delivery = clamp01(input.total === 0 ? 0 : input.done / input.total);
  const review =
    input.reviewed === 0 ? 0.5 : clamp01(input.approved / input.reviewed);
  const feedback =
    input.questionsTotal === 0
      ? 0.5
      : clamp01(input.questionsAnswered / input.questionsTotal);
  const daysSince = input.lastActivityAt
    ? (Date.now() - new Date(input.lastActivityAt).getTime()) / 86_400_000
    : 30;
  const momentum = clamp01(1 - Math.max(0, daysSince) / 14);

  const factors: ScoreFactorDTO[] = [
    { label: "Delivery", weight: 0.4, value: delivery, points: Math.round(40 * delivery) },
    { label: "Review health", weight: 0.2, value: review, points: Math.round(20 * review) },
    { label: "Client feedback", weight: 0.25, value: feedback, points: Math.round(25 * feedback) },
    { label: "Momentum (14d)", weight: 0.15, value: momentum, points: Math.round(15 * momentum) },
  ];
  const score = factors.reduce((acc, f) => acc + f.points, 0);
  return { score, factors };
}

/* ------------------------------ service ---------------------------- */

/**
 * Obsidian-style knowledge graph over the workspace: projects, tickets,
 * members and unanswered *required* questions - with explainable health
 * scores per project. Admins see everything; team roles see their projects.
 */
/**
 * Building block of the knowledge graph (full projects + tickets + members
 * scan). Wrapped by getKnowledgeGraph below for the read-through TTL cache.
 */
async function buildKnowledgeGraph(user: SessionUser): Promise<KnowledgeGraphDTO> {
  await connectDB();

  const projectFilter =
    user.globalRole === "admin"
      ? {}
      : { "members.userId": new Types.ObjectId(user.id) };

  const projects = (await ProjectModel.find(projectFilter)
    .populate({ path: "members.userId", select: "name email globalRole" })
    .lean()) as unknown as LeanProjectAgg[];

  const projectIds = projects.map((p) => p._id);
  const tickets = (await TicketModel.find({ projectId: { $in: projectIds } })
    .sort({ createdAt: 1 })
    .lean()) as unknown as LeanTicketAgg[];

  const nodes: GraphNodeDTO[] = [];
  const links: GraphLinkDTO[] = [];
  const scores: ProjectScoreDTO[] = [];

  const summary = {
    projects: projects.length,
    tickets: tickets.length,
    members: new Set<string>(),
    questionsTotal: 0,
    answersTotal: 0,
    commentsTotal: 0,
  };

  const memberScore = new Map<string, { name: string; assigned: number }>();

  for (const p of projects) {
    const pid = p._id.toString();
    nodes.push({
      id: `project:${pid}`,
      kind: "project",
      label: p.name,
      state: "project",
      weight: 16,
      meta: p.description || "Project",
    });

    for (const m of p.members ?? []) {
      const mu = m.userId;
      if (!mu?._id) continue;
      const uid = String(mu._id);
      const nodeId = `member:${uid}`;
      summary.members.add(uid);
      if (!nodes.some((n) => n.id === nodeId)) {
        nodes.push({
          id: nodeId,
          kind: "member",
          label: mu.name ?? "Member",
          state: m.role,
          weight: 7,
          meta: `${mu.email ?? ""} · ${m.role}`,
        });
        memberScore.set(uid, { name: mu.name ?? "Member", assigned: 0 });
      }
      links.push({ source: nodeId, target: `project:${pid}`, kind: "member_of" });
    }

    // score inputs
    let total = 0;
    let done = 0;
    let reviewed = 0;
    let approved = 0;
    let lastActivityAt: Date | null = null;
    let questionsTotal = 0;
    let questionsAnswered = 0;

    const ptickets = tickets.filter((t) => t.projectId.toString() === pid);

    // ticket + question nodes
    for (const t of ptickets) {
      const tid = `ticket:${t._id.toString()}`;
      total += 1;
      if (t.status === "done") done += 1;
      const urgentBoost = t.priority === "urgent" ? 3 : 0;
      const overdue = t.status !== "done" && t.dueDate && new Date(t.dueDate).getTime() < Date.now();
      nodes.push({
        id: tid,
        kind: "ticket",
        label: t.title,
        state: t.status,
        weight: 5 + urgentBoost,
        meta: `${t.status}${overdue ? " · overdue" : ""} · ${t.priority}`,
      });
      links.push({ source: `project:${pid}`, target: tid, kind: "contains" });
      // Round-34: link EVERY assignee to the ticket.
      const assigneeOids = (t.assigneeIds ?? []).length
        ? (t.assigneeIds ?? [])
        : t.assigneeId
          ? [t.assigneeId]
          : [];
      for (const aidOid of assigneeOids) {
        const aid = `member:${aidOid.toString()}`;
        links.push({ source: aid, target: tid, kind: "assigned" });
        const row = memberScore.get(aid);
        if (row) row.assigned += 1;
      }
      for (let qi = 0; qi < (t.questions ?? []).length; qi++) {
        const q = (t.questions ?? [])[qi];
        questionsTotal += 1;
        const answered = (q.answers ?? []).length;
        summary.answersTotal += answered;
        if (answered > 0) questionsAnswered += 1;
        // Only UNANSWERED required questions become attention nodes - the
        // graph visualises friction, not every stored question.
        if ((q.required ?? false) && answered === 0) {
          // Key by the question INDEX inside its ticket - a running counter
          // would collide when one ticket holds several unanswered questions.
          const qid = `question:${t._id.toString()}:${qi}`;
          nodes.push({
            id: qid,
            kind: "question",
            label: q.prompt ?? "Question",
            state: "needs_answer",
            weight: 3,
            meta: `Unanswered required question · ticket "${t.title}"`,
          });
          links.push({ source: qid, target: tid, kind: "needs_answer" });
        }
      }
      for (const a of t.activity ?? []) {
        summary.commentsTotal += a.type === "comment" ? 1 : 0;
        const at = new Date(a.createdAt);
        if (!lastActivityAt || at > lastActivityAt) lastActivityAt = at;
      }
    }

    // review health straight from the embedded review field
    reviewed = ptickets.filter((t) => t.review?.status != null).length;
    approved = ptickets.filter((t) => t.review?.status === "approved").length;

    const { score, factors } = scoreProject({
      total,
      done,
      approved,
      reviewed,
      questionsTotal,
      questionsAnswered,
      lastActivityAt,
    });
    scores.push({ projectId: pid, name: p.name, score, factors, tickets: total });
  }

  // questionsTotal must count ALL questions, not only per-project loop above -
  // already accumulated inside the loop; fix summary questionsTotal:
  summary.questionsTotal = 0;
  for (const t of tickets) {
    summary.questionsTotal += (t.questions ?? []).length;
    for (const q of t.questions ?? []) summary.answersTotal += (q.answers ?? []).length;
  }

  return {
    nodes,
    links,
    scores,
    summary: {
      projects: summary.projects,
      tickets: summary.tickets,
      members: summary.members.size,
      questionsTotal: summary.questionsTotal,
      answersTotal: summary.answersTotal,
      commentsTotal: summary.commentsTotal,
    },
  };
}

/**
 * Knowledge graph for the graph view - the heaviest read in the app (full
 * collection scans + graph assembly per request otherwise). Cached read-through
 * for 5 minutes; ANY ticket/project/user write drops it instantly (Mongoose
 * middleware) so the graph reflects your own edits, and cross-user edits land
 * at most 5 min later. Per-user keys keep RBAC scoping intact.
 */
export function getKnowledgeGraph(user: SessionUser): Promise<KnowledgeGraphDTO> {
  return cached(`knowledge:${user.id}`, 300_000, () => buildKnowledgeGraph(user));
}
