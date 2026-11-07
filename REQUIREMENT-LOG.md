# REQUIREMENT-LOG (DymTicket)

Traceability: every user requirement (round), its status, and where the
implementation + verification evidence lives. Format is AI-agent-friendly:
stable IDs, one row per requirement, no prose drift.

- **Status values**: `DONE` (implemented + probe/e2e verified) / `PARTIAL` /
  `OPEN` / `WONTDO` (explicitly excluded).
- **Evidence columns** point at: `NOTES#row-n` = IMPLEMENTATION-NOTES.md
  numbered row; `E2E` = e2e_kanban.py check IDs; `PROBE` = .qa probe files.

## Original brief (round 1-14 build-out)

| ID | Requirement (user) | Status | Implemented in | Evidence |
|---|---|---|---|---|
| REQ-001 | Kanban PM app, production-grade, Next.js 16 + TS + Tailwind v4 | DONE | scaffold + board + dashboard | E2E A4-A7 |
| REQ-002 | Multi-project workspaces with roles admin/team/client | DONE | models + rbac.ts | E2E A3, B1-B3, C1-C3 |
| REQ-003 | Project-level RBAC enforced server-side per action | DONE | getProjectAccess levels read/write/manage/review | E2E B3, C3, C4 |
| REQ-004 | Auth: email/password + secure JWT cookie session | DONE | lib/auth.ts + proxy.ts | E2E A1-A2 |
| REQ-005 | First registered account = global admin (bootstrap) | DONE | api/auth/register | NOTES row 1 |
| REQ-006 | Attachments via Cloudflare R2 presigned URLs | DONE | lib/storage.ts, upload routes, files serving | E2E A8 safety path |
| REQ-007 | Later directive: storage CLOUD-ONLY (no local upload fallback) | DONE | presign throws 503 designed refusal; legacy downloads remain | E2E A8; NOTES row 26 |
| REQ-008 | NO Docker - full cloud (MongoDB Atlas) | DONE | Atlas-only db.ts; container removed | NOTES row 8 |
| REQ-009 | Client review workflow: approved/changes_requested/under_review with column auto-moves; note required | DONE | review route + service | E2E B4-B8 |
| REQ-010 | Dynamic client verification questions (choice radio / checkbox / free text) on tickets | DONE | questions embedded subdocs | NOTES rows 16-18; probe_roles_questions |
| REQ-011 | Required questions block approval until answered | DONE | reviewTicket guard (400) | E2E B6 |
| REQ-012 | Per-option text note ("Other" style) when picked | DONE | textOptionIndexes + optionTexts | NOTES row 10; probe_text_options |
| REQ-013 | Zero layout shift ticket modal + create questions inside the create-ticket modal | DONE | top-anchored fixed-grid modal + draft builder | NOTES rows 10/12; probe_modal_overflow |
| REQ-014 | Author questions in create modal; edit/delete any time (answer-sanitizing edits) | DONE | draft mode + PUT question patch semantics | NOTES row 12 |
| REQ-015 | Client ticks visible to every role + spinner fix | DONE | tick chips + finally-cleared spinner | NOTES row 12 |
| REQ-016 | Activity timeline granularity (diffs, questions, attachments, reviews) | DONE | activity service + timeline component | NOTES row 16 |
| REQ-017 | OrcaBoard -> DymTicket rebrand, white + navy/indigo, gradient tokens, imagery, light-first theme (dark retained) | DONE | globals.css tokens + COVERS | NOTES rows 23-24 |
| REQ-018 | Analytics dashboards (Recharts, server-computed) | DONE | /analytics | NOTES row 16; probe_wow |
| REQ-019 | Knowledge brain force graph + explainable health score + unanswered pulsing nodes | DONE | /knowledge, d3-force | NOTES row 16; probe_wow |
| REQ-020 | AI content review, read-only, safe-to-fail (maintenance 503 without key) | DONE | ai-review service | NOTES row 16; probe_wow |
| REQ-021 | EN/JA i18n chrome-only, persisted, default EN (QA-stable) | DONE | lib/i18n + lang toggle | NOTES row 16; probe_wow |
| REQ-022 | Full page furniture (not-found/error/loading skeletons) + SEO (robots/sitemap/OG/noindex) | DONE | app chrome + metadata | NOTES rows 24-25; probe_round10 |
| REQ-023 | Rich text (Tiptap) for comments AND ticket description; images-only upload with storage-safety refusal | DONE | editors + progress strip | NOTES row 27; probe_richtext |
| REQ-024 | TTL server caching with instant write invalidation (never stale own edits) | DONE | cache.ts + Mongoose middleware | NOTES row 34; probe_cache |

## Round 15 (2026-11-07) - search/filter + gradients + header

