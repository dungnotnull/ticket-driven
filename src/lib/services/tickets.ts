import { Types } from "mongoose";
import { UserModel, TicketModel, ProjectModel } from "@/lib/models";
import type { ActivityType, ColumnKey, Priority, TicketDTO } from "@/lib/types";
import { PRIORITY_LABELS } from "@/lib/types";
import { serializeTicket, type LeanTicket } from "@/lib/serialize";
import { ApiError, badRequest, notFound } from "@/lib/api";
import { getProjectAccess } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import type {
  AnswerQuestionInput,
  CommentInput,
  CreateQuestionInput,
  CreateTicketInput,
  MoveInput,
  ReviewInput,
  UpdateQuestionInput,
  UpdateTicketInput,
} from "@/lib/validation";

const { ObjectId } = Types;

interface ActivityEntry {
  type: ActivityType;
  actorId: Types.ObjectId;
  actorName: string;
  from?: string;
  to?: string;
  note?: string;
  review?: string;
  attachmentName?: string;
  createdAt: Date;
}

interface AttachmentRecord {
  key: string;
  url: string;
  name: string;
  size: number;
  contentType: string;
  uploadedById: Types.ObjectId;
  createdAt: Date;
}

const ID_REGEX = /^[a-f\d]{24}$/i;

function actorEntries(user: SessionUser): Pick<ActivityEntry, "actorId" | "actorName"> {
  return { actorId: new ObjectId(user.id), actorName: user.name };
}

async function nextOrder(projectId: Types.ObjectId, status: ColumnKey): Promise<number> {
  const [row] = await TicketModel.aggregate<{ max?: number }>([
    { $match: { projectId, status } },
    { $group: { _id: null, max: { $max: "$order" } } },
  ]).limit(1);
  return (row?.max ?? -1) + 1;
}

/** Load a single ticket by id, without access checks (callers enforce RBAC). */
export async function getTicketOrThrow(id: string): Promise<LeanTicket> {
  if (!ID_REGEX.test(id)) throw notFound("Ticket not found.");
  const ticket = (await TicketModel.findById(id).lean()) as unknown as
    | LeanTicket
    | null;
  if (!ticket) throw notFound("Ticket not found.");
  return ticket;
}

/** Assignee must be an active member of the ticket's project. */
function assertAssignee(
  projectMembers: Array<{ userId: unknown }>,
  assigneeId: string | null | undefined,
) {
  if (!assigneeId) return;
  if (!ID_REGEX.test(assigneeId)) throw badRequest("Invalid assignee.");
  const ok = projectMembers.some((m) => String(m.userId) === assigneeId);
  if (!ok) throw badRequest("The assignee must be a member of this project.");
}

/** Load a single ticket (read-level access enforced). */
export async function getTicket(
  user: SessionUser,
  ticketId: string,
): Promise<TicketDTO> {
  await connectDB();
  const ticket = await getTicketOrThrow(ticketId);
  await getProjectAccess(ticket.projectId.toString(), "read", user);
  return serializeTicket(ticket);
}

/* ------------------------------- list ------------------------------ */

export async function listTickets(  user: SessionUser,
  params: {
    projectId: string;
    assigneeId?: string;
    status?: ColumnKey;
  },
): Promise<TicketDTO[]> {
  await connectDB();
  const { project } = await getProjectAccess(params.projectId, "read", user);
  const filter: Record<string, unknown> = { projectId: project._id };
  if (params.assigneeId) filter.assigneeId = params.assigneeId;
  if (params.status) filter.status = params.status;
  const docs = (await TicketModel.find(filter)
    .sort({ order: 1, createdAt: 1 })
    .lean()) as unknown as LeanTicket[];
  return docs.map(serializeTicket);
}

/* ------------------------------- create ---------------------------- */

