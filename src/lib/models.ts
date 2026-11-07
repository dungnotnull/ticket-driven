import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { invalidateReadCaches } from "@/lib/cache";
import {
  COLUMN_KEYS,
  GLOBAL_ROLES,
  PRIORITIES,
  PROJECT_ROLES,
  REVIEW_STATUSES,
} from "./types";

export {
  ALLOWED_ATTACHMENT_TYPES,
  COLUMN_KEYS,
  COLUMN_LABELS,
  GLOBAL_ROLES,
  MAX_ATTACHMENT_BYTES,
  PRIORITIES,
  PROJECT_ROLES,
  REVIEW_STATUSES,
} from "./types";
export type {
  ActivityType,
  ColumnKey,
  GlobalRole,
  Priority,
  ProjectRole,
  ReviewStatus,
} from "./types";

/* ------------------------------------------------------------------ */
/* Schemas                                                             */
/* ------------------------------------------------------------------ */

const ActivitySchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["created", "edited", "moved", "comment", "attachment", "review", "deleted"],
    },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String, default: "" },
    /** previous column key (moved / review auto-moves) */
    from: { type: String },
    /** new column key */
    to: { type: String },
    /** comment body, review note, or change description */
    note: { type: String, default: "" },
    review: { type: String, enum: [...REVIEW_STATUSES] },
    attachmentName: { type: String, default: "" },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true },
) as Schema;

const AttachmentSchema = new Schema(
  {
    /** Storage key unique per project: e.g. tickets/<projectId>/<token>/name.png */
    key: { type: String, required: true },
    /** Direct URL when R2_PUBLIC_BASE is configured; otherwise empty (served via /api/files). */
    url: { type: String, default: "" },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    contentType: { type: String, required: true },
    uploadedById: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true },
) as Schema;

const ReviewSchema = new Schema(
  {
    status: { type: String, enum: [...REVIEW_STATUSES] },
    note: { type: String, default: "" },
    reviewedById: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { _id: false },
) as Schema;

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    globalRole: { type: String, enum: [...GLOBAL_ROLES], default: "team", required: true },
  },
  { timestamps: true },
);

const MemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: [...PROJECT_ROLES],
      default: "client",
      required: true,
    },
    addedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
) as Schema;

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: { type: [MemberSchema], default: [] },
    /** Curated gallery background (allowlisted URL or null). */
    backgroundUrl: { type: String, default: null },
    /** Card header gradient preset; null falls back to the name-hash cover. */
    gradientKey: { type: String, default: null },
    /** Admin/team-configured quick-add question templates for new tickets
     *  (fully editable per project - never hard-coded in the UI). */
    defaultQuestions: [
      new Schema(
        {
          prompt: { type: String, required: true, trim: true, maxlength: 200 },
          type: { type: String, enum: ["choice", "text"], default: "choice" },
          /** Choice option label + whether picking it demands a short text. */
          options: [
            {
              label: { type: String, required: true, trim: true, maxlength: 120 },
              withText: { type: Boolean, default: false },
            },
          ],
          allowMultiple: { type: Boolean, default: false },
          required: { type: Boolean, default: false },
        },
        { _id: false },
      ),
    ],
  },
  { timestamps: true },
);

ProjectSchema.index({ "members.userId": 1 });

/* ---------------------- ticket (embedded questions) ---------------------- */

const QuestionAnswerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** Selected option indexes for choice questions. */
    choiceIndexes: { type: [Number], default: [] },
    /** Free text typed per selected text-enabled option (e.g. "Other"). */
    optionTexts: {
      type: [
        {
          index: { type: Number, required: true },
          text: { type: String, default: "", trim: true },
        },
      ],
      default: [],
      _id: false,
    },
    /** Free-text answer for text questions. */
    text: { type: String, default: "" },
    answeredAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
) as Schema;

const TicketQuestionSchema = new Schema(
  {
    prompt: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["choice", "text"],
      required: true,
    },
    /** Option labels (choice questions); empty for text questions. */
    options: { type: [String], default: [] },
    /** choice only: checkboxes (multi-select) instead of radio (single). */
    allowMultiple: { type: Boolean, default: false },
    /** Options whose selection reveals a free-text input (e.g. "Other"). */
    textOptionIndexes: { type: [Number], default: [] },
    /** Must be answered before the ticket can be approved. */
    required: { type: Boolean, default: false },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, required: true, default: Date.now },
    /** One answer per member (upserted by userId). */
    answers: { type: [QuestionAnswerSchema], default: [] },
  },
  { timestamps: false },
);

const TicketSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: [...COLUMN_KEYS],
      required: true,
      default: "todo",
    },
    order: { type: Number, required: true, default: 0 },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User" },
    priority: { type: String, enum: [...PRIORITIES], default: "medium" },
    dueDate: { type: Date },
    attachments: { type: [AttachmentSchema], default: [] },
    activity: { type: [ActivitySchema], default: [] },
    review: { type: ReviewSchema, default: undefined },
    questions: { type: [TicketQuestionSchema], default: [] },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

TicketSchema.index({ projectId: 1, status: 1, order: 1 });
TicketSchema.index({ projectId: 1, updatedAt: -1 });

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type UserDocData = InferSchemaType<typeof UserSchema>;
export type ProjectDocData = InferSchemaType<typeof ProjectSchema>;
export type TicketDocData = InferSchemaType<typeof TicketSchema>;

export type UserDocument = HydratedDocument<UserDocData>;
export type ProjectDocument = HydratedDocument<ProjectDocData>;
export type TicketDocument = HydratedDocument<TicketDocData>;

export type ActivityDoc = InferSchemaType<typeof ActivitySchema>;
export type AttachmentDoc = InferSchemaType<typeof AttachmentSchema>;
export type TicketQuestionDoc = InferSchemaType<typeof TicketQuestionSchema>;
export type QuestionAnswerDoc = InferSchemaType<typeof QuestionAnswerSchema>;

/* ------------------------------------------------------------------ */
/* Models (HMR-safe)                                                   */
/* ------------------------------------------------------------------ */

/* Any document write drops the derived-read caches (org stats / knowledge
   graph) so analytics never shows numbers older than the last mutation.
   Attached to the schemas BEFORE compiling the models (Mongoose rule). */
const WRITE_OPS = [
  "save",
  "updateOne",
  "findOneAndUpdate",
  "findOneAndDelete",
  "deleteOne",
  "bulkWrite",
] as const;

function attachCacheInvalidation(s: Schema): void {
  for (const op of WRITE_OPS) {
    // The union of write ops has no single Schema.post overload; all of
    // these are valid mongoose middleware hooks at runtime.
    s.post(op as never, () => invalidateReadCaches());
  }
}

attachCacheInvalidation(UserSchema);
attachCacheInvalidation(ProjectSchema);
attachCacheInvalidation(TicketSchema);

export const UserModel: Model<UserDocData> =
  models.User ?? model<UserDocData>("User", UserSchema);
export const ProjectModel: Model<ProjectDocData> =
  models.Project ?? model<ProjectDocData>("Project", ProjectSchema);
export const TicketModel: Model<TicketDocData> =
  models.Ticket ?? model<TicketDocData>("Ticket", TicketSchema);
