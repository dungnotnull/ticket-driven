# PROJECT-DETAIL - DymTicket

One-page, always-current snapshot of this project. Deeper context lives in
`README.md` (setup), `IMPLEMENTATION-NOTES.md` (decision/bug log),
`DESIGN.md` (design system), `DEVELOPMENT-TRACKING-PROGRESS.md` (progress),
`ISSUES-TRACKING.md` (open items), `MVPS.md` (MVP scope), `RULES.md` (project
rules) and `SECOND-BRAIN-KNOWLEDGE.md` (lessons learned).

## What it is

**DymTicket** is a production-grade Kanban project-management & client
collaboration web app. Agencies (admin/team) run multiple projects on Kanban
boards; clients get scoped access to review deliverables, answer verification
questions and track progress - nothing else.

- Brand: **white + deep navy/indigo** gradients (exact user-specified banner
  gradient; no violet/fuchsia accents).
- Names: internal identifiers still use legacy values on purpose (cookie
  `kanban_session`, demo emails `*@orcaboard.dev`, `NEXT_PUBLIC_APP_NAME` was
  `OrcaBoard` historically); user-visible brand is **DymTicket**.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (Turbopack), React 19, TypeScript strict |
| Styling | Tailwind CSS v4 (CSS-first `@theme`/`@utility`), hand-rolled Radix-style primitives (no shadcn CLI) |
| Data | Mongoose 9 on MongoDB Atlas (cloud-only; Docker is NOT used) |
| Auth | `jose` HS256 JWT in httpOnly sameSite=lax cookie + `bcryptjs`, edge `proxy.ts` signature gate |
| DnD | @dnd-kit (pointer + keyboard, hydration-gated board) |
| Rich text | Tiptap-based editors (comments + ticket description, images-only upload) |
| Analytics | Recharts (server-computed from real data) |
| Knowledge brain | d3-force graph + explainable health score |
| AI | Gemini (`gemini-2.0-flash` default) - read-only suggestions, safe-to-fail |
| Storage | Cloudflare R2 presigned PUTs (cloud-only); no credentials = designed 503 toast |
| i18n | EN/JA dictionary (`src/lib/i18n`), chrome text only, localStorage + `dymticket_lang` cookie |
| Caching | In-process TTL read-through (`src/lib/cache.ts`, 2-5 min, per-user keys) + Mongoose middleware invalidation |
| Validation | Zod on every server boundary (routes, actions, service sanitize) |

## Run it

```bash
npm install --include=dev      # user .npmrc sets omit=dev
npm run seed -- --force        # demo workspace (2 projects, tickets, questions)
npm run dev                    # http://localhost:3000
npm run typecheck && npm run lint
```

Env template: `.env.example` (`MONGODB_URI`, `AUTH_SECRET`, `R2_*`,
`GEMINI_API_KEY`, `NEXT_PUBLIC_SITE_URL`). Demo accounts (password
`Password123!`): admin `admin@orcaboard.dev`, team
`alex@orcaboard.dev` / `maya@orcaboard.dev`, clients
`sophia@acmestudio.co` / `leo@acmestudio.co`.

## Feature tour (current state)

- **Home dashboard**: banner CTA, project cards with gradient covers, 250 ms
  debounced search (`project-search`, lodash) with empty/no-match states.
- **Board**: kanban + table views; FilterBar (`board-filterbar`) with debounced
  ticket search (200 ms; title + tag-stripped rich description), assignee
  filter (with first-class "Unassigned only"), priority filter, reset and a
  live `N of M` count; drag reordering stays correct under filters
  (anchor-translated `buildMovePlan`); overview progress strip stays unfiltered.
- **Tickets**: priority, member-only assignee, due date (overdue surfacing),
  R2 attachments, Tiptap-rich description/comments, activity timeline with
  field-level diffs.
- **Client verification questions**: embedded per ticket; choice (radio /
  checkboxes) with per-option text notes, or free text; required questions
  block approval; authorable in the create modal; quick-add "Default set"
  button clones project-level templates (max 5) as INDEPENDENT copies.
- **Project meta**: name/description, board background (curated Unsplash
  gallery), card-header gradient presets (11, `.grad-proj-*`), default
  question set - all editable by admin AND team (`write` level).
- **Review workflow**: client-only; `approved -> Done`,
  `changes_requested -> In Progress` (note required), `under_review` no move.
- **Analytics** (`/analytics`): KPIs, column/priority/review charts, 14-day
  created + activity, workload, coverage, avg hours to Done, overdue list.
- **Knowledge brain** (`/knowledge`): force graph + health score
  (40 delivery / 20 review / 25 client feedback / 15 momentum).
- **AI review** (ticket modal): Gemini suggestions, read-only, guaranteed-503
  maintenance toast on any failure.
- **Admin console** (`/admin`): user list, global role changes, delete
  users (never self), create accounts (client-user flow) + link to any
  project.
- **Chrome**: EN/JA switch, mobile nav strip (`mobile-nav` < 640px), 12px
  dialog side gutters on phones, borderless sticky header with light
  downward shadow.

## Architecture map

```
src/
  app/
    (app)/            dashboard · projects/[id] · analytics · knowledge · admin
    api/              auth · projects · tickets(+move/review/comment/questions/ai-review) · upload · admin
    actions/          server actions (project create/meta/members)
    login/ register/  split-screen auth
  components/         app-shell · board/ · dashboard/ · analytics/ · knowledge/ · ui/
  lib/                auth · rbac · models · serialize · validation · cache · gradients
                      services/ (tickets, projects, stats, knowledge, ai-review) · i18n/
  proxy.ts            edge JWT-signature gate (protected prefixes only, never writes cookies)
```

RBAC: `getProjectAccess(projectId, level, user)` - `read` any member,
`write` admin/team, `review` client-only; global admin bypasses read/write,
never review.

## Data entities (Mongoose, embedded-first)

- **User**: name, email (unique, trimmed/lowercased), bcrypt password,
  global role (`admin`/`team`/`client`); first registered account
  bootstraps as global admin.
- **Project**: members (`[{userId, role: admin|team|client}]`),
  `backgroundUrl`, `gradientKey` (null = automatic name-hash cover),
  `defaultQuestions[]` (quick-add templates).
- **Ticket**: canonical column keys `todo|in_progress|in_review|done` +
  numeric `order`, title, rich description, priority, assignee, due date,
  attachments, `questions[]` (with `answers[]` per member, `optionTexts[]`),
  `activity[]` timeline, `review` subdoc.

## Ops notes

- DB: MongoDB Atlas (`.env.local` in this workspace holds the dev M0
  cluster URI - gitignored, never commit).
- Storage: cloud-only R2; empty `R2_*` = designed refusal with toast.
- Reseeding (`npm run seed -- --force`) RESETS all demo data and changes IDs.
- QA: `D:\orca-onboarding\.qa\` - `e2e_kanban.py` (23 checks, must stay
  green) plus per-feature probes; never rename `data-testid`s.
