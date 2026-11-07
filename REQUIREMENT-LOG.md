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

## Explicitly declined / out of scope (user decisions)

| ID | Requirement | Status | Why |
|---|---|---|---|
| REQ-X1 | Email verification on register | WONTDO | user chose MVP-skip |
| REQ-X2 | Docker-based local Mongo | WONTDO | user directive: full cloud |
| REQ-X3 | Local upload fallback driver | WONTDO | cloud-only directive (legacy downloads kept) |
| REQ-X4 | Violet/fuchsia/lavender accents | WONTDO | brand taste rule |
