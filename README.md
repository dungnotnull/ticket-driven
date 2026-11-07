# DymTicket - Kanban PM & Client Collaboration

Production-grade project management & client collaboration app (brand: **white +
deep navy/indigo**). Multi-project Kanban boards with drag & drop, a compact
table view with its own assignee filter, project-level RBAC, a client review
workflow with automatic column shifts, **dynamic client verification questions**
(radio/checkbox with per-option text notes + free text) plus a **team-editable
quick-add default question set**, a **full activity timeline**, **workspace
analytics** (Recharts), an **obsidian-style knowledge brain** (d3-force) with an
explainable health-score, **read-only AI content review** (Gemini, safe-to-fail),
a **server-side TTL caching layer with Mongoose invalidation**, per-project
**card-header color gradients**, debounced **project & ticket search/filter
bars**, and **EN/JA i18n** for all chrome text (user data is never translated).

Stack: **Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · Mongoose 9 / MongoDB Atlas · @dnd-kit · Radix (shadcn-style) · Recharts · d3-force · Sonner · Zod · lodash**

## Quick start

1. **Install** (dev dependencies are required for TypeScript):
   ```bash
   npm install --include=dev
   ```
2. **Configure environment** - copy `.env.example` to `.env.local` and set:
   - `MONGODB_URI` - MongoDB connection string (Atlas M0 works: `mongodb+srv://user:pass@cluster/kanban`)
   - `AUTH_SECRET` - random 32+ byte hex string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - **Cloud storage (uploads are cloud-only)**: EITHER `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (+ optional `R2_PUBLIC_BASE`) - Cloudflare R2 - OR the Backblaze **B2 free-tier-friendly trio** `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET` (+ optional `B2_REGION` default `us-west-004`, `B2_PUBLIC_BASE`). Both are S3-compatible presigned-PUT providers with the same auth-checked `/api/files/[...key]` streaming - the first complete set wins; without credentials the ticket form reports "uploads are disabled" (legacy files already in `.data/uploads` stay downloadable)
   - **Media cleanup (storage hygiene)**: uploaded objects never orphan - deleting a ticket deletes its attachments AND description/comment/review-note images; a description edit or attachment replacement cleans the media it dropped; deleting a project cascades the same cleanup over ALL its tickets; keys still referenced elsewhere on the ticket are preserved; cloud deletes go through the active driver, legacy `.data/uploads` files are unlinked - everything is best-effort and can never break the outer flow
   - *(optional)* `GEMINI_API_KEY` + `GEMINI_MODEL` - enables AI content review; cheap lite models are supported (e.g. `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`); `GEMINI_MODEL_FALLBACKS` (comma-separated) adds a **live model chain** and `GEMINI_API_KEY_2` a **second API key** - free-tier quota is per model AND per key, so a rate-limited (429) primary rotates to the next model, then the next key, before anything fails; without a key the button degrades to a calm "maintenance" toast, nothing breaks
3. **Seed demo data**:
   ```bash
   npm run seed
   ```
4. **Run**:
   ```bash
   npm run dev    # http://localhost:3000
   ```

### Demo accounts (after seeding - password `Password123!`)

| Role | Email | Scope |
|---|---|---|
| Global admin | `admin@orcaboard.dev` | Everything incl. `/admin` console |
| Team | `alex@orcaboard.dev`, `maya@orcaboard.dev` | Board edits, questions, analytics, project meta |
| Client | `sophia@acmestudio.co`, `leo@acmestudio.co` | Review + answer questions (Website Redesign, Mobile App MVP) |

## Features

- **Kanban + table views** - real pointer-based DnD (`@dnd-kit`), hydration-safe board, **anchor-translated drag ordering that stays correct while filters hide cards**, optimistic moves, column keys `todo / in_progress / in_review / done`.
- **Debounced search & filters** - home page filters the project grid (`lodash debounce`, 250 ms, matching name + description); the board has a FilterBar (search title + tag-stripped rich text, 200 ms) plus **assignee filter** (all / *unassigned only* / member) and **priority filter**, a live "N of M tickets match" count and one-click reset (testids `project-search`, `board-filterbar`, `ticket-search`, `assignee-filter`, `priority-filter`, `filter-reset`). The overview progress strip always reflects the unfiltered project.
- **Per-project card-header gradients** - `gradientKey` on the project (null = automatic name-hash cover keeps the legacy look); **11 tasteful presets** (`.grad-proj-*` CSS; indigo/ocean/steel/sky/teal/amber + rose/emerald/lagoon/mist/midnight - navy family and tasteful distinct hues, no violet/fuchsia); picked via gradient swatches in the project edit dialog; server-side allowlist + zod; empty-string legacy placeholder normalizes to null everywhere (no "Unknown header gradient." regressions).
- **Quick-add default question set** - admin/team configure per-project question templates (prompt, choice/text, options with per-option text note, single/multi, required) inside the project edit dialog (`default-questions-editor`, max 5); the ticket questions panel gets a one-tap **"Default set"** button (`quick-questions`) that inserts every template as an **independent copy** - later template edits never mutate already-created questions. Nothing is hard-coded: an empty set hides the button.
- **Client verification questions** - embedded per ticket; choice questions (single/multi) where **any option can demand a text note** when picked (`textOptionIndexes` + `optionTexts`), or free text; `required` questions block approval. Authorable **inside the create-ticket modal** (draft mode) and editable/deletable afterwards - option edits sanitize existing answers atomically.
- **Board backgrounds (Trello-style)** - admins/team pick a curated Unsplash landscape (allowlisted server-side); the whole project sees it, only admins/team change it.
- **Tickets** - priority, assignee (member-only), due date (overdue surfacing), attachments (presigned cloud uploads), rich-text comments + rich description editors (Tiptap, images-only uploads, storage-safe) with full **media cleanup lifecycle** (see env section above).
- **Client tick visibility** - every role sees `✓ Name` chips on picked options and inline notes.
- **Review workflow** - `approved → Done`, `changes_requested → In Progress` (note required), `under_review` keeps column; strictly client-only enforced.
- **Activity timeline** - created, field-level diffs (title/priority/assignee/due-date), moves, comments, attachment add/remove, question lifecycle + answers, reviews.
- **Analytics** (`/analytics`, admin/team) - KPIs, column/priority bars, review donut, created + activity 14-day charts, assignee workload, client-response coverage, avg hours to Done, overdue list. **Recharts**, server-computed from real data.
- **Knowledge brain** (`/knowledge`, admin/team) - force-directed graph (d3-force SVG): projects, tickets, members and pulsing nodes for unanswered *required* questions; hover traces neighbourhoods, click inspects. Per-project **health score** = `40%·delivery + 20%·review + 25%·client feedback + 15%·momentum(14d)` with a visible factor breakdown.
- **Server-side TTL caching** (`src/lib/cache.ts`) - in-process read-through cache with in-flight dedupe: org stats 2 min, knowledge graph 5 min (per-user keys, RBAC-scoped); **Mongoose post-middleware invalidates aggregates on any write** (user/project/ticket schemas) so own edits always show instantly; collaboration surfaces (board, tickets, dashboard list) are never cached. Measured: knowledge 1159→739 ms, analytics 1533→836 ms.
- **AI content review** (ticket modal, admin/team) - Gemini scores ticket text + question/option design, returns **read-only** suggestions; **never modifies content**; any failure → toast "AI assistant is temporarily unavailable (maintenance)." with zero page impact.
- **i18n EN/JA** - header switcher (`lang-toggle`), persisted in localStorage + cookie (`dymticket_lang`); chrome text only.
- **Brand system** - white base, navy/indigo gradient tokens (`--grad-banner` exact user gradient, `--grad-primary`, `--grad-soft`, `--grad-mesh`), light/dark themes, `press` micro-motion, `scroll-thin` slim scrollbars, shift-free dialogs (fixed-height grid).
- **Responsive shell** - dialogs share one primitive with `w-[calc(100%-1.5rem)]` so phones keep 12px side gutters (verified on every popup at 390px); a phone-only sticky **mobile nav strip** (`mobile-nav`) navigates anywhere; no page scrolls horizontally at 390px or 768px (`probe_responsive.py`, 17/17).
- **Modern sticky header** - borderless, downward-only feather-light layered shadow (`0 1px 2px` + `0 8px 24px -10px` navy), exactly 56px so the board's `min-h-[calc(100dvh-3.5rem)]` math lines up.
- **Full page furniture** - `not-found`, root + group `error` boundaries, `global-error`, loading skeletons, login/register with split-screen imagery.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Turbopack dev server on :3000 |
| `npm run build` / `npm start` | Production build/serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm run seed [-- --force]` | Reset demo workspace (users, 2 projects, tickets, questions) |

