/**
 * Client-safe shared constants + DTO types.
 * This file must NOT import server-only modules (mongoose, etc.) -
 * it is imported from both server and client components.
 */

export const COLUMN_KEYS = ["todo", "in_progress", "in_review", "done"] as const;
export type ColumnKey = (typeof COLUMN_KEYS)[number];

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PROJECT_ROLES = ["admin", "team", "client"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

/** Notification categories (round-34). Generic on purpose: the UI composes
 *  sentences like "user A mentioned you in ticket X" from these + params. */
export const NOTIFICATION_TYPES = [
  "comment",
  "mention",
  "status_change",
  "assignment",
  "feedback_requested",
  "feedback_approved",
  "feedback_changes",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];


export const GLOBAL_ROLES = ["admin", "team", "client"] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];

export const REVIEW_STATUSES = [
  "approved",
  "under_review",
  "changes_requested",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Client verification questions created dynamically by admin/team. */
export const QUESTION_TYPES = ["choice", "text"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

/** Hard cap on attachments per ticket (UI + zod share this). */
export const MAX_TOTAL_ATTACHMENTS = 5;
/** Hard cap on images inside one rich-text body (comment/review/description). */
export const MAX_EDITOR_IMAGES = 5;

export const ACTIVITY_TYPES = [
  "created",
  "edited",
  "moved",
  "comment",
  "attachment",
  "review",
  "deleted",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/* ------------------------------- DTOs ------------------------------ */

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  globalRole: GlobalRole;
}

export interface MemberDTO {
  user: UserDTO;
  role: ProjectRole;
  addedAt: string;
}

export interface ActivityDTO {
  id: string;
  type: ActivityType;
  actorId: string | null;
  actorName: string;
  from: ColumnKey | null;
  to: ColumnKey | null;
  note: string;
  review: ReviewStatus | null;
  attachmentName: string;
  /** Round-35: user ids that hearted this comment/feedback (one per user). */
  hearts?: string[];
  createdAt: string;
}

export interface AttachmentDTO {
  id: string;
  key: string;
  name: string;
  size: number;
  contentType: string;
  /** Download URL (direct R2 URL when configured, else auth-checked /api/files). */
  url: string;
  isImage: boolean;
  createdAt: string;
}

export interface TicketReviewDTO {
  status: ReviewStatus | null;
  note: string;
  reviewedById: string | null;
  reviewedAt: string | null;
}

export interface QuestionAnswerDTO {
  userId: string;
  /** Selected option indexes (choice type); empty for text answers. */
  choiceIndexes: number[];
  /** Free text typed for an option marked "with text input" (e.g. Other). */
  optionTexts: Array<{ index: number; text: string }>;
  /** Free-text answer (text type); empty for choice answers. */
  text: string;
  answeredAt: string;
}

export interface TicketQuestionDTO {
  id: string;
  prompt: string;
  type: QuestionType;
  /** Option labels for choice questions (empty for text questions). */
  options: string[];
  /** choice only: client may pick several options (checkboxes) or one (radio). */
  allowMultiple: boolean;
  /** Option indexes whose selection opens a free-text input (e.g. "Other"). */
  textOptionIndexes: number[];
  /** Must be answered before the ticket can be approved. */
  required: boolean;
  createdById: string;
  createdAt: string;
  answers: QuestionAnswerDTO[];
}

export interface TicketDTO {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: ColumnKey;
  order: number;
  /** Legacy single assignee (first of assigneeIds) kept for old consumers. */
  assigneeId: string | null;
  /** Round-34: multi-assignee support - one ticket, many members/roles. */
  assigneeIds: string[];
  priority: Priority;
  dueDate: string | null;
  /** Server-computed: due date passed while not done. */
  overdue: boolean;
  attachments: AttachmentDTO[];
  activity: ActivityDTO[];
  review: TicketReviewDTO;
  /** Dynamic client-verification questions (accordion in ticket modal). */
  questions: TicketQuestionDTO[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

/** Round-34 notification row (bell + dropdown). Generic type + fields let the
 *  UI compose localized sentences without new i18n keys per activity. */
export interface NotificationDTO {
  id: string;
  type: import("./types").NotificationType;
  seen: boolean;
  project: { id: string; name: string };
  ticket: { id: string; title: string } | null;
  /** Target column for status_change notifications. */
  statusTo: string | null;
  actor: { id: string; name: string };
  createdAt: string;
}

/** Quick-add question template configured by admin/team per project. */
export interface ProjectDefaultQuestionDTO {
  prompt: string;
  type: "choice" | "text";
  options: Array<{ label: string; withText: boolean }>;
  allowMultiple: boolean;
  required: boolean;
}

/** Optional curated gallery URL rendered behind a project's kanban wall. */
export interface ProjectDTO {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: MemberDTO[];
  backgroundUrl: string | null;
  /** Card header gradient preset key (PROJECT_GRADIENTS); null = name-hash. */
  gradientKey: string | null;
  /** Admin/team default question set for the ticket quick-add button. */
  defaultQuestions: ProjectDefaultQuestionDTO[];
  createdAt: string;
  updatedAt: string;
}
