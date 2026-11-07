import { Types } from "mongoose";
import {
  ACTIVITY_TYPES,
  COLUMN_KEYS,
  GLOBAL_ROLES,
  PRIORITIES,
  QUESTION_TYPES,
  REVIEW_STATUSES,
  type ActivityDTO,
  type ActivityType,
  type AttachmentDTO,
  type ColumnKey,
  type MemberDTO,
  type Priority,
  type ProjectDTO,
  type ProjectRole,
  type QuestionType,
  type ReviewStatus,
  type TicketDTO,
  type TicketQuestionDTO,
  type UserDTO,
} from "./types";
import { downloadPath } from "./storage";

/* Lean (plain-object) shapes Mongoose returns from .lean() queries after
   populate. Cast query results with `as unknown as Lean...`. */

export interface LeanUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  globalRole?: string;
}

export interface LeanProject {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  backgroundUrl?: string | null;
  gradientKey?: string | null;
  defaultQuestions?: Array<{
    prompt: string;
    type?: string;
    options?: Array<{ label: string; withText?: boolean }>;
    allowMultiple?: boolean;
    required?: boolean;
  }>;
  members: Array<{
    userId: LeanUser | Types.ObjectId | null;
    role?: string;
    addedAt?: Date;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LeanTicket {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description?: string;
  status?: string;
  order?: number;
  assigneeId?: Types.ObjectId | null;
  priority?: string;
  dueDate?: Date | null;
  attachments?: Array<{
    _id: Types.ObjectId;
    key: string;
    url?: string;
    name: string;
    size: number;
    contentType: string;
    uploadedById?: Types.ObjectId | null;
    createdAt?: Date;
  }>;
  activity?: Array<{
    _id: Types.ObjectId;
    type: string;
    actorId?: Types.ObjectId | null;
    actorName?: string;
    from?: string;
    to?: string;
    note?: string;
    review?: string;
    attachmentName?: string;
    createdAt: Date;
  }>;
  review?: {
    status?: string | null;
    note?: string;
    reviewedById?: Types.ObjectId | null;
    reviewedAt?: Date | null;
  } | null;
  questions?: Array<{
    _id: Types.ObjectId;
    prompt: string;
    type?: string;
    options?: string[];
    allowMultiple?: boolean;
    textOptionIndexes?: number[];
    required?: boolean;
    createdById?: Types.ObjectId | null;
    createdAt?: Date;
    answers?: Array<{
      userId?: Types.ObjectId | null;
      choiceIndexes?: number[];
      optionTexts?: Array<{ index?: number; text?: string }>;
      text?: string;
      answeredAt?: Date;
    }>;
  }>;
  createdById?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/* ------------------------------ utils ----------------------------- */

const iso = (value?: Date | null): string => (value ? new Date(value).toISOString() : "");

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function pickEnumOrNull<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return allowed.includes(value as T) ? (value as T) : null;
}

export function serializeUser(doc: LeanUser): UserDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    globalRole: pickEnum(doc.globalRole, GLOBAL_ROLES, "team"),
  };
}

export function serializeProject(doc: LeanProject): ProjectDTO {
  const members: MemberDTO[] = (doc.members ?? [])
    .filter((m) => m.userId && typeof m.userId === "object")
    .map((m) => {
      const user = m.userId as LeanUser;
      return {
        user: serializeUser(user),
        role: pickEnum(m.role, ["admin", "team", "client"] as const, "client") as ProjectRole,
        addedAt: iso(m.addedAt),
      };
    });
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? "",
    ownerId: doc.ownerId?.toString() ?? "",
    backgroundUrl: typeof doc.backgroundUrl === "string" ? doc.backgroundUrl : null,
    /** "" (legacy auto-placeholder) and null both surface as null = auto. */
    gradientKey:
      typeof doc.gradientKey === "string" && doc.gradientKey
        ? doc.gradientKey
        : null,
    defaultQuestions: (doc.defaultQuestions ?? []).map((q) => ({
      prompt: q.prompt,
      type: pickEnum(q.type, ["choice", "text"] as const, "choice"),
      options: (q.options ?? []).map((o) => ({
        label: o.label,
        withText: o.withText === true,
      })),
      allowMultiple: q.allowMultiple === true,
      required: q.required === true,
    })),
    members,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  };
}