export async function createTicket(
  user: SessionUser,
  input: CreateTicketInput,
): Promise<TicketDTO> {
  await connectDB();
  const { project } = await getProjectAccess(input.projectId, "write", user);
  const members = (await ProjectModel.findById(project._id)
    .select("members")
    .lean())?.members as unknown as Array<{ userId: unknown }> | undefined;

  assertAssignee(members ?? [], input.assigneeId);
  if (input.dueDate && Number.isNaN(Date.parse(input.dueDate))) {
    throw badRequest("Invalid due date.");
  }

  const status = input.status;
  const base: Record<string, unknown> = {
    projectId: project._id,
    title: input.title,
    description: input.description ?? "",
    status,
    order: await nextOrder(project._id, status),
    assigneeId: input.assigneeId ? new ObjectId(input.assigneeId) : undefined,
    priority: input.priority,
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    createdById: new ObjectId(user.id),
  };

  const attachmentRecords: AttachmentRecord[] = [];
  for (const a of input.attachments ?? []) {
    if (!a.key.startsWith(`tickets/${project._id.toString()}/`)) {
      throw new ApiError(400, "Attachment key does not belong to this project.");
    }
    attachmentRecords.push({
      key: a.key,
      url: a.url ?? "",
      name: a.name,
      size: a.size,
      contentType: a.contentType,
      uploadedById: new ObjectId(user.id),
      createdAt: new Date(),
    });
  }

  const entries: ActivityEntry[] = [
    { type: "created", ...actorEntries(user), createdAt: new Date() },
    ...attachmentRecords.map((a) => ({
      type: "attachment" as ActivityType,
      ...actorEntries(user),
      attachmentName: a.name,
      createdAt: new Date(),
    })),
  ];
  if ((input.questions ?? []).length > 0) {
    entries.push({
      type: "edited",
      ...actorEntries(user),
      note: `added ${input.questions!.length} client question${input.questions!.length === 1 ? "" : "s"} with this ticket`,
      createdAt: new Date(),
    });
  }

  const created = await TicketModel.create({
    ...base,
    attachments: attachmentRecords,
    activity: entries,
    // Verification questions authored together with the ticket (create mode).
    questions: (input.questions ?? []).map((q) => ({
      prompt: q.prompt,
      type: q.type,
      options: q.options ?? [],
      allowMultiple: q.allowMultiple ?? false,
      textOptionIndexes: (q.textOptionIndexes ?? []).filter(
        (i) => i < (q.options?.length ?? 0),
      ),
      required: q.required ?? false,
      createdById: new ObjectId(user.id),
      createdAt: new Date(),
      answers: [],
    })),
  } as never);

  const lean = (await TicketModel.findById(created._id)
    .lean()) as unknown as LeanTicket;
  return serializeTicket(lean);
}

/* ------------------------------- update ---------------------------- */

