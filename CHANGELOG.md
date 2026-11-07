# CHANGELOG (DymTicket)

Format: Keep-a-Changelog style groups (Added / Changed / Fixed /
Docs+Security) per build phase. The project ships as one continuously
verified build; detailed forensics live in `IMPLEMENTATION-NOTES.md`
(append-only rows 1-41 + round gates). Dates are the session's Asia/Saigon
calendar dates. Status of every line: DONE + probe-verified.

## 2026-11-07 - rounds 15-17 (interaction, questions UX, responsiveness)

### Added
- Home dashboard project search: lodash `debounce` 250 ms, X clear button,
  count / no-match / dedicated empty state (testid `project-search`).
- Board FilterBar (`board-filterbar`): debounced ticket search 200 ms
  (title + tag-stripped rich description), assignee filter with
  first-class **Unassigned only** option, priority filter, reset button,
  live `N of M tickets match` count; table view inherits the same filters.
- Per-project card-header gradients: `gradientKey` on Project (null =
  legacy name-hash automatic cover), 6 brand-safe presets (`.grad-proj-*`;
  indigo/ocean/steel/sky/teal/amber), swatch picker in the project edit
  dialog (toggle selected swatch = back to automatic), server allowlist +
  zod.
- Quick-add default question set: per-project templates (max 5: prompt,
  choice/text, options with per-option text note, single/multi, required)
  editable in the project edit dialog; one-tap **Default set** button
  (`quick-questions`) on the ticket questions panel inserts independent
  copies (drafts + saved-ticket path); hidden while the set is empty;
  EN/JA strings.
- Phone-only mobile navigation strip (`mobile-nav`, sticky, icon+label
  chips, horizontal scroll) - visible < 640px, hidden >= 640px.
- lodash + @types/lodash dependencies.

### Changed
- Project metadata editing widened: admin AND team (`write` level) now
  control name/description/background/gradient/default question set.
- Project edit dialog enlarged (md -> lg) with flex-wrap question rows and
  shortened dropdown labels (`Choice` / `Text`).
- Header: borderless, downward-only feather-light layered shadow (top +
  bottom hairlines removed); height exactly 56px; matching feather-light
  shadows on the new search fields.
- Dialog primitive: `w-full` -> `w-[calc(100%-1.5rem)]` - every modal keeps
  12px side gutters on phones (desktop capped by max-w as before).

### Fixed
- Drag-under-filter order corruption: `buildMovePlan` now takes an
  `anchorId` ("drop before this visible card", null = append at full
  column end) and translates the visible position into real order slots on
  the FULL list; progress strip intentionally unfiltered.
- Gradient `""` legacy edge: empty-string gradient no longer trips the
  allowlist into "Unknown header gradient." on every re-save (three-layer
  normalization: service, serialize, dialog init).
- Quick-set save silently failing when template rows had blank option
  labels (zod min + swallowed empty error) - client `cleanTemplates()`
  sanitization + trustworthy error surface.

### Verified
- `probe_round15.py` 14/14, `probe_quickset.py` 23/23,
  `probe_responsive.py` 17/17 - all 0 console errors; e2e 23/23; tsc/lint 0.

## 2026-11-04..06 - rounds 1-14 (initial build-out)

### Added
- Scaffold: Next.js 16 (App Router, Turbopack) + TS strict + Tailwind v4 +
  Mongoose 9 (MongoDB Atlas), strict folder conventions.
- Auth: JWT httpOnly cookie (jose HS256, 7d) + bcryptjs + edge signature
  gate (`proxy.ts`); first account bootstraps as global admin.
- RBAC: `getProjectAccess` levels read / write / manage / review
  (review client-only; global admin bypasses except review).
- Projects: CRUD, members (admin/team/client), curated Unsplash background
  gallery; tickets: 4-column kanban + table view, pointer DnD
  (@dnd-kit, hydration-gated skeleton), priorities, member-only assignee,
  due date + overdue surfacing, R2 attachments + auth-checked `/api/files`
  serving.
- Client verification questions: embedded subdocs with per-member answers;
  radio / checkbox (`allowMultiple`) with per-option text notes
  (`textOptionIndexes` + `optionTexts`) or free text; required questions
  block approval; authorable in the create-ticket modal (draft mode);
  edit/delete answers-sanitizing.
- Client review workflow: approved -> Done; changes_requested (note
  required) -> In Progress; under_review stays; strictly client-only.
- Activity timeline: created / field-level diffs / moves / comments /
  attachments / question lifecycle + answers / reviews.
- Analytics: KPIs, column/priority/review charts, 14-day charts, workload,
  coverage, avg-hours-to-Done, overdue list (Recharts, server-computed).
- Knowledge brain: d3-force graph (projects/tickets/members, pulsing
  unanswered-required nodes, hover-trace + pinned inspector) and health
  score = 40% delivery + 20% review + 25% client feedback + 15% momentum.
- AI content review (Gemini): read-only suggestions, safe-to-fail 503
  maintenance toast, never mutates content.
- EN/JA i18n (chrome only, persisted), light/dark theme system with
  pre-paint script, brand token system (signature gradients), `.press`
  motion, scroll-thin/scrollbar-stable utilities, Tiptap rich-text editors
  (comments + description, images-only uploads).
- Server-side TTL caching (`cache.ts`): org stats 2 min + knowledge graph
  5 min, per-user keys, in-flight dedupe, Mongoose write-invalidation.
- SEO: robots + sitemap + OG/Twitter cards + noindex on authed surfaces.
- QA suite: `e2e_kanban.py` 23 checks + focused probes.

### Changed
- Storage policy: uploads made CLOUD-ONLY (presigned R2 required; missing
  credentials = designed 503 toast `att.unconfigured`; legacy local files
  remain downloadable only).
- MongoDB: Docker container replaced by MongoDB Atlas (cloud-only DB).
- Rebrand: OrcaBoard -> **DymTicket**, white + navy/indigo design system.

### Docs
- `IMPLEMENTATION-NOTES.md` (append-only decision/bug log), `README.md`,
  `CLAUDE.md`, and the full AI-agent doc set: PROJECT-DETAIL,
  DEVELOPMENT-TRACKING-PROGRESS (with LIMITATION + FUTURE-IMPROVEMENT),
  MVPS, ISSUES-TRACKING, RULES, SECOND-BRAIN-KNOWLEDGE, DESIGN,
  API-REFERENCE, DATA-MODEL, TESTING, REQUIREMENT-LOG, CHANGELOG.