export function serializeTicket(doc: LeanTicket): TicketDTO {
  const attachments: AttachmentDTO[] = (doc.attachments ?? []).map((a) => ({
    id: a._id.toString(),
    key: a.key,
    name: a.name,
    size: a.size,
    contentType: a.contentType,
    url: a.url && a.url.length > 0 ? a.url : downloadPath(a.key),
    isImage: a.contentType.startsWith("image/"),
    createdAt: iso(a.createdAt),
  }));

  const activity: ActivityDTO[] = (doc.activity ?? []).map((entry) => ({
    id: entry._id.toString(),
    type: pickEnum(entry.type, ACTIVITY_TYPES, "edited" as ActivityType),
    actorId: entry.actorId ? entry.actorId.toString() : null,
    actorName: entry.actorName ?? "",
    from: pickEnumOrNull(entry.from, COLUMN_KEYS),
    to: pickEnumOrNull(entry.to, COLUMN_KEYS),
    note: entry.note ?? "",
    review: pickEnumOrNull(entry.review, REVIEW_STATUSES),
    attachmentName: entry.attachmentName ?? "",
    createdAt: iso(entry.createdAt),
  }));

  const priority = pickEnum(doc.priority, PRIORITIES, "medium" as Priority);
  const dueMillis = doc.dueDate ? new Date(doc.dueDate).getTime() : null;

  // Filter out _id-less subdocs written by raw tools (defensive, keeps keys stable).
  const questions: TicketQuestionDTO[] = (doc.questions ?? []).filter((q) => q._id).map((q) => ({
    id: q._id.toString(),
    prompt: q.prompt,
    type: pickEnum(q.type, QUESTION_TYPES, "text" as QuestionType),
    options: (q.options ?? []).map(String),
    allowMultiple: q.allowMultiple === true,
    textOptionIndexes: (q.textOptionIndexes ?? []).map(Number),
    required: q.required === true,
    createdById: q.createdById?.toString() ?? "",
    createdAt: iso(q.createdAt),
    answers: (q.answers ?? []).map((a) => ({
      userId: a.userId?.toString() ?? "",
      choiceIndexes: (a.choiceIndexes ?? []).map(Number),
      optionTexts: (a.optionTexts ?? [])
        .filter((t) => Number.isFinite(t.index))
        .map((t) => ({ index: Number(t.index), text: t.text ?? "" })),
      text: a.text ?? "",
      answeredAt: iso(a.answeredAt),
    })),
  }));

  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    title: doc.title,
    description: doc.description ?? "",
    status: pickEnum(doc.status, COLUMN_KEYS, "todo" as ColumnKey),
    order: doc.order ?? 0,
    assigneeId: doc.assigneeId ? doc.assigneeId.toString() : null,
    priority,
    dueDate: iso(doc.dueDate) || null,
    overdue:
      dueMillis !== null &&
      !Number.isNaN(dueMillis) &&
      dueMillis < Date.now() &&
      doc.status !== "done",
    attachments,
    activity,
    review: {
      status:
        doc.review?.status && (REVIEW_STATUSES as readonly string[]).includes(doc.review.status)
          ? (doc.review.status as ReviewStatus)
          : null,
      note: doc.review?.note ?? "",
      reviewedById: doc.review?.reviewedById?.toString() ?? null,
      reviewedAt: iso(doc.review?.reviewedAt) || null,
    },
    questions,
    createdById: doc.createdById?.toString() ?? "",
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  };
}
