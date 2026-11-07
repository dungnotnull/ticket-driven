# API-REFERENCE (DymTicket)

Every callable server boundary: REST route handlers (`src/app/api/**`) and
Server Actions (`src/app/actions/**`). Source of truth for payloads is
`src/lib/validation.ts` (Zod schemas named in each row).

## Conventions (agents: read this first)

- **Auth**: `kanban_session` httpOnly JWT cookie (HS256, 7d). REST routes
  call `requireSessionUser()` -> 401 when absent.
- **Envelope**: every route runs through `route()` (`src/lib/api.ts`) -
  returns `Response.json({ ...payload })` on success and a JSON error body
  on `ApiError`/Zod failure (400 invalid payload, 401 no session, 403 role,
  404 missing, 409 duplicate, 503 designed refusals).
- **Server Actions** return `ActionResult` (`src/lib/action-utils.ts`):
  `{ ok: true }` or `{ ok: false, error: string }` - never throw across the
  wire. Client wrapper: `apiFetch` in `src/lib/api-fetch.ts`.
- **RBAC**: `getProjectAccess(projectId, level, user)` guards everything
  project-scoped. Levels: `read` (any member), `write` (admin/team - 
  incl. AI review + project meta), `manage` (project admin only), `review`
  (client ONLY - global admins deliberately excluded). Global admin
  bypasses everything else.

## REST routes

| Method + path | Level / role | Body / query (Zod) | Response | Notes |
|---|---|---|---|---|
| POST `/api/auth/register` | public | `registerSchema` {name, email, password} | `{ user }` + cookie | First account = global admin; later self-registered = team |
| POST `/api/auth/login` | public | `loginSchema` {email, password} | `{ user }` + cookie | bcrypt compare |
| POST `/api/auth/logout` | session | - | `{ ok: true }` | Clears cookie |
| GET `/api/auth/me` | session | - | `{ user }` or 401 | SessionUser DTO |
| GET `/api/projects` | session (member-scoped) | - | `{ projects }` | List of my projects |
| POST `/api/projects` | session | `createProjectSchema` | `{ project }(201)` | Creator becomes project admin |
| GET `/api/projects/[id]` | `read` | - | `{ project }` | Detail incl. populated members |
| PATCH `/api/projects/[id]` | `write` | `updateProjectSchema` {name?, description?, backgroundUrl?, gradientKey?, defaultQuestions? (null clears)} | `{ project }` | gradientKey allowlisted (`""`normalizes to null); defaultQuestions max 5 templates |
| DELETE `/api/projects/[id]` | `manage` | - | `{ ok: true }` | Removes project + its tickets + **best-effort storage cleanup of every media key those tickets referenced** |
| POST `/api/projects/[id]/members` | `manage` | `addMemberSchema` {email, role} | member | 409 unknown/dupe email |
| PATCH `/api/projects/[id]/members` | `manage` | `updateMemberSchema` {userId, role} | member | |
| DELETE `/api/projects/[id]/members` | `manage` | `removeMemberSchema` {userId} | `{ ok: true }` | |
| GET `/api/tickets?projectId=&assignee=&status=` | `read` | query param `projectId` required | `{ tickets }` | statuses: todo/in_progress/in_review/done |
| POST `/api/tickets` | `write` | `createTicketSchema` {projectId, title?, ...; questions[] max 20} | `{ ticket }(201)` | Questions created with ticket |
| GET `/api/tickets/[id]` | `read` | - | `{ ticket }` | Full ticket DTO |
| PATCH `/api/tickets/[id]` | `write` | `updateTicketSchema` {title?, priority?, assigneeId?, dueDate?, description?} | `{ ticket }` | Activity field-diffs recorded; dropped description images / removed attachments get **best-effort storage cleanup** (keys still visible elsewhere are kept) |
| DELETE `/api/tickets/[id]` | `write` | - | `{ ok: true }` | **Best-effort storage cleanup**: attachments + description/comment/review-note images deleted (S3 object via driver, legacy `.data/uploads` file otherwise) |
| POST `/api/tickets/[id]/move` | `write` | `moveSchema` {updates: [{id, status, order}]} | `{ ok: true }` | Client reindexes affected columns after DnD |
| POST `/api/tickets/[id]/comments` | `read` (member) | `commentSchema` {body(html-safe string)} | `{ ticket }` | Rich text; timeline note; persistence-sanitized (`stripDangerousHtml`) |
| POST `/api/tickets/[id]/review` | `review` (client-only) | `reviewSchema` {status, note} | `{ ticket }` | changes_requested REQUIRES note; auto-moves; persistence-sanitized |
| POST `/api/tickets/[id]/questions` | `write` | `createQuestionSchema` {prompt, type choice/text, options[], allowMultiple, required, textOptionIndexes[]} | `{ ticket }` | choice needs >= 2 option labels |
| PUT `/api/tickets/[id]/questions/[questionId]` | `write` | `updateQuestionSchema` (all-optional patch) | `{ ticket }` | Option edits SANITIZE existing answers |
| DELETE `/api/tickets/[id]/questions/[questionId]` | `write` | - | `{ ticket }` | |
| POST `/api/tickets/[id]/questions/[questionId]/answer` | `read` (member) | `answerQuestionSchema` {choiceIndexes?, optionTexts?, text?} | `{ ticket }` | One answer per member (upsert by userId) |
| POST `/api/tickets/[id]/ai-review` | `write` | - | `{ suggestions }` | Gemini double-rotation (per-key model chain + `GEMINI_API_KEY_2` key chain; free-tier quota is per model AND per key); ANY final failure = 503 maintenance (safe) |
| POST `/api/upload/presign` | `write` | `presignSchema` {projectId, fileName, contentType} | upload ticket `(201)` | **IMAGES ONLY** - `image/png|jpeg|gif|webp` else 400; Cloud-only S3-compatible: Cloudflare R2 via R2_* OR Backblaze B2 via B2_* (B2 wins when set); no creds = 503 `STORAGE_UNCONFIGURED` |
| PUT `/api/upload/local` | signed | HMAC-signed URL only | - | Legacy local upload path (kept for old uploads; new uploads are cloud-only) |
| GET `/api/files/[...key]` | `read` | - | streamed file | Validates ticket->project membership per request; legacy `.data/uploads` remain downloadable |
| POST `/api/content/graphics/cleanup` | `read` (member) | {projectId, keys[<=50]} | `{ removed, considered }` | Draft-media garbage collector: deletes ONLY in-project keys (`tickets/<projectId>/...`) that NO ticket references (attachments / description / activity notes); referenced keys always survive; rate-limited 15/min |
| GET `/api/users` | admin | - | `{ users }` | Admin console list |
| POST `/api/users` | admin | `createUserByAdminSchema` {name, email, password, role} | `{ user }` | 409 duplicate email |

