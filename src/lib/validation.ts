import { z } from "zod";
import {
  ALLOWED_ATTACHMENT_TYPES,
  COLUMN_KEYS,
  GLOBAL_ROLES,
  MAX_ATTACHMENT_BYTES,
  PRIORITIES,
  PROJECT_ROLES,
  REVIEW_STATUSES,
} from "./models";
import { QUESTION_TYPES } from "./types";

const objectIdRegex = /^[a-f\d]{24}$/i;
export const objectIdSchema = z
  .string()
  .regex(objectIdRegex, "Invalid id format.");
const nullableObjectId = objectIdSchema.nullable().optional();

export const columnSchema = z.enum(COLUMN_KEYS);
export const projectRoleSchema = z.enum(PROJECT_ROLES);
export const globalRoleSchema = z.enum(GLOBAL_ROLES);
export const prioritySchema = z.enum(PRIORITIES);

/* ------------------------------ auth ------------------------------ */

/** Emails are trimmed, lowercased and validated once, everywhere. */
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address.").max(200));

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email: emailField,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required.").max(100),
});

/* ---------------------------- projects ---------------------------- */

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Project name is required.").max(120),
  description: z.string().trim().max(600).optional().default(""),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(600).optional(),
  /** Curated gallery URL or null/"" to clear; allowlist enforced in service. */
  backgroundUrl: z.string().max(500).nullish(),
  /** Card header gradient preset; allowlist enforced in service. */
  gradientKey: z.string().max(40).nullish(),
  /** Quick-add default question set (editable by admin/team, max 5 items). */
  defaultQuestions: z
    .array(
      z.object({
        prompt: z.string().trim().min(1).max(200),
        type: z.enum(["choice", "text"]).optional().default("choice"),
        options: z
          .array(
            z.object({
              label: z.string().trim().min(1).max(120),
              withText: z.boolean().optional().default(false),
            }),
          )
          .max(8)
          .optional()
          .default([]),
        allowMultiple: z.boolean().optional().default(false),
        required: z.boolean().optional().default(false),
      }),
    )
    .max(5)
    .nullish(),
});

export const addMemberSchema = z.object({
  email: emailField,
  role: projectRoleSchema,
});

export const updateMemberSchema = z.object({
  userId: objectIdSchema,
  role: projectRoleSchema,
});

export const removeMemberSchema = z.object({
  userId: objectIdSchema,
});

export const changeGlobalRoleSchema = z.object({
  userId: objectIdSchema,
  globalRole: globalRoleSchema,
});

/* ----------------------------- tickets ---------------------------- */

const isoDate = z
  .string()
  .min(4)
  .max(40)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date.");

export const attachmentInputSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(400)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._\-/]*$/, "Invalid storage key."),
  name: z.string().min(1).max(260),
  size: z.number().int().min(1).max(MAX_ATTACHMENT_BYTES),
  contentType: z.enum(ALLOWED_ATTACHMENT_TYPES),
  /** Direct R2 URL when the bucket has a public base; else empty. */
  url: z.string().max(600).optional().default(""),
});

/* --------------------- client verification questions --------------------- */
/* Declared before createTicketSchema (which embeds it for create-time authoring). */

export const createQuestionSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(5, "The question must be at least 5 characters.")
      .max(300),
    type: z.enum(QUESTION_TYPES),
    /** Choice questions carry 2–8 labelled options. */
    options: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
    /** choice only: allow the client to pick several options (checkboxes). */
    allowMultiple: z.boolean().default(false),
    /** Options whose selection reveals an extra free-text input (e.g. Other). */
    textOptionIndexes: z.array(z.number().int().min(0).max(7)).max(8).default([]),
    /** The client must answer before the ticket can be approved. */
    required: z.boolean().default(false),
  })
  .refine((d) => d.type !== "choice" || d.options.length >= 2, {
    message: "A choice question needs at least 2 options.",
    path: ["options"],
  })
  .refine(
    (d) => (d.textOptionIndexes ?? []).every((i) => i < (d.options?.length ?? 0)),
    { message: "Text-input options must reference existing options.", path: ["textOptionIndexes"] },
  );

