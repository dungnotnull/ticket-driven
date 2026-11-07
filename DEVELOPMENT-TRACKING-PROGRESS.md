# DEVELOPMENT-TRACKING-PROGRESS

Running log of completed work on **DymTicket** (`kanban-app/`). Companion
files: `IMPLEMENTATION-NOTES.md` (deep decision/bug log - the canonical
source this file summarizes), `ISSUES-TRACKING.md` (open items).

Legend: STATUS = `DONE` / `PARTIAL` / `SKIPPED`. Dates are coarse per build
phase (the project was built in a continuous multi-round session); the
per-round detail lives in the round gates of `IMPLEMENTATION-NOTES.md`.

## Progress log

| Date | Status | Task | Key files |
|---|---|---|---|
| Nov 2026, round 1 | DONE | Project scaffold (create-next-app, TS, Turbopack), Tailwind v4 setup, base tokens, layout skeleton | package.json, globals.css, layout.tsx |
| Nov 2026, round 2 | DONE | Auth (JWT cookie + register/login routes + edge proxy gate), first-account-becomes-admin rule, login/register split pages | lib/auth.ts, api/auth/*, proxy.ts, auth-form.tsx |
| Nov 2026, round 3 | DONE | Models + first services, projects CRUD, tickets embedded, kanban board with @dnd-kit, dashboard grid | models.ts, services/*, kanban components |
| Nov 2026, round 4 | DONE | RBAC hardening (read/write/review levels), member management, client-scoped access | rbac.ts, members-dialog.tsx |
| Nov 2026, round 5 | DONE | R2 presigned upload storage driver + attachment chips + auth-checked file serving | lib/storage.ts, api/upload/*, api/files/[...key] |
| Nov 2026, round 6 | DONE | Client verification questions v1 (accordion, radio/checkbox/text, required blocks approval), server actions for projects | questions-panel.tsx, ticket-modal.tsx, services/tickets.ts |
| Nov 2026, round 7 | DONE | OrcaBoard rebrand: white + navy/indigo gradient system, cover gradients, imagery, dark-mode retained | globals.css, projects-view.tsx, ui/* |
| Nov 2026, round 8 | DONE | Analytics (Recharts) + knowledge brain (d3-force + health score) + AI review (Gemini, 503-safe) + activity enrichment + EN/JA i18n + error/skeleton boilerplate + DymTicket rename | analytics/, knowledge/, ai-review, i18n/ |
| Nov 2026, round 9 | DONE | QA infrastructure: e2e_kanban.py 23 checks + probe_ui (favicon, cursor, gutters, board width, gallery dialog, confirm flows) | D:\orca-onboarding\.qa\* |
| Nov 2026, round 10 | DONE | Seo: metadata enriched, OG/Twitter images, robots + sitemap, per-page noindex, RBAC-guarded board metadata | layout.tsx, robots.ts, sitemap.ts |
| Nov 2026, round 11 | DONE | Tiptap rich editors (comments + description, images-only, storage-safety refusal), progress strip polish | rich editor components, probe_richtext.py |
| Nov 2026, round 12 | DONE | Rich-text refinements (badge %, collapsed panel, editor heights), storage 503 contract test in e2e | ticket-modal.tsx, e2e_kanban.py |
| Nov 2026, round 13 | DONE | Scroll-lock overhaul (no layout shift when dialogs open, overlay scrollbar handled) | ui/dialog.tsx, globals.css, probe_scrolllock_clean.py |
| Nov 2026, round 14 | DONE | Server-side TTL caching layer (cache.ts) + Mongoose middleware invalidation + probe_cache | lib/cache.ts, models.ts, stats.ts, knowledge.ts |
| 2026-11-07, round 15 | DONE | Home project search (lodash debounce 250 ms) + board FilterBar (search/assignee/priority/reset + anchor-safe DnD) + per-project card-header gradients + header redesign + probe_round15 14/14 | projects-view.tsx, board-workspace.tsx, project-edit-dialog.tsx, lib/gradients.ts, probe_round15.py |
| 2026-11-07, round 15 refinements | DONE | Header shadow moved bottom-only + feather-light field shadows + borderless header (exact 56px) | app-shell.tsx |
| 2026-11-07, round 16 | DONE | Quick-add default question set: project-level templates (max 5) edited in project dialog, ticket panel "Default set" button inserts independent copies; i18n keys EN/JA; probe_quickset 23/23 | project-edit-dialog.tsx, questions-panel.tsx, models.ts, dictionary.ts, probe_quickset.py |
| 2026-11-07, round 16 refinements | DONE | Independent-copy contract proven; project-edit dialog widened (md -> lg), short `dq.type*` dropdown labels; gradient `""` legacy edge fixed (normalize chain service/serialize/dialog); probe_quickset re-verified | project-edit-dialog.tsx, services/projects.ts, serialize.ts |
| 2026-11-07, round 17 | DONE | Site-wide responsive audit: dialog primitive phone gutters `w-[calc(100%-1.5rem)]`, mobile nav strip (`mobile-nav`), 390/768 overflow sweep + 7 modal gutter checks, probe_responsive 17/17 | ui/dialog.tsx, app-shell.tsx, probe_responsive.py |
| 2026-11-07, docs round | DONE | All MD files updated to 100% English + accurate current state (README reworked, notes restructured, CLAUDE.md refreshed; new PROJECT-DETAIL / DEVELOPMENT-TRACKING-PROGRESS / MVPS / ISSUES-TRACKING / RULES / SECOND-BRAIN-KNOWLEDGE / DESIGN); env audit + gitignore hardening | MD files, .env.example, .gitignore |
| 2026-11-07, git round | DONE | Standalone git init in kanban-app (branch main) + remote origin github.com/dungnotnull/ticket-driven; staging safety verified (no .env.local/.data/node_modules); pushed 141 files onto the LICENSE commit after rebase | .gitignore, all project files |
| 2026-11-07, round 18 | DONE | 5 more card-header gradient presets (6 -> 11: rose/emerald/lagoon/mist/midnight) with EN/JA picker names; probe_gradients2.py 11/11 + full e2e 23/23; commit + push to GitHub main | lib/gradients.ts, globals.css, dictionary.ts, .qa/probe_gradients2.py |

| 2026-11-07, round 19 | DONE | Backblaze B2 added as second S3-compatible storage provider (shared client builder; file route streams via it) + Gemini key wired with cheap lite models (gemini-3.1-flash-lite / -3.5-flash-lite) and verified LIVE end-to-end (probe_ai_live: score + suggestions, 0 console errors) | storage.ts, api/files route, .env.example, probe_ai_live.py |
| 2026-11-07, round 20 | DONE | Free-tier model rotation: `GEMINI_MODEL_FALLBACKS` chain in ai-review (per-model quota; rotates on 429/404/5xx/network/empty, never on 400/401/403); rotation proven with a bogus primary (404 -> 3.5 served, rotate warning in server log); e2e 23/23 after reseed | src/lib/services/ai-review.ts, .env.example |
## LIMITATION (current, acknowledged)

- **Search & filtering are client-side.** Home search and the board
  FilterBar operate over data the page already holds - fine at demo scale;
  large projects (hundreds of tickets) need server-side search + pagination.
- **No realtime updates.** No websockets/SSE: collaborator changes appear on
  navigation/refresh (router.refresh / re-fetch), not live.
- **No email flows.** Email verification was intentionally skipped (MVP
  choice); password reset, invites-by-email and notifications do not exist.
- **Uploads require R2 configuration.** Cloud-only storage means a fresh
  deployment without `R2_*` creds has attachments disabled by design.
- **AI review needs a Gemini key.** Without `GEMINI_API_KEY` the button shows
  the maintenance toast (by design, zero breakage).
- **Reseed wipes user edits.** `npm run seed -- --force` resets demo data
  (and IDs change) - acceptable for demos, documented everywhere.
- **Chrome-only i18n.** EN/JA covers UI text; user data is never translated;
  other locales would need dictionary work.
- **Table view filter is assignee-only.** It predates the FilterBar and
  layers alongside it; priority/search in table view come from the FilterBar.
- **Mobile covers the whole flow but is not native-grade.** The board and
  every modal are verified at 390px, yet drag & drop on touch remains
  pointer-simulation only (dnd-kit touch sensors enabled but not
  probe-verified on a real device).
- **Single-environment runtime.** TTL cache is in-process only - a
  multi-instance deployment would need a shared cache/invalidation story.

## FUTURE-IMPROVEMENT (proposal backlog, not commitments)

1. **Server-side search + pagination** for projects and tickets (indexed
   text queries behind the same debounced inputs).
2. **Realtime collaboration** (SSE or websocket) for board changes, new
   comments and review events.
3. **Notification center** - unread review answers, mentions in rich-text
   comments, due-date reminders.
4. **Ticket relationships** - dependencies/blocks, subtasks, epic grouping.
5. **Per-card cover images** (visual upgrade over gradient headers).
6. **Automation rules** - e.g. auto-assign reviewer on column change, SLA
   reminders for overdue tickets.
7. **Bulk actions** - multi-select move/assign/delete in board and table views.
8. **Calendar / timeline view** of due dates.
9. **Export/report** - CSV of tickets or PDF snapshot of a project dashboard.
10. **Unit + component test layer** (Vitest/RTL) to complement the Playwright
    probes; CI pipeline running typecheck + lint + e2e on push.
11. **Multi-instance cache adapter** (Redis) if horizontally scaled.
12. **Production deployment guide** (Vercel/self-host + Atlas + R2 + Gemini
    wiring, secrets management).

## Verification gates per round (summary)

Every feature round above ended with: `tsc --noEmit` 0 errors, `eslint` 0,
the round's focused Playwright probe(s) green with **0 console errors**, the
full `e2e_kanban.py` **23/23**, and a reseed when model schemas changed.
Round gates are documented in `IMPLEMENTATION-NOTES.md`.