export async function updateTicket(
  user: SessionUser,
  ticketId: string,
  input: UpdateTicketInput,
): Promise<TicketDTO> {
  await connectDB();
  const ticket = await getTicketOrThrow(ticketId);
  const { project } = await getProjectAccess(
    ticket.projectId.toString(),
    "write",
    user,
  );

  const members = (await ProjectModel.findById(project._id)
    .select("members")
    .lean())?.members as unknown as Array<{ userId: unknown }> | undefined;
  if (input.assigneeId !== undefined) {
    assertAssignee(members ?? [], input.assigneeId);
  }

  const set: Record<string, unknown> = {};
  if (input.title !== undefined) set.title = input.title;
  if (input.description !== undefined) set.description = input.description;
  if (input.priority !== undefined) set.priority = input.priority;
  if (input.dueDate !== undefined) {
    set.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }
  if (input.assigneeId !== undefined) {
    set.assigneeId = input.assigneeId ? new ObjectId(input.assigneeId) : null;
  }

  const now = new Date();
  const entries: ActivityEntry[] = [];
  const truncate = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n)}…` : s);

  // Granular change log: every meaningful field change gets its own entry.
  if (input.title !== undefined && input.title !== ticket.title) {
    entries.push({
      type: "edited",
      ...actorEntries(user),
      note: `changed the title: "${truncate(ticket.title)}" → "${truncate(input.title)}"`,
      createdAt: now,
    });
  }
  if (input.description !== undefined && (input.description ?? "") !== (ticket.description ?? "")) {
    entries.push({
      type: "edited",
      ...actorEntries(user),
      note: "updated the description",
      createdAt: now,
    });
  }
  if (input.priority !== undefined && input.priority !== ticket.priority) {
    const oldPriority: Priority = ["low", "medium", "high", "urgent"].includes(ticket.priority ?? "")
      ? (ticket.priority as Priority)
      : "medium";
    entries.push({
      type: "edited",
      ...actorEntries(user),
      note: `changed priority: ${PRIORITY_LABELS[oldPriority]} → ${PRIORITY_LABELS[input.priority]}`,
      createdAt: now,
    });
  }
  if (input.dueDate !== undefined) {
    const oldDue = ticket.dueDate ? new Date(ticket.dueDate).toISOString().slice(0, 10) : null;
    const newDue = input.dueDate ? input.dueDate.slice(0, 10) : null;
    if (oldDue !== newDue) {
      entries.push({
        type: "edited",
        ...actorEntries(user),
        note: newDue ? `set the due date to ${newDue}` : "removed the due date",
        createdAt: now,
      });
    }
  }
  if (input.assigneeId !== undefined) {
    const oldId = ticket.assigneeId ? String(ticket.assigneeId) : null;
    const newId = input.assigneeId || null;
    if (newId !== oldId) {
      let assigneeName: string | null = null;
      if (newId) {
        const found = await UserModel.findById(newId).select("name").lean();
        assigneeName = (found as unknown as { name?: string } | null)?.name ?? "a member";
      }
      entries.push({
        type: "edited",
        ...actorEntries(user),
        note: newId ? `assigned this ticket to ${assigneeName}` : "unassigned this ticket",
        createdAt: now,
      });
    }
  }

  if (input.status && input.status !== ticket.status) {
    set.status = input.status;
    set.order = await nextOrder(project._id, input.status);
    entries.push({
      type: "moved",
      ...actorEntries(user),
      from: ticket.status,
      to: input.status,
      createdAt: now,
    });
  }

  // Full-replace attachment list when the client sends one.
  if (input.attachments !== undefined) {
    const existing = ticket.attachments ?? [];
    const existingKeys = new Set(existing.map((a) => a.key));
    const nextKeys = new Set(input.attachments.map((a) => a.key));
    const attachmentRecords: AttachmentRecord[] = [];
    for (const a of input.attachments) {
      if (!a.key.startsWith(`tickets/${project._id.toString()}/`)) {
        throw new ApiError(400, "Attachment key does not belong to this project.");
      }
      attachmentRecords.push({
        key: a.key,
        url: a.url ?? "",
        name: a.name,
        size: a.size,
        contentType: a.contentType,
        uploadedById: new ObjectId(user.id),
        createdAt: new Date(),
      });
      if (!existingKeys.has(a.key)) {
        entries.push({
          type: "attachment",
          ...actorEntries(user),
          attachmentName: a.name,
          createdAt: now,
        });
      }
    }
    for (const removed of existing) {
      if (!nextKeys.has(removed.key)) {
        entries.push({
          type: "attachment",
          ...actorEntries(user),
          attachmentName: removed.name,
          note: `removed the attachment "${removed.name}"`,
          createdAt: now,
        });
      }
    }
    set.attachments = attachmentRecords;
  }

  if (Object.keys(set).length === 0 && entries.length === 0) {
    return serializeTicket(ticket);
  }

  const update: Record<string, unknown> = { $set: set };
  if (entries.length > 0) update.$push = { activity: { $each: entries } };

  const updated = (await TicketModel.findByIdAndUpdate(ticket._id, update, {
    returnDocument: "after",
  }).lean()) as unknown as LeanTicket;
  return serializeTicket(updated);
}

/* ------------------------------- move ------------------------------ */

/** Bulk reorder/move used by the Kanban DnD flow (write access). */
export async function moveTickets(
  user: SessionUser,
  input: MoveInput,
): Promise<{ ok: true }> {
  await connectDB();
  const ids = input.updates.map((u) => new ObjectId(u.id));
  const docs = (await TicketModel.find({ _id: { $in: ids } })
    .lean()) as unknown as LeanTicket[];
  if (docs.length === 0) throw notFound("Ticket not found.");

  const projectIdSet = new Set(docs.map((t) => t.projectId.toString()));
  if (projectIdSet.size !== 1) {
    throw badRequest("Moves must stay within a single project.");
  }
  await getProjectAccess(docs[0].projectId.toString(), "write", user);

  const byId = new Map(docs.map((t) => [t._id.toString(), t]));
  const now = new Date();

  const operations = input.updates.map((u) => {
    const ticket = byId.get(u.id);
    if (!ticket || ticket.status === u.status) {
      const set: Record<string, unknown> = { order: u.order };
      return {
        updateOne: {
          filter: { _id: byId.get(u.id)?._id ?? new ObjectId(u.id) },
          update: { $set: set },
        },
      };
    }
    return {
      updateOne: {
        filter: { _id: byId.get(u.id)!._id },
        update: {
          $set: { status: u.status, order: u.order },
          $push: {
            activity: {
              type: "moved",
              ...actorEntries(user),
              from: ticket.status,
              to: u.status,
              createdAt: now,
            },
          },
        },
      } as never,
    };
  });

  await TicketModel.bulkWrite(operations as never);
  return { ok: true };
}

/* ------------------------------ review ----------------------------- */

/**
 * Client review workflow (strict spec rules):
 *  - only project members with role "client" can review,
 *  - "changes_requested" REQUIRES a note and moves the ticket to In Progress,
 *  - "approved" moves the ticket to Done (note optional),
 *  - "under_review" keeps the current column.
 */
export async function reviewTicket(
  user: SessionUser,
  ticketId: string,
  input: ReviewInput,
): Promise<TicketDTO> {
  await connectDB();
  const ticket = await getTicketOrThrow(ticketId);
  await getProjectAccess(ticket.projectId.toString(), "review", user);

  const note = (input.note ?? "").trim();
  if (input.review === "changes_requested" && note.length === 0) {
    throw badRequest("A note explaining the requested changes is required.");
  }

  if (input.review === "approved") {
    const blocking = (ticket.questions ?? []).filter(
      (q) => (q.required ?? false) && (q.answers ?? []).length === 0,
    ).length;
    if (blocking > 0) {
      throw badRequest(
        `${blocking} required question${blocking === 1 ? " is" : "s are"} still unanswered - the client must answer before approval.`,
      );
    }
  }

  const now = new Date();
  const previousStatus = (ticket.status ?? "todo") as ColumnKey;
  const newStatus: ColumnKey =
    input.review === "approved"
      ? "done"
      : input.review === "changes_requested"
        ? "in_progress"
        : previousStatus;

  const set: Record<string, unknown> = {
    review: {
      status: input.review,
      note,
      reviewedById: new ObjectId(user.id),
      reviewedAt: now,
    },
  };

  if (newStatus !== previousStatus) {
    set.status = newStatus;
    set.order = await nextOrder(ticket.projectId, newStatus);
  }

  const updated = (await TicketModel.findByIdAndUpdate(
    ticket._id,
    {
      $set: set,
      $push: {
        activity: {
          type: "review",
          ...actorEntries(user),
          from: previousStatus,
          to: newStatus === previousStatus ? undefined : newStatus,
          review: input.review,
          note,
          createdAt: now,
        } satisfies Partial<ActivityEntry>,
      },
    },
    { returnDocument: "after" },
  ).lean()) as unknown as LeanTicket;
  return serializeTicket(updated);
}

/* ------------------------------ comment ----------------------------- */

export async function addComment(
  user: SessionUser,
  ticketId: string,
  input: CommentInput,
): Promise<TicketDTO> {
  await connectDB();
  const ticket = await getTicketOrThrow(ticketId);
  await getProjectAccess(ticket.projectId.toString(), "read", user);

  const updated = (await TicketModel.findByIdAndUpdate(
    ticket._id,
    {
      $push: {
        activity: {
          type: "comment",
          ...actorEntries(user),
          note: input.body,
          createdAt: new Date(),
        } satisfies Partial<ActivityEntry>,
      },
    },
    { returnDocument: "after" },
  ).lean()) as unknown as LeanTicket;
  return serializeTicket(updated);
}

/* ------------------------------ delete ------------------------------ */

export async function deleteTicket(
  user: SessionUser,
  ticketId: string,
): Promise<void> {
  await connectDB();
  const ticket = await getTicketOrThrow(ticketId);
  await getProjectAccess(ticket.projectId.toString(), "write", user);
  await TicketModel.deleteOne({ _id: ticket._id });
}

/* --------------------- client verification questions --------------------- */

/**
 * Admin/team attach dynamic verification questions to a ticket. Three shapes
 * are supported: choice questions with radios (single pick) or checkboxes
 * (multi pick), and free-text questions - all rendered as an accordion.
 */
export async function createTicketQuestion(
  user: SessionUser,
  ticketId: string,
  input: CreateQuestionInput,
): Promise<TicketDTO> {
  await connectDB();
  const ticket = await getTicketOrThrow(ticketId);
  await getProjectAccess(ticket.projectId.toString(), "write", user);

  const updated = (await TicketModel.findByIdAndUpdate(
    ticket._id,
    {
      $push: {
        questions: {
          prompt: input.prompt,
          type: input.type,
          options: input.options ?? [],
          allowMultiple: input.allowMultiple ?? false,
          textOptionIndexes: (input.textOptionIndexes ?? []).filter(
            (i) => i < (input.options?.length ?? 0),
          ),
          required: input.required ?? false,
          createdById: new ObjectId(user.id),
          createdAt: new Date(),
          answers: [],
        },
        activity: {
          type: "edited",
          ...actorEntries(user),
          note: `added a question: "${(input.prompt ?? "").slice(0, 80)}"`,
          createdAt: new Date(),
        } satisfies Partial<ActivityEntry>,
      },
    },
    { returnDocument: "after" },
  ).lean()) as unknown as LeanTicket;
  return serializeTicket(updated);
}

/**
 * Anyone who can read the ticket may answer (the workflow targets clients,
 * but admins/team can contribute too). One answer per member per question -
 * re-answering replaces the previous answer. The answers array is replaced
 * atomically via arrayFilters (no hydrated subdoc mutation).
 */
export async function answerTicketQuestion(
  user: SessionUser,
  ticketId: string,
  questionId: string,
  input: AnswerQuestionInput,
): Promise<TicketDTO> {
  await connectDB();
  const ticket = await getTicketOrThrow(ticketId);
  await getProjectAccess(ticket.projectId.toString(), "read", user);

  if (!ID_REGEX.test(questionId)) throw notFound("Question not found.");
  const question = (ticket.questions ?? []).find(
    (q) => String(q._id) === questionId,
  );
  if (!question) throw notFound("Question not found.");

  let nextAnswers: Array<{
    userId: Types.ObjectId;
    choiceIndexes: number[];
    optionTexts: Array<{ index: number; text: string }>;
    text: string;
    answeredAt: Date;
  }>;

  if (question.type === "choice") {
    const indexes = [...new Set(input.choiceIndexes ?? [])];
    if (indexes.length === 0) {
      throw badRequest("Select at least one option.");
    }
    if (indexes.some((i) => i >= (question.options?.length ?? 0))) {
      throw badRequest("Invalid option.");
    }
    if (indexes.length > 1 && !question.allowMultiple) {
      throw badRequest("This question allows only one choice.");
    }

    // Options marked "with text input" require a non-empty note when selected.
    const textEnabled = new Set((question.textOptionIndexes ?? []).map(Number));
    const provided = new Map(
      (input.optionTexts ?? [])
        .filter((t) => (t.text ?? "").trim().length > 0)
        .map((t) => [t.index, t.text.trim()]),
    );
    const optionTexts: Array<{ index: number; text: string }> = [];
    for (const index of indexes.filter((i) => textEnabled.has(i))) {
      const value = provided.get(index);
      if (!value) {
        throw badRequest(
          `"${question.options?.[index] ?? "This option"}" asks for details - write a short note.`,
        );
      }
      optionTexts.push({ index, text: value });
    }

    nextAnswers = (question.answers ?? [])
      .filter((a) => String(a.userId) !== user.id)
      .map((a) => ({
        userId: new ObjectId(String(a.userId)),
        choiceIndexes: [...(a.choiceIndexes ?? [])],
        optionTexts: (a.optionTexts ?? []).map((t) => ({
          index: Number(t.index),
          text: t.text ?? "",
        })),
        text: a.text ?? "",
        answeredAt: a.answeredAt ?? new Date(),
      }));
    nextAnswers.push({
      userId: new ObjectId(user.id),
      choiceIndexes: indexes,
      optionTexts,
      text: "",
      answeredAt: new Date(),
    });
  } else {
    const text = (input.text ?? "").trim();
    if (!text) throw badRequest("Write an answer first.");
    nextAnswers = (question.answers ?? [])
      .filter((a) => String(a.userId) !== user.id)
      .map((a) => ({
        userId: new ObjectId(String(a.userId)),
        choiceIndexes: [...(a.choiceIndexes ?? [])],
        optionTexts: (a.optionTexts ?? []).map((t) => ({
          index: Number(t.index),
          text: t.text ?? "",
        })),
        text: a.text ?? "",
        answeredAt: a.answeredAt ?? new Date(),
      }));
    nextAnswers.push({ userId: new ObjectId(user.id), choiceIndexes: [], optionTexts: [], text, answeredAt: new Date() });
  }

  const qid = new ObjectId(questionId);
  const priorAnswer = (question.answers ?? []).some((a) => String(a.userId) === user.id);
  const now = new Date();
  const updated = (await TicketModel.findOneAndUpdate(
    { _id: ticket._id, "questions._id": qid },
    {
      $set: { "questions.$[q].answers": nextAnswers },
      $push: {
        activity: {
          type: "edited",
          ...actorEntries(user),
          note: `${priorAnswer ? "updated their answer to" : "answered"} the question: "${question.prompt?.slice(0, 80)}"`,
          createdAt: now,
        } satisfies Partial<ActivityEntry>,
      },
    },
    { arrayFilters: [{ "q._id": qid }], returnDocument: "after" },
  ).lean()) as unknown as LeanTicket | null;

  if (!updated) throw notFound("Question not found.");
  return serializeTicket(updated);
}

/** Remove a question (and its answers) - admin/team only. */
export async function deleteTicketQuestion(
  user: SessionUser,
  ticketId: string,
  questionId: string,
): Promise<TicketDTO> {
  await connectDB();
  const ticket = await getTicketOrThrow(ticketId);
  await getProjectAccess(ticket.projectId.toString(), "write", user);
  if (!ID_REGEX.test(questionId)) throw notFound("Question not found.");

  const updated = (await TicketModel.findByIdAndUpdate(
    ticket._id,
    {
      $pull: { questions: { _id: new ObjectId(questionId) } },
      $push: {
        activity: {
          type: "edited",
          ...actorEntries(user),
          note: `removed the question: "${(ticket.questions ?? []).find((q) => String(q._id) === questionId)?.prompt?.slice(0, 80) ?? ""}"`,
          createdAt: new Date(),
        } satisfies Partial<ActivityEntry>,
      },
    },
    { returnDocument: "after" },
  ).lean()) as unknown as LeanTicket | null;
  if (!updated) throw notFound("Ticket not found.");
  return serializeTicket(updated);
}

/**
 * Edit a question at any time (prompt / options / text-enabled options /
 * single-vs-multi / required) - allowed even after clients answered.
 * Choice questions accept the full shape; text questions only accept
 * prompt/required edits. Edited options SANITIZE existing answers:
 * out-of-range picks and notes on no-longer-text options are dropped, and
 * answers left completely empty are removed so the required-before-approval
 * guard stays honest.
 */
export async function updateTicketQuestion(
  user: SessionUser,
  ticketId: string,
  questionId: string,
  input: UpdateQuestionInput,
): Promise<TicketDTO> {
  await connectDB();
  const ticket = await getTicketOrThrow(ticketId);
  await getProjectAccess(ticket.projectId.toString(), "write", user);
  if (!ID_REGEX.test(questionId)) throw notFound("Question not found.");

  const question = (ticket.questions ?? []).find((q) => String(q._id) === questionId);
  if (!question) throw notFound("Question not found.");

  if (question.type === "text") {
    if (input.options !== undefined || input.textOptionIndexes !== undefined || input.allowMultiple !== undefined) {
      throw badRequest("Text questions only support editing the wording and the required rule.");
    }
  }

  const $set: Record<string, unknown> = {};
  let answersChanged = false;

  if (input.prompt !== undefined) {
    if (input.prompt.trim().length < 5) throw badRequest("The question must be at least 5 characters.");
    $set["questions.$[q].prompt"] = input.prompt.trim();
  }
  if (input.required !== undefined) {
    $set["questions.$[q].required"] = input.required;
  }

  if (question.type === "choice") {
    const options = input.options?.map((o) => o.trim()).filter(Boolean) ?? (question.options ?? []);
    if (options.length < 2) throw badRequest("A choice question needs at least 2 options.");
    const providedTexts = input.textOptionIndexes ?? (question.textOptionIndexes ?? []);
    const textOptionIndexes = providedTexts.filter((i) => i < options.length);
    const allowMultiple = input.allowMultiple ?? question.allowMultiple;

    const structureChanged =
      JSON.stringify(options) !== JSON.stringify(question.options ?? []) ||
      JSON.stringify(textOptionIndexes) !== JSON.stringify(question.textOptionIndexes ?? []) ||
      allowMultiple !== question.allowMultiple;

    if (input.options !== undefined) $set["questions.$[q].options"] = options;
    if (input.textOptionIndexes !== undefined) $set["questions.$[q].textOptionIndexes"] = textOptionIndexes;
    if (input.allowMultiple !== undefined) $set["questions.$[q].allowMultiple"] = allowMultiple;

    if (structureChanged) {
      // Sanitize every existing answer against the new option set.
      const nextAnswers = (question.answers ?? [])
        .map((answer) => {
          const choiceIndexes = (answer.choiceIndexes ?? []).filter((i) => i < options.length);
          const kept = new Set(choiceIndexes);
          const optionTexts = (answer.optionTexts ?? []).filter((t) => {
            const idx = Number(t.index);
            return (
              Number.isInteger(idx) &&
              idx >= 0 &&
              idx < options.length &&
              textOptionIndexes.includes(idx) &&
              kept.has(idx) &&
              (t.text ?? "").trim().length > 0
            );
          });
          return {
            userId: answer.userId,
            choiceIndexes,
            optionTexts,
            text: answer.text ?? "",
            answeredAt: answer.answeredAt ?? new Date(),
          };
        })
        .filter((a) => a.choiceIndexes.length > 0); // a pick with no valid options is no answer
      $set["questions.$[q].answers"] = nextAnswers;
      answersChanged = true;
    }
  }

  if (Object.keys($set).length === 0) {
    return serializeTicket(ticket); // nothing to change
  }

  const qid = new ObjectId(questionId);
  const finalPrompt = (input.prompt ?? question.prompt ?? "").slice(0, 80);
  const updated = (await TicketModel.findOneAndUpdate(
    { _id: ticket._id, "questions._id": qid },
    {
      $set,
      $push: {
        activity: {
          type: "edited",
          ...actorEntries(user),
          note: `updated the question: "${finalPrompt}"`,
          createdAt: new Date(),
        } satisfies Partial<ActivityEntry>,
      },
    },
    { arrayFilters: [{ "q._id": qid }], returnDocument: "after" },
  ).lean()) as unknown as LeanTicket | null;
  if (!updated) throw notFound("Question not found.");
  void answersChanged;
  return serializeTicket(updated);
}
