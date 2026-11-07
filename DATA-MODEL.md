# DATA-MODEL (DymTicket)

Canonical Mongoose schemas in `src/lib/models.ts` (types re-exported from
`src/lib/types.ts`; DTO shapes in `src/lib/serialize.ts`; payload
validation in `src/lib/validation.ts`). Editing schemas ALWAYS requires a
dev-server restart (HMR model-cache gotcha).

## Entity overview

```
User        global account (roles, bcrypt password)
Project     workspace: members[], backgroundUrl, gradientKey, defaultQuestions[]
Ticket      embedded-first: questions[], answers[], activity[], attachments[], review
```

## User

| Field | Type | Rules |
|---|---|---|
| name | String | required, trimmed |
| email | String | required, UNIQUE index, lowercased + trimmed |
| passwordHash | String | required (bcryptjs) |
| globalRole | enum | `admin` / `team` / `client`, default `team` |

- First registered account bootstraps as global admin; self-registration
  grants `team`; clients are created by admins only.
- `timestamps: true` (createdAt / updatedAt).
- No `activated` field exists - activation/deactivation is not part of the
  model (admin console manages roles and deletion instead).

## Project

| Field | Type | Rules |
|---|---|---|
| name | String | required, trimmed |
| description | String | default "" |
| ownerId | ObjectId -> User | required |
| members | [Member] | default [] |
| backgroundUrl | String | default null; curated Unsplash gallery (server allowlist) |
| gradientKey | String | default null; allowlisted preset key; **NULL and "" both mean automatic name-hash cover** |
| defaultQuestions | [DefaultQuestion] | max 5 (zod); quick-add templates |

**Member** (subdoc, `_id: false`): `userId -> User` (required),
`role` enum `admin`/`team`/`client` (default `client`), `addedAt`.

**DefaultQuestion** (subdoc, `_id: false`):
- `prompt` String required, trim, max 200
- `type` enum `choice` / `text` (default choice)
- `options` [{ `label` required trim max 120, `withText` Boolean default false }] - max 8 (zod)
- `allowMultiple` / `required` Booleans (default false)

Sanitize rules (`updateProjectMeta`): empty prompts/labels dropped at the
client (`cleanTemplates`) and server-side; choice with fewer than 2
option labels coerces to `text`; `null` input clears the whole set.

**Index**: `{ "members.userId": 1 }` (fast "my projects" queries).

## Ticket

| Field | Type | Rules |
|---|---|---|
| projectId | ObjectId -> Project | required |
| title | String | required, trimmed |
| description | String | rich text (Tiptap HTML) |
| status | enum COLUMN_KEYS | `todo` / `in_progress` / `in_review` / `done`, default `todo` |
| order | Number | numeric position INSIDE a column (10-step slots) |
| assigneeId | ObjectId -> User | optional; MUST be an active project member (admin/team) |
| priority | enum | `low` / `medium` / `high` / `urgent`, default `medium` |
| dueDate | Date | optional; `TicketDTO.overdue` computed server-side |
| attachments | [Attachment] | default [] |
| activity | [Activity] | default [] - full timeline |
| review | Review | optional subdoc |
| questions | [TicketQuestion] | default []; questions created with ticket or added later; quick-add = independent COPIES of `defaultQuestions` |
| createdById | ObjectId -> User | required |

**Indexes**: `{ projectId: 1, status: 1, order: 1 }` (board reads)
+ `{ projectId: 1, updatedAt: -1 }` (recency).

### Attachment (subdoc)

`key` (storage key `tickets/<projectId>/<token>/<file>`), `url` (direct CDN
URL only when `R2_PUBLIC_BASE` is set, else "" -> served via
`/api/files/[...key]`), `name`, `size`, `contentType`
(allowlist `ALLOWED_ATTACHMENT_TYPES`), `uploadedById`, `createdAt`.
Uploads REQUIRE R2 credentials (cloud-only; 503 otherwise).

### Activity (subdoc, `_id: true`)

- `type` enum: `created` / `edited` / `moved` / `comment` / `attachment` /
  `review` / `deleted`
- `actorId` ref, `actorName`, `from`/`to` (columns), `note` (sentence-style
  main line for the timeline), `review` enum (same as review status),
  `attachmentName`, `createdAt`.

### Review (subdoc, `_id: false`)

`status` enum `REVIEW_STATUSES` = `under_review` / `changes_requested` /
`approved`, `note` (required for changes_requested), `reviewedById`,
`reviewedAt`. Client-only; `approved` auto-moves ticket to `done`,
`changes_requested` auto-moves to `in_progress`.

### TicketQuestion (subdoc) + QuestionAnswer

| Field | Notes |
|---|---|
| prompt | required, trimmed |
| type | enum `choice` / `text` (required) |
| options | [String] labels for choice (empty for text) |
| allowMultiple | checkbox vs radio |
| textOptionIndexes | [Number] - options whose pick demands a short text |
| required | blocks `approved` while zero answers |
| createdById, createdAt | |
| answers | [QuestionAnswer] - ONE per member (upserted by userId) |

**QuestionAnswer**: `userId` ref, `choiceIndexes` [Number],
`optionTexts` [{`index`, `text`}]- notes per selected text-enabled option,
`text` (free text answers), `answeredAt`.
Option edits sanitize answers (prune invalid indexes / stale notes, drop
emptied answers) so the required-approval guard stays honest.

## Cache invalidation contract

`attachCacheInvalidation` adds `post` middleware for `save`, `updateOne`,
`findOneAndUpdate`, `findOneAndDelete`, `deleteOne`, `bulkWrite` on ALL
THREE schemas -> `invalidateReadCaches()` (TTL cache drop). Attached BEFORE
model compilation. Effect: org stats (2 min TTL) and knowledge graph (5
min TTL) are read-through caches ONLY for cross-user aggregates; any write
anywhere (service/route/seed) makes own edits visible instantly.

## DTO mapping (serialization layer)

`serializeProject` / `serializeTicket` (`src/lib/serialize.ts`) map raw
docs to client-safe DTOs: falsy `gradientKey` -> null; missing DTO fields
get defaults (`withText` defaults false, types picked against enums); IDs
stringified. Client components NEVER import Mongoose-typed modules - only
`src/lib/types.ts` DTOs.