| ID | Requirement (user) | Status | Implemented in | Evidence |
|---|---|---|---|---|
| REQ-025 | Home page project search (debounced) | DONE | 250ms lodash debounce + empty/no-match states | PROBE probe_round15; NOTES row 35 |
| REQ-026 | Board ticket search + filter bar; "which tickets does assignee X have" + "which are unassigned" as first-class filters | DONE | FilterBar: search 200ms + assignee (Unassigned only) + priority + reset + live count | PROBE probe_round15; NOTES row 35 |
| REQ-027 | Drag ordering must stay correct while filters hide cards | DONE | anchor-translated buildMovePlan (visible anchor -> real order slots) | PROBE probe_round15 |
| REQ-028 | Per-project customizable card-header gradient (admin/team, dynamic, not hard-coded) | DONE | gradientKey + 6 presets + allowlist + picker swatches | PROBE probe_round15 |
| REQ-029 | Website header: modern light shadow; later: bottom-only, remove border; reduce intensity further | DONE | downward-only layered shadow, borderless, 56px | PROBE probe_round15; NOTES rows 36-37 |

## Round 16 (2026-11-07) - quick default question set

| ID | Requirement (user) | Status | Implemented in | Evidence |
|---|---|---|---|---|
| REQ-030 | Question options + one-tap "create default set quickly" button | DONE | quick-questions button on ticket panel | PROBE probe_quickset; NOTES row 38 |
| REQ-031 | The quick set must be DYNAMIC: admin/team configurable per project, never hard-coded | DONE | Project.defaultQuestions templates (max 5) edited in project dialog | PROBE probe_quickset; NOTES row 38 |
| REQ-032 | Questions created from the set must be INDEPENDENT copies - later template edits never affect existing tickets | DONE | clone-at-insert (drafts + saved-ticket API path) | PROBE probe_quickset independence checks; NOTES row 39 |
| REQ-033 | Fix quick-set save silently failing (blank option labels vs zod) + shorten long dropdown labels | DONE | client cleanTemplates + short dq.type* labels; dialog widened to lg | NOTES rows 38-40 |

## Round 17 (2026-11-07) - responsive audit

| ID | Requirement (user) | Status | Implemented in | Evidence |
|---|---|---|---|---|
| REQ-034 | Site-wide responsive audit; mobile modals glued to screen edges -> small side padding | DONE | shared dialog primitive `w-[calc(100%-1.5rem)]` (all 7 surfaces) | PROBE probe_responsive; NOTES row 41 |
| REQ-035 | Audit remaining responsive issues | DONE | board header wraps; 390/768 pages sweep 0 overflow; mobile nav strip added < 640px | PROBE probe_responsive |

## Docs + security round (2026-11-07)

