# CLAUDE.md - working guide for AI agents in this repo

DymTicket is a Next.js 16 App Router (Turbopack) + TypeScript + Tailwind v4 +
Mongoose 9 (MongoDB Atlas) project. This file tells you how to work here
without breaking it.

## Non-negotiables

1. **This is NOT the Next.js you know** - read bundled docs under
   `node_modules/next/dist/docs/` before inventing APIs. Established patterns:
   `proxy.ts` (edge, signature-only checks, **never writes cookies**),
   `export const instant = false` on cookie-reading segments, RSC cannot
   `cookies().set()` (only Server Actions / Route Handlers).
2. **Mongoose model cache gotcha**: `models.X ?? model(...)` keeps the old
   schema on HMR - after editing `src/lib/models.ts` you MUST restart the dev
   server (kill the background job, start a new one).
3. **Never rename `data-testid`s.** The Playwright suite
   (`D:\orca-onboarding\.qa\e2e_kanban.py`, 23 checks) and probes depend on
   them. Extend, don't rename.
4. **Windows host quirks**: npm needs `--include=dev` (user `.npmrc` has
   `omit=dev` - do not edit `C:\Users\DUNG\` configs); run npm through a shell
   in Python (`shell=True`); use `page.context.clear_cookies()` not `page.`.
5. **User prefs**: Vietnamese replies for summaries; no Docker (Atlas only);
   don't touch sibling dirs in `D:\orca-onboarding`.

## Commands

```bash
npm install --include=dev      # first time / after pulling deps
npm run dev                    # bg job; wait for :3000 then seed
npm run seed -- --force        # reset demo data (5 users, 2 projects)
npm run typecheck              # tsc --noEmit
npm run lint                   # eslint (flat config)
python D:\orca-onboarding\.qa\e2e_kanban.py   # 23/23 must stay green
```
Dev helper: `$env:NODE_ENV="development"; npm run dev` from `D:\orca-onboarding\kanban-app`. Demo password: `Password123!` (`admin@orcaboard.dev`, `alex@orcaboard.dev`, `sophia@acmestudio.co`, …).

## Architecture map

```
src/lib/        auth (JWT cookie, getSessionUser) · rbac.getProjectAccess(level: read|write|review)
                models (Ticket embeds questions[answers[]]; Project embeds gradientKey + defaultQuestions)
                serialize · validation (zod schemas) · cache (TTL read-through + in-flight dedupe)
                gradients (presets, allowlist, gradientClassFor)
                services/ tickets · projects · stats · knowledge (graph+score) · ai-review (Gemini, 503-safe)
                i18n/ dictionary.ts (DICT en/ja) + index.tsx (useLang().t) - chrome text only
src/app/(app)/  dashboard · projects/[id] board · analytics · knowledge · admin (RBAC-gated)
src/app/api/    route() + readJson() pattern; zod-validated; ApiError → JSON
src/app/actions/ server actions (create/update project meta + members)
src/components/ board/ (kanban-workspace, table-view, ticket-modal, questions-panel, ai-review-panel,
                review-panel, members-dialog, background-dialog, project-edit-dialog, activity-timeline)
                dashboard/ (projects-view: banner, debounced search, gradient cards) · analytics/ · knowledge/ · ui/ primitives
src/proxy.ts    edge gate for /dashboard /projects /admin only (no auth-page bounce!)
```

## House rules established by past incidents (see IMPLEMENTATION-NOTES.md)

- dnd-kit hydration: the board renders a skeleton pre-mount (`useSyncExternalStore` gate) - keep that gate.
- **Search/filter UX**: home project search = lodash `debounce` 250 ms; the board FilterBar (`board-filterbar`) = search (200 ms) + assignee (with a first-class "Unassigned only" option) + priority + reset; the **Overview progress strip stays unfiltered**.
- **DnD under filters**: `buildMovePlan` plans on the FULL column lists and takes an `anchorId` ("drop before this visible card", null = append at the column end) - never map visible indexes straight to orders.
- **Project meta RBAC is `write`** (admin AND team): name/description/gradient/quick-add set all flow through `updateProjectMeta`; gradient keys must pass the `isProjectGradient` allowlist; **`""` and `null` both mean "automatic cover"** - normalize empty strings or re-saves surface "Unknown header gradient.".
- **Quick-add default question set** (`defaultQuestions` on Project, edited in the project edit dialog): the ticket panel's "Default set" button (`quick-questions`) inserts **independent copies** - never share references between templates and created questions; the button hides while the set is empty (nothing is hard-coded, max 5 templates).
- **Server-side TTL cache** (`src/lib/cache.ts`): org stats 2 min, knowledge graph 5 min, per-user keys, in-flight dedupe; **Mongoose post-middleware invalidates on every write** (attach to schemas BEFORE model compilation) - own edits must appear instantly; board/tickets/dashboard list stay uncached.
- Ticket modal dialogs are **top-anchored with a fixed-height grid** (`top-[4vh]`, `md:h-[78vh]`) so accordion toggles cause **zero layout shift** - verify with bounding-box probes when touching them.
- Activity entries carry **sentence-style notes** (`changed priority: …`) - the timeline renders them as the main line; new entries should follow `verbLowercase…` format with actor + note.
- Update-question endpoint is patch-semantics: text questions accept only `prompt/required`; choice-option edits **sanitize answers** (prune invalid indexes/texts, drop emptied answers) - keep tests around this.
- AI review: `POST /api/tickets/[id]/ai-review` must ONLY ever fail as
  `ApiError(503, AI_MAINTENANCE_MESSAGE)`; UI only toasts - **never mutate
  content from AI output**, suggestions are display-only for admin/team.
- i18n: all chrome strings go through `useLang().t("key")` using `src/lib/i18n/dictionary.ts`; user data is never translated; default stays `en` so QA is language-stable.
- Brand/responsive: white + navy/indigo gradients only (tokens in `globals.css`: `--grad-banner` exact user gradient); no violet/fuchsia accents (taste-skill rule); buttons use `.press` micro-motion; the sticky header is borderless with a downward-only light shadow; the shared dialog primitive keeps phone side-gutters (`w-[calc(100%-1.5rem)]`); phones navigate via the `mobile-nav` strip.

## Verification checklist before you call anything done

1. `npm run typecheck` → 0 errors.
2. `npm run lint` → 0 errors 0 warnings.
3. If `models.ts` changed → restart dev server, reseed (`npm run seed -- --force`).
4. Run the relevant `.qa` probe (there are focused probes per feature) and the
   full `e2e_kanban.py` - must end `23/23 checks passed`; reseed after.
5. Confirm **0 browser console errors** in the probe output.
6. Update `IMPLEMENTATION-NOTES.md` (bug table + decision rows).

## Testing patterns

- Playwright: login via testids `auth-form` email/password + `auth-submit`; scope clicks inside accordion bodies via `header.locator("xpath=..")`; use `page.context.clear_cookies()` between roles; `$env:PYTHONIOENCODING="utf-8"` for ✓-heavy output; screenshots to `.qa\shots\`.
- Feature probes in `.qa`: `probe_round15.py` (home search/filter/gradient/header polish), `probe_quickset.py` (default question set + gradient `""` edge), `probe_responsive.py` (390px/768px overflow sweep + modal gutters + mobile nav), `probe_cache.py` (TTL hits + write invalidation), `probe_richtext.py`, `probe_ui.py`, `probe_scrolllock_clean.py`, `probe_strip_pos.py`, `probe_modal_overflow.py`, `probe_wow.py`. Scrollbar-style probes must run `headless=False` on real Windows (headless hides overlay scrollbars).
- Layout-shift checks: compare `[data-testid="ticket-modal"] .bounding_box()` y/height before/during/after accordion toggles (allow <3px drift).
- AI maintenance path: with no `GEMINI_API_KEY` in env, `ai-review-button` click must toast the maintenance message and produce no console errors.