export const createTicketSchema = z.object({
  projectId: objectIdSchema,
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(140),
  description: z.string().trim().max(20_000).optional().default(""),
  status: columnSchema.optional().default("todo"),
  assigneeId: nullableObjectId,
  priority: prioritySchema.optional().default("medium"),
  dueDate: isoDate.nullable().optional(),
  attachments: z.array(attachmentInputSchema).max(10).optional().default([]),
  /** Verification questions can be authored together with a new ticket. */
  questions: z.array(createQuestionSchema).max(20).optional().default([]),
});

export const updateTicketSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  description: z.string().trim().max(20_000).optional(),
  status: columnSchema.optional(),
  assigneeId: nullableObjectId,
  priority: prioritySchema.optional(),
  dueDate: isoDate.nullable().optional(),
  /** Full replacement of the attachment list (validated per entry). */
  attachments: z.array(attachmentInputSchema).max(10).optional(),
});

export const moveSchema = z.object({
  updates: z
    .array(
      z.object({
        id: objectIdSchema,
        status: columnSchema,
        order: z.number().int().min(0).max(1_000_000),
      }),
    )
    .min(1)
    .max(200),
});

export const reviewSchema = z.object({
  review: z.enum(REVIEW_STATUSES),
  /** Rich-note HTML (Tiptap); trim() keeps whitespace-only docs "empty".
   * HTML formatting inflates length -> generous cap, sanitizer strips tags
   * beyond the tiptap allowlist before persistence-adjacent rendering. */
  note: z.string().trim().max(8000).optional().default(""),
});

export const commentSchema = z.object({
  /** Rich-comment HTML (Tiptap) - min(1) blocks empty docs; cap for HTML. */
  body: z.string().trim().min(1, "Comment cannot be empty.").max(8000),
});

/** Admin/team may edit a question at any time - answers get sanitized.
 *  All fields optional: text-question edits only carry prompt/required. */
export const updateQuestionSchema = z
  .object({
    prompt: z.string().trim().min(5, "The question must be at least 5 characters.").max(300).optional(),
    options: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
    textOptionIndexes: z.array(z.number().int().min(0).max(7)).max(8).optional(),
    allowMultiple: z.boolean().optional(),
    required: z.boolean().optional(),
  })
  .refine((d) => d.options === undefined || d.options.length >= 2, {
    message: "A choice question needs at least 2 options.",
    path: ["options"],
  });

export const answerQuestionSchema = z.object({
  /** Selected option indexes (deduplicated, bounds-checked in the service). */
  choiceIndexes: z.array(z.number().int().min(0).max(7)).max(8).default([]),
  /** Text typed for each selected text-enabled option. */
  optionTexts: z
    .array(
      z.object({
        index: z.number().int().min(0).max(7),
        text: z.string().trim().min(1).max(500),
      }),
    )
    .max(8)
    .default([]),
  /** Free-text answer (required non-empty for text questions). */
  text: z.string().trim().max(2000).default(""),
});

/* ----------------------------- uploads ---------------------------- */

export const presignSchema = z.object({
  projectId: objectIdSchema,
  fileName: z.string().min(1).max(260),
  contentType: z.enum(ALLOWED_ATTACHMENT_TYPES),
  size: z
    .number()
    .int()
    .min(1)
    .max(MAX_ATTACHMENT_BYTES, "Files must be 10 MB or smaller."),
});

/* ------------------------------ types ----------------------------- */

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type MoveInput = z.infer<typeof moveSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type AnswerQuestionInput = z.infer<typeof answerQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type PresignInput = z.infer<typeof presignSchema>;
export type ReviewStatusValue = (typeof REVIEW_STATUSES)[number];