| POST `/api/auth/login` | - | `loginSchema` {email, password} | `{ user }` + cookie | Rate limit 10/5min per IP+email → 429 |
| POST `/api/tickets` | `write` | `createTicketSchema` | `{ ticket }(201)` | Rate limit 30/min per user → 429 |
| POST `/api/tickets/[id]/comments` | member | - | - | Rate limit 20/min per user → 429 |
| POST `/api/tickets/[id]/review` | client | - | - | Rate limit 20/min per user → 429 |
| POST `/api/tickets/[id]/ai-review` | write | - | - | Rate limit 5/min per user → 429 |
| POST `/api/upload/presign` | write | - | - | Rate limit 30/min per user → 429 |

## Server Actions (`src/app/actions`)

| Action | Level | Input | Result |
|---|---|---|---|
| `createProjectAction` | session (any signed-in) | name, description (rich HTML, sanitized) | project created, creator = project admin |
| `updateProjectAction` | `write` | name?, description? (rich HTML, sanitized), backgroundUrl?, gradientKey?, defaultQuestions? | meta saved |
| `deleteProjectAction` | `manage` | projectId | project + tickets removed |
| `addMemberAction` / `updateMemberAction` / `removeMemberAction` | `manage` | member primitives | members managed |
| `createUserAction` | global admin | name, email, password, role | account created (client-user flow) |
| `changeGlobalRoleAction` | global admin | userId, role | cannot target yourself |
| `deleteUserAction` | global admin | userId | cannot delete yourself |

## Error message literals QA depends on (do not reword)

- "uploads are disabled" family: storage unconfigured 503 toast
  (`att.unconfigured`).
- AI: `AI_MAINTENANCE_MESSAGE` ("AI assistant is temporarily unavailable
  (maintenance)").
- Review note required: 400 when `changes_requested` has an empty note.
- "Unknown header gradient." for allowlist misses (prevents after the
  `""` normalization chain - see DATA-MODEL / SECOND-BRAIN-KNOWLEDGE).
