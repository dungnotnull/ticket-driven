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
| 2026-11-07, round 21 | DONE | Dual-key rotation for AI review: `GEMINI_API_KEY_2` layer on top of the model chain (rotate models per key, then switch keys; only calm 503 after everything); key 2 tested = authenticates but 403 free-tier-disabled -> NOT activated (user's own condition); mechanism proven E2E via bogus key 1 -> real key 2 served | src/lib/services/ai-review.ts, .env.example |
| 2026-11-07, round 22 | DONE | Storage media cleanup: ticket delete / project cascade delete / description-edit diff / attachment replacement all clean up their media keys (attachments + description/comment/review images) per-driver (S3 delete or legacy local unlink); best-effort, cross-reference safe; probe_storage_cleanup 21/21 with real disk evidence + e2e 23/23 | storage-cleanup.ts, services/tickets.ts, services/projects.ts |
| 2026-11-07, round 22 addendum | DONE | AI rotation hardening: per-key model chain + `GEMINI_API_KEY_2` key chain (double rotation, calm 503 only after everything); new working fallback key wired + rotation proven E2E | src/lib/services/ai-review.ts, .env.local (gitignored) |
| 2026-11-07, round 23 | DONE | Security + media hardening (REQ-046): images-only uploads (pdf/video 400), max-5 caps (attachments + editor bodies), persistence sanitizer on every rich input, rate limits on 8 critical endpoints, orphan-cleanup endpoint + dialog close hooks, attachment thumbnails + lightbox, project-description rich text (edit dialog), comment Send busy-disable; probe_security_media 16/16 + storage 21/21 + e2e 23/23 | sanitize.ts, rate-limit.ts, content/graphics/cleanup route, validation.ts, rich-text.tsx, attachment-upload.tsx, image-preview.tsx, ticket-modal.tsx, project-edit-dialog.tsx |
| 2026-11-07, round 23 addendum | DONE | Backblaze B2 activated with user-supplied credentials: bucket/region auto-discovered via native v3 API, bucket CORS auto-provisioned (dymticket-presign rule), probe_b2_live 19/19 (real presign PUT + auth-checked byte-identical GET + anonymous denied + referenced-kept + cascade-delete), bucket reads 0 objects after the full e2e; e2e A8 flipped to the live-upload contract (23/23) | .env.local (gitignored), .qa/probe_b2_live.py, e2e_kanban.py |
| 2026-11-07, round 24 | DONE | Production-readiness sweep requested by the user ("test e2e everything, console 0, verify no break/infinite-loop, update MDs, then commit"): files route re-authorized by key segment (draft previews work pre-save, foreign projects blocked, calm 404s), login brake counts ONLY failed attempts (successes can never exhaust the window), knowledge-graph duplicate-key bug fixed (question ids by per-ticket index - running counter stayed 0 and collided on multi-question tickets), rare relative-time hydration noise suppressed at the 3 SSR surfaces, probe_richtext flipped to the LIVE-B2 upload contract, storage-cleanup/security probes made driver-Agnostic with REAL uploaded objects + run-unique hammer identities + self-cleanup, modal/strip probes de-flaked (index-based card pick, guaranteed column overflow). FINAL GATE: reseed -> e2e 23/23 -> reseed -> 15-probe ordered battery 15/15 exit 0 / 0 console errors -> reseed; tsc 0 / eslint 0; bucket back to 0 objects | api/files/[...key]/route.ts, rate-limit.ts, api/auth/login/route.ts, services/knowledge.ts, board-workspace.tsx, table-view.tsx, projects-view.tsx, TESTING.md, CHANGELOG.md, REQUIREMENT-LOG.md, .qa probes |
| 2026-11-07, round 25 | DONE | Localized API toasts + duplicate-name rules (user request): every API error carries a stable code (ApiError / ActionResult / ApiClientError pipeline) and `explainApi` renders the ACTIVE-locale message (EN/JA dict keys) across 16 UI surfaces; project names globally unique (global, case-insensitive) and ticket titles unique within their project (create + rename, rename-to-own-name is a no-op), 409 codes PROJECT_NAME_TAKEN / TICKET_NAME_TAKEN; image view/upload confirmed fully handled (public view suggestion skipped by design - auth-checked serving kept); caching model re-verified (TTL only on stats/knowledge aggregates with write invalidation; board/tickets/search/dashboard always fresh; per-request page rendering). GATE: reseed -> e2e 23/23 -> reseed -> probe battery 17/17 exit 0 / 0 console errors -> reseed; tsc 0 / eslint 0; bucket 0 objects | api.ts, action-utils.ts, fetcher.ts, dictionary.ts, services/projects.ts, services/tickets.ts, 16 components, probe_duplicate_names.py, probe_toast_locale.py |
| 2026-11-07, round 26 | DONE | Member-duplicate guard + loading language (user request): re-add of an existing member now 409 MEMBER_ALREADY (localized EN/JA toast via code pipeline), unknown email 404 USER_NOT_FOUND (cross-project reuse stays allowed), probe_member_unique 12/12; loading overhaul - shimmer skeletons + LoaderBar across all route loading.tsx, root default loader replaced with the Uiverse hamster wheel (HamsterLoader component, reduced-motion safe), probe_loading_ui 8/8 (flight payload markers + painted shimmer + CSS registration). GATE: e2e 23/23, battery 19/19 exit 0 / 0 console errors, reseed; tsc 0 / eslint 0 | services/projects.ts, api.ts, dictionary.ts, globals.css, skeleton.tsx, hamster-loader.tsx, 6 loading.tsx + app/loading.tsx, probe_member_unique.py, probe_loading_ui.py |
| 2026-11-08, round 27 | DONE | Console easter egg (user request): browser console on the HOME page prints the figlet "Dev by Hoang Dung" banner (client-only ConsoleBanner in a useEffect - hydration-safe, indigo %c style; Strict Mode dev double-effect tolerated, once in production); probe_console_banner 6/6 (home prints, no banner on /analytics, reprint on fresh mount, 0 console errors). GATE: tsc 0 / eslint 0 -> e2e 23/23 | ui/console-banner.tsx, app/(app)/dashboard/page.tsx, probe_console_banner.py |
| 2026-11-09, round 28 | DONE | Production-login hardening (user-reported Vercel bounce): auth success path now full-document navigates (window.location.assign(next)) so the fresh Set-Cookie is attached to the first /dashboard request - removes the client-router/cookie-jar race; server chain verified healthy on prod (login 200 + cookie header + dashboard 200; 12/13 real-browser runs; every flight carries the cookie). GATE: tsc 0 / eslint 0 -> e2e 23/23; banner probe 6/6 | components/auth/auth-form.tsx |
| 2026-11-09, round 28b | DONE | ROOT CAUSE of the Vercel bounce: shared edge cache served the SIGNED-OUT /dashboard render (embedded meta redirect to /login) because the document lacked Vary: Cookie - fixed by Cache-Control: private, no-store on all protected paths in proxy.ts; verified locally (no-store header + dashboard renders with cards on document loads), e2e 23/23 | src/proxy.ts |
| 2026-11-09, round 28e | DONE | REAL root cause: protected routes were prerendered as a cookie-less redirect('/login') shell at BUILD time (prod evidence: fresh key /projects/<id> = x-vercel-cache PRERENDER with embedded meta redirect). Fixed per the cacheComponents auth pattern: every session-gated page/layout now streams behind <Suspense> (skeleton shell prerendered, per-user content per request); build emits ◐ Partial Prerender for all protected routes; prod-sim verified (document loads + root bouncer) and e2e 23/23 | (app) layout + 5 pages + root page, proxy reverted to minimal |

## LIMITATION (current, acknowledged)

- **Search & filtering are client-side.** Home search and the board
  FilterBar operate over data the page already holds - fine at demo scale;
  large projects (hundreds of tickets) need server-side search + pagination.
- **No realtime updates.** No websockets/SSE: collaborator changes appear on
  navigation/refresh (router.refresh / re-fetch), not live.
- **No email flows.** Email verification was intentionally skipped (MVP
  choice); password reset, invites-by-email and notifications do not exist.
- **Uploads require B2 (or R2) configuration.** Cloud-only storage means a fresh
  deployment without storage creds has attachments disabled by design; the demo
  deployment now RUNS on Backblaze B2 (verified live) while repo docs stay
  generic. NEW in round 23: uploads are IMAGES-ONLY (pdf/video rejected at the
  API gate) and capped (5 attachments / 5 editor images). Rate limits are
  in-memory (single-instance scope, like the TTL cache). ROUND 24: media
  previews (draft attachments) work before a ticket exists - the file route
  authorizes via the key's own project segment.
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
