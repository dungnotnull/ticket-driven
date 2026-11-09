import { Types, isValidObjectId } from "mongoose";
import { NotificationModel, ProjectModel, UserModel } from "../models";
import { connectDB } from "../db";
import type { NotificationType } from "../types";
import { serializeNotification } from "../serialize";

/* ------------------------------------------------------------------ */
/* Recipient resolution                                                */
/* ------------------------------------------------------------------ */

/**
 * Project-member recipients for notifications: every member EXCEPT the
 * actor and global admins (the admin role opted out of notifications to
 * keep the system light - requirement round-34).
 */
export async function notificationRecipients(projectId: string): Promise<string[]> {
  const project = await ProjectModel.findById(projectId)
    .select("members")
    .lean();
  if (!project) return [];
  const memberIds = (project.members as unknown as Array<{ userId: Types.ObjectId }>).map((m) =>
    m.userId.toString(),
  );
  const nonAdminUsers = await UserModel.find({
    _id: { $in: memberIds },
    globalRole: { $ne: "admin" },
  })
    .select("_id")
    .lean();
  return nonAdminUsers.map((u) => u._id.toString());
}

/* ------------------------------------------------------------------ */
/* Core dispatch                                                       */
/* ------------------------------------------------------------------ */

export interface NotifyInput {
  projectId: string;
  projectName: string;
  actorId: string;
  actorName: string;
  type: NotificationType;
  ticketId?: string | null;
  ticketTitle?: string | null;
  /** status_change only: target column key. */
  statusTo?: string | null;
}

const EMPTY_NAME = "A member";

/**
 * Insert one notification per recipient (never notifies the actor). Fire and
 * forget by design: notification failures must NEVER break the main write -
 * callers wrap this in void with a .catch().
 */
export async function pushNotifications(input: NotifyInput): Promise<void> {
  try {
    await connectDB();
    const recipients = await notificationRecipients(input.projectId);
    const targets = recipients.filter((id) => id !== input.actorId);
    if (targets.length === 0) return;
    const docs = targets.map((userId) => ({
      userId: new Types.ObjectId(userId),
      projectId: new Types.ObjectId(input.projectId),
      projectName: input.projectName ?? "",
      ticketId: input.ticketId ? new Types.ObjectId(input.ticketId) : undefined,
      ticketTitle: input.ticketTitle ?? "",
      actorId: new Types.ObjectId(input.actorId),
      actorName: input.actorName || EMPTY_NAME,
      type: input.type,
      statusTo: input.statusTo ?? undefined,
    }));
    await NotificationModel.insertMany(docs, { ordered: false });
  } catch {
    // Silent by design (see docstring).
  }
}

/* ------------------------------------------------------------------ */
/* @-mention resolution                                                */
/* ------------------------------------------------------------------ */

/**
 * Scan free text for @tokens and resolve them against the PROJECT MEMBERS
 * (the requirement: you can only tag people assigned to that project).
 * A token matches a member when it equals their email (ci) or equals their
 * full name (ci) or the first word of their name (ci).
 */
export async function resolveMentionedUserIds(
  projectId: string,
  text: string,
): Promise<string[]> {
  const tokens = (text.match(/@[\w.+-]+/g) ?? []).map((t) => t.slice(1).toLowerCase());
  if (tokens.length === 0) return [];
  const recipients = await notificationRecipients(projectId);
  if (recipients.length === 0) return [];
  const users = await UserModel.find({ _id: { $in: recipients } })
    .select("name email")
    .lean();
  const matched = new Set<string>();
  for (const u of users) {
    const name = (u.name ?? "").toLowerCase();
    const email = (u.email ?? "").toLowerCase();
    const firstName = name.split(/\s+/)[0] ?? "";
    if (tokens.some((tok) => tok === email || (name.length > 0 && tok === name) || (firstName.length >= 3 && tok === firstName))) {
      matched.add(u._id.toString());
    }
  }
  return [...matched];
}

/** Strip HTML tags for mention scanning (comments are rich HTML). */
export function plainTextForMentions(html: string): string {
  // Block-level separators keep `@name` tokens intact across tags.
  const withSpaces = html.replace(/<[^>]+>/g, " ");
  // Decode the handful of entities the editor emits.
  return withSpaces
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

/**
 * Mention-aware comment dispatch: mentioned users get a `mention`
 * notification, everyone else in the project gets the generic `comment`.
 */
export async function dispatchCommentNotifications(params: {
  projectId: string;
  projectName: string;
  actorId: string;
  actorName: string;
  ticketId: string;
  ticketTitle: string;
  commentHtml: string;
}): Promise<void> {
  try {
    await connectDB();
    const mentioned = await resolveMentionedUserIds(
      params.projectId,
      plainTextForMentions(params.commentHtml),
    );
    const recipients = await notificationRecipients(params.projectId);
    const targets = recipients.filter((id) => id !== params.actorId);
    const mentionSet = new Set(mentioned);
    const mentions = targets.filter((id) => mentionSet.has(id));
    const others = targets.filter((id) => !mentionSet.has(id));
    const base = {
      projectId: new Types.ObjectId(params.projectId),
      projectName: params.projectName,
      ticketId: new Types.ObjectId(params.ticketId),
      ticketTitle: params.ticketTitle,
      actorId: new Types.ObjectId(params.actorId),
      actorName: params.actorName || EMPTY_NAME,
    };
    const docs: Array<Record<string, unknown>> = [];
    for (const id of mentions) {
      docs.push({ ...base, userId: new Types.ObjectId(id), type: "mention" });
    }
    for (const id of others) {
      docs.push({ ...base, userId: new Types.ObjectId(id), type: "comment" });
    }
    if (docs.length > 0) {
      await NotificationModel.insertMany(docs, { ordered: false });
    }
  } catch {
    // Silent by design.
  }
}

/* ------------------------------------------------------------------ */
/* Reads / mutations for the bell                                      */
/* ------------------------------------------------------------------ */

export async function listNotifications(
  userId: string,
  opts: { seen?: "all" | "unread" | "read"; limit?: number } = {},
): Promise<ReturnType<typeof serializeNotification>[]> {
  await connectDB();
  const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
  if (opts.seen === "unread") filter.seen = false;
  if (opts.seen === "read") filter.seen = true;
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
  const docs = await NotificationModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.map((d) => serializeNotification(d as never));
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  await connectDB();
  return NotificationModel.countDocuments({
    userId: new Types.ObjectId(userId),
    seen: false,
  });
}

export async function setNotificationSeen(
  userId: string,
  id: string,
  seen: boolean,
): Promise<boolean> {
  await connectDB();
  if (!isValidObjectId(id)) return false;
  const res = await NotificationModel.updateOne(
    { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
    { $set: { seen, seenAt: seen ? new Date() : null } },
  );
  return res.matchedCount > 0;
}

export async function markAllNotificationsSeen(userId: string): Promise<number> {
  await connectDB();
  const res = await NotificationModel.updateMany(
    { userId: new Types.ObjectId(userId), seen: false },
    { $set: { seen: true, seenAt: new Date() } },
  );
  return res.modifiedCount;
}

/** Cron helper: delete seen notifications older than `days` (default 30). */
export async function purgeSeenNotifications(days = 30): Promise<number> {
  await connectDB();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const res = await NotificationModel.deleteMany({
    seen: true,
    seenAt: { $lte: cutoff },
  });
  return res.deletedCount ?? 0;
}