| ID | Requirement (user) | Status | Evidence |
|---|---|---|---|
| REQ-036 | Update all MD files to accurate latest content, 100% English before commit | DONE | full MD set reworked/created (see RULES.md doc map) |
| REQ-037 | Env audit: all important keys present | DONE | .env.example + .env.local (R2 empty = designed 503; GEMINI + SITE_URL placeholders added) |
| REQ-038 | .gitignore hardened for GitHub push safety | DONE | root + nested gitignores (env variants, .data/, keys, IDE, .qa/) |
| REQ-039 | Add CHANGELOG / API-REFERENCE / DATA-MODEL / TESTING / REQUIREMENT-LOG docs | DONE | this file set |
| REQ-040 | Add 5 more card-header gradient presets for richer choice (round 18) | DONE | gradients.ts + globals.css `rose/emerald/lagoon/mist/midnight` + dict EN/JA; PROBE probe_gradients2.py 11/11, e2e 23/23 |
| REQ-041 | Support Backblaze B2 as cloud storage provider (free tier, no credit card) | DONE | generic S3-compatible driver layer (R2 or B2, first complete set wins); .env.example how-to; B2 real-creds upload still to verify by user | NOTES row 44 |
| REQ-042 | Use the provided Gemini key + cheap lite models (gemini-3.1-flash-lite / gemini-3.5-flash-lite) | DONE | key + GEMINI_MODEL in .env.local (gitignored); both models VALIDATED live via models list + generateContent; UI live probe PASS (score + suggestions, 0 console errors) | PROBE probe_ai_live.py |
| REQ-043 | Free-tier model rotation: rate-limited primary rotates to fallback model | DONE | `GEMINI_MODEL_FALLBACKS` chain in ai-review service (per-model free quota; rotates on 429/404/5xx/network/empty, never on 400/401/403); proven E2E: bogus primary -> 404 -> 3.5 served 200 with panel, then restored 3.1 + fallback 3.5 | src/lib/services/ai-review.ts |
| REQ-044 | Second Gemini key as fallback: key 1 rate-limited -> key 2 runs; key 2 fails too -> calm 503, nothing else breaks | DONE | key+model double rotation (`GEMINI_API_KEY_2`; 401/400-API_KEY_INVALID switch keys, 429/404/403/5xx rotate models); first candidate key 403'd (free tier disabled) and was rejected per user condition; REPLACED by a working AI Studio key: both lite models OK, rotation proven E2E bogus key 1 -> key 2 served 200 | src/lib/services/ai-review.ts |
| REQ-045 | Storage media lifecycle: ticket/project delete + update flows must delete related files (attachments + description/comment/review images) to protect the free tier | DONE | storage-cleanup.ts (key extraction from rich HTML + per-driver deletion, legacy local unlink); hooks in deleteTicket / deleteProject / updateTicket (desc diff + attachment replacement, cross-reference safe); best-effort - never breaks outer flows; PROBE probe_storage_cleanup.py 21/21 with real disk evidence | storage-cleanup.ts, services/tickets.ts, services/projects.ts |
| REQ-046 | Security + spam hardening: images-only media policy (pdf/video rejected), max 5 attachments + max 5 images per rich body, persistence sanitizer on every rich input (anti-XSS), rate limits on critical APIs, anti-double-click busy states, orphan cleanup for editor/paste media inside dialogs | DONE | types constants + presignSchema image-only enum (400 for pdf/video - probe-verified); sanitize.ts stripDangerousHtml wired via zod transforms on ticket/project descriptions, review notes, comment bodies (display DOMPurify unchanged; UNDEFINED-preserving transforms - bare .optional().transform() erased absent fields and wiped descriptions, caught by probe); rate-limit.ts fixed-window in-memory wired into login/register/tickets/comments/review/ai-review/presign/cleanup; POST /api/content/graphics/cleanup server-side reference check (unreferenced-only deletes); ticket/project dialogs collect session media keys + fire cleanup on close; comment Send busy-disabled; editor multi-pick + paste loop with image budget; attachment thumbnails + lightbox (image-preview.tsx); PROBES probe_security_media.py 16/16 (script/onerror/javascript: stripped, cleanup keeps referenced, 429 hammer, 0 console errors) + e2e 23/23 | sanitize.ts, rate-limit.ts, validation.ts, api/content/graphics/cleanup/route.ts, rich-text.tsx, attachment-upload.tsx, image-preview.tsx, ticket-modal.tsx, project-edit-dialog.tsx |
| REQ-047 | Production-readiness: manually testable end state - e2e of ALL project logic, 0 console errors, no break/infinite loops/bad performance, docs updated before deploy | DONE | files route re-authorized by key segment (draft previews pre-save, foreign-project keys blocked, calm 404 JSON), login rate limit counts ONLY failures (successes can never lock accounts; hammer still 10x401 -> 429), knowledge-graph duplicate-key React bug fixed (per-ticket question index ids), rare relative-time hydration noise silenced (suppressHydrationWarning x3 SSR surfaces), probes renewed to the live-B2 contract (real uploaded objects, run-unique hammer identities, self-cleanup), FINAL GATE: reseed -> e2e 23/23 -> reseed -> 15-probe battery 15/15 exit 0 / 0 console errors -> reseed, tsc 0 / eslint 0, bucket back to 0 objects | NOTES row 51, TESTING.md round-24 gate, CHANGELOG round 24 |
| REQ-048 | Round 25: (a) image view/upload 100% - open public file view IF still an issue; (b) all API success/failure toasts dynamic by active locale (en/ja); (c) confirm caching pattern keeps critical data fresh; (d) duplicate-name rule: projects globally, tickets within their project scope | DONE | (a) view+upload verified 100% (draft previews, member GETs byte-identical) -> "public view" SKIPPED per the user's own condition: serving stays auth-checked (b2_live 20/20 incl draft-preview + anonymous-denied); (b) ApiError/ApiClientError + action results carry stable `code`, `explainApi(err,t,fallbackKey)` renders `api.*` dict keys in the ACTIVE lang, 16 toast/inline-error surfaces migrated, PROBE probe_toast_locale (JA + EN wording asserted); (c) TTL cache ONLY on stats(2m)/knowledge(5m) aggregates with Mongoose write invalidation, board/tickets/search/dashboard uncached, pages per-request (`instant=false`) - no stale critical data possible; (d) assertUniqueProjectName (global) + assertUniqueTicketTitle (same-project) case-insensitive+trimmed, rename-to-own-name is a no-op, 409 PROJECT_NAME_TAKEN/TICKET_NAME_TAKEN, PROBE probe_duplicate_names 17/17 | api.ts, action-utils.ts, fetcher.ts, dictionary.ts (explainApi + api.* keys), services/projects.ts, services/tickets.ts, 16 components, PROBES |

## Explicitly declined / out of scope (user decisions)

| ID | Requirement | Status | Why |
|---|---|---|---|
| REQ-X1 | Email verification on register | WONTDO | user chose MVP-skip |
| REQ-X2 | Docker-based local Mongo | WONTDO | user directive: full cloud |
| REQ-X3 | Local upload fallback driver | WONTDO | cloud-only directive (legacy downloads kept) |
| REQ-X4 | Violet/fuchsia/lavender accents | WONTDO | brand taste rule |