QA helpers live outside the app in `D:\orca-onboarding\.qa\`:
`e2e_kanban.py` (23 Playwright checks) plus focused probes - `probe_responsive.py`
(responsive sweep + modal gutters), `probe_quickset.py` (quick-add default
question set, gradient edge cases), `probe_round15.py` (search/filter/gradient/
header features), `probe_richtext.py`, `probe_ui.py`, `probe_cache.py`
(caching + invalidation), `probe_scrolllock_clean.py`, `probe_strip_pos.py`,
`probe_modal_overflow.py`, `probe_wow.py`, `probe_text_options.py`,
`probe_roles_questions.py`.

## Architecture map

```
src/
  app/
    (app)/            dashboard (projects) · projects/[id] (board) · analytics · knowledge · admin
    api/              auth · projects · tickets(+move/review/comment/questions/ai-review) · uploads · files · admin
    actions/          server actions: projects (create/update meta + gradient + default set, members)
    login/ register/  split-screen auth
    error.tsx · loading.tsx · global-error.tsx · not-found.tsx
  components/         app-shell (header + mobile nav) · dashboard/ (projects-view) · board/ (kanban-workspace, table-view, ticket-modal, questions-panel, review-panel, ai-review-panel, members-dialog, background-dialog, project-edit-dialog) · analytics/ · knowledge/ · ui/ (radix primitives)
  lib/                auth (JWT cookie + RBAC) · models · serialize · validation (zod) · services/ (tickets, projects, stats, knowledge, ai-review) · cache (TTL + invalidation) · gradients (presets + allowlist) · i18n/ (EN/JA)
  proxy.ts            edge JWT-signature gate for protected prefixes only
```

RBAC: `getProjectAccess(projectId, level, user)` - `read` = any member, `write` = admin/team (AI review, project meta incl. name/description/gradient/quick-add set), `review` = client-only; global admin bypasses read/write, never review.

## Known gotchas

- **Mongoose model cache**: `models.X ?? model(...)` pins the schema until process restart - when `models.ts` changes, **restart the dev server** (then reseed with `npm run seed -- --force`; reseeding resets user-made demo edits and IDs change).
- **Turbopack stale CSS**: newly added arbitrary Tailwind classes may not hot-rebuild - verify computed styles or restart dev after `globals.css` edits (seen with the scrollbar + shadow utilities).
- **Arbitrary `shadow-[...]` computed style**: Tailwind v4 emits leading transparent var-default layers in `computedStyle.boxShadow` - assert the real color layer, not `!== none`, or the check is a false positive.
- Next 16: cookie-reading segments may need `export const instant = false`; `proxy.ts` must never write cookies.
- npm on this machine: `.npmrc` sets `omit=dev` → install with `--include=dev`.
- e2e relies on stable `data-testid`s - never rename them.

See `IMPLEMENTATION-NOTES.md` for the decision log and bug history; `CLAUDE.md` for agent-oriented working instructions.
