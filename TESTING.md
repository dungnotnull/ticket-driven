# TESTING (DymTicket)

How this project is verified. The suite lives OUTSIDE the app at
`D:\orca-onboarding\.qa\` (Playwright Python, run from a real Windows host;
the dev server must be running on `http://localhost:3000` first).

## Test pyramid here

1. **Static gates** (must be 0 at all times): `npm run typecheck`
   (`tsc --noEmit`) + `npm run lint` (flat ESLint, React-compiler-era
   rules).
2. **Focused probes** (one per feature - fast feedback while building).
3. **Full e2e regression**: `e2e_kanban.py` - 23 checks, the release gate.
4. **Manual device check** only for touch/DnD (not machine-verified).

## Full e2e: `e2e_kanban.py` (23 checks)

| ID | Check |
|---|---|
| A1 | Root redirects guests to /login |
| A2 | Admin login lands on dashboard |
| A3 | Admin sees both seeded projects |
| A4 | Project create navigates to board |
| A5 | Kanban board renders 4 columns |
| A6 | Ticket created in To Do |
| A7 | Optimistic DnD moves card across columns |
| A8 | Upload refuses safely WITHOUT cloud storage (safety toast, no chip, modal intact) |
| A9 | Comment appears in activity timeline |
| A10 | Client member added |
| A11 | Table view renders rows |
| B1-B3 | Client scoping: sees exactly member projects, QA project visible, NO create button |
| B4-B5 | Approved review moves ticket to Done (visible to client) |
| B6-B7 | changes_requested requires note (error shown) + stays In Progress |
| B8 | under_review keeps ticket column |
| C1-C3 | Team scoping: sees exactly 2 seeded projects; non-member project hidden; direct access = Not Found |
| C4 | Non-admin /admin redirects to dashboard |

## Focused probes (all must end green with 0 console errors)

| Probe | Verifies |
|---|---|
| `probe_ui.py` (21) | favicon, cursor pointer, scrollbar-gutter stable, content x-alignment, modal width, comment gap, board full-bleed + column inset, gallery dialog apply/clear/restore, confirm-dialog flows, client sees no background button |
| `probe_richtext.py` (18) | progress strip live-math, Tiptap editors (comment + description), bold reaches timeline, editor clear-on-send, **LIVE-B2 editor image upload (presign -> PUT -> auth-route preview renders while still draft)**, collapsed AI/badge surfaces |
| `probe_quickset.py` (23) | quick-add default question set: hidden when empty, template editor persistence (incl. options), draft insert, API append, **independent copies** (template edit never mutates created ones), 390px fit, gradient `""` re-save edge |
| `probe_responsive.py` (17) | 390px + 768px horizontal-overflow sweep on all pages, every modal keeps 12px side gutters, `mobile-nav` visible < 640px / hidden >= 640px, confirm-dialog gutter |
| `probe_round35.py` (20) | round-35 hearts + self-mention filter + round-35b spam guard: heart toggle on (count 1 + mine) then off (0) via API; 4 RACING heart posts by one user keep AT MOST one heart every 200 (race-safe conditional push, ids unique); 3 distinct users hearting the same reply -> 3; a client review note ("Fix the hero, please") accepts hearts; system entries (created) reject 400; UI: aria i18n EN, count matches server after reload, own heart highlighted, click unhearts / re-hearts round-trip; TRIPLE click dispatched in the same tick sends EXACTLY one toggle (synchronous busy-ref lock); typing "@" in the OWN editor never lists yourself but still lists other members; 0 console errors |
| `probe_round15.py` (14) | header shadow assertions (REAL rgb layer + no border), home search flow (debounce/empty-state), gradient picker save -> `grad-proj-*` + `data-gradient`, board search/unassigned/priority filters + reset |
| `probe_gradients2.py` (11) | gradient palette v2 (11 presets): swatch count, pick -> save -> dashboard render + computed color, dialog persistence, 390px wrap without overflow, toggle back to automatic |
| `probe_ai_live.py` | LIVE Gemini review with a real key: admin opens ticket, clicks AI review, asserts real score/suggestions panel (not the maintenance toast), 0 console errors; also used to prove the fallback chains (bogus model -> 404 -> fallback model served; bogus key 1 -> key-level switch -> real key 2 served; server log shows both rotate warnings) |
| `probe_storage_cleanup.py` (21) | media cleanup lifecycle, DRIVER-AGNOSTIC (objects uploaded through the app's own presign+PUT flow; B2 uuid keys or legacy local keys both work): description-edit diff removes dropped images (keeps shared ones), attachment full-replace orphans removed, ticket delete wipes description+comment images, project delete cascades everything; existence oracle = auth-checked GET (200 + byte-identical vs 404) so it passes on any active cloud driver |
| `probe_security_media.py` (16) | round-23/24 security battery: sanitizer round-trip (script/onerror/javascript: stripped, benign `<p>`+`<img>` kept, iframe comments sanitized), pdf+mp4 presign 400 images-only (png presign 201 with real driver), orphan-cleanup endpoint semantics via a REAL uploaded object (unreferenced removed, foreign-prefix filtered out of scope, verified 404 via auth GET), login rate limit engages with a RUN-UNIQUE throwaway identity (fresh 401s then 429 - immune to hot buckets across probe runs), probe project self-deletes at the end (keeps e2e counts stable), 0 console errors; `repro_replacing.py` regression-pins the zod undefined-transform fix |
| `probe_b2_live.py` (20) | LIVE Backblaze B2 cycle: native authorize + CORS bootstrap (bucket `dymticket-upload`, region us-east-005, dymticket-presign rule for s3_put/s3_get), app presign 201 with driver=b2, direct presigned PUT, draft PREVIEW streams BEFORE any ticket exists, auth-checked byte-identical GET, anonymous GET denied, cleanup KEEPS referenced objects (phantoms count as removed per S3 semantics), ticket delete cascade-deletes the cloud object, probe artifacts cleaned |
| `probe_cache.py` | TTL cache reads (knowledge 1159->739 ms, analytics 1533->836 ms), instant invalidation after writes, 0 unexpected console errors |
| `probe_modal_overflow.py` | real wheel: outer modal scroll dead, aside scrolls internally (card picked by BOARD INDEX - not text - so relative-time drift can never break the locator) |
| `probe_scrolllock_clean.py` | dialog open/close: zero body/scrollbar layout shift, `data-scroll-locked` toggles |
| `probe_strip_pos.py` | progress strip geometry/position; self-seeds 7 filler tickets FIRST so column overflow (and the root-clip assertion) is guaranteed regardless of demo data size |
| `probe_wow.py` (14) | analytics SVG panels, knowledge graph nodes + inspector + health score, EN/JA toggle, AI 503 toast, timeline tracking |
| `probe_final_prd.py` (11) | full-page PRD sweep as a real user: dashboard+search, board kanban+table toggle, ticket modal rich-editor LIVE-B2 image upload (draft preview renders), analytics (`analytics-view` + svg), knowledge (`knowledge-graph`/nodes/health), admin users-table; page timings recorded (dashboard/board/analytics/knowledge/admin), 0 console errors |
| `probe_duplicate_names.py` (17) | round-25 name rules: exact + case/whitespace duplicate PROJECT -> 409 `PROJECT_NAME_TAKEN`; rename onto another project's name -> 409; rename to own name (case drift) -> 200 no-op; duplicate ticket title WITHIN a project -> 409 `TICKET_NAME_TAKEN` (case variants too); the SAME title in ANOTHER project -> 201 and cross-project rename stays allowed; sibling rename clash -> 409; probe projects self-clean |
| `probe_toast_locale.py` | round-25 locale contract: duplicate-project error renders the JA wording when the UI language is `ja` and the EN wording when `en` (real create-dialog flow both passes) |
| `probe_member_unique.py` (12) | round-26 member rules: first add 201; re-adding the SAME email to the SAME project -> 409 `MEMBER_ALREADY`; unknown email -> 404 `USER_NOT_FOUND`; the SAME email in a DIFFERENT project -> allowed; throwaway probe project self-cleans |
| `probe_loading_ui.py` (8) | round-26 loading language: every client navigation's RSC flight ships its route's loading-tree marker (analytics/knowledge/board); the painted fallback (brand shimmer + loader bar) is caught under a 5s-throttled flight; `skeleton-sweep` keyframes + `.loader-bar` rule registered in document CSS |
| `probe_console_banner.py` (6) | round-27 console easter egg: the home page prints the figlet "Dev by Hoang Dung" banner in the browser console; NOT printed on /analytics; reprints on a fresh home mount; 0 console errors (React Strict Mode dev double-effect tolerated by design - prints once in production) |
| `probe_unsaved_guard.py` (14) | round-33 dirty-state guard: untouched ticket/project dialogs close silently, real edits pop the 3-button ask (Save / Keep editing / Discard), backdrop + X + Escape respect the ask; Tiptap mount normalization never reads dirty; create-dialog guard (round 33b) + question-draft dirtying |
| `probe_round34.py` (40) | round-34 + 34b multi-assignee, mentions, notifications: admin excluded entirely (no bell, unread 0); one ticket assigned to 3 members (wrap-enabled trigger shows EVERY chip + search in the picker, card chips + `kanban-assignee-more`, table row lists all names); assignment notification reached the OTHER assignee instantly; maya's status move produced `status_change` (statusTo=in_progress) for alex but NOTHING new for the actor; bell dropdown lists items, mark-all zeroes the badge, per-item mark-as-unread regrows it; `?ticket=<id>` deep link opens the RIGHT ticket modal and consumes the query; typing "@" lists all members, hover drives `data-active`, ArrowDown + Enter commits the highlighted member, and the posted comment renders the mention as a bold `.mention-chip` in the timeline; the mention notification arrives for the tagged member (the ACTOR never gets one by design); round-34b click guarantees: a READ notification click opens the modal, a repeat click on the SAME ticket re-opens it (router-dedupe path via the pending store), and a different-ticket click opens ITS modal while the board is already open; 0 console errors |
| `probe_roles_questions.py` / `probe_text_options.py` / `probe_round10.py` / `probe_hydration.py` | feature-era regression guards |
| `probe_cache.py` also asserts | the DESIGNED 503 (AI without key) logs exactly one resource line - the only accepted console entry |

## Runbook (exact)

```powershell
# 1. dev server (fresh start or after models.ts change)
cd D:\orca-onboarding\kanban-app
$env:NODE_ENV="development"; npm run dev        # background, wait for :3000

# 2. reset demo data (ALWAYS reseed before/after probes - wipes demo edits, IDs change)
npm run seed -- --force

# 3. full suite
python D:\orca-onboarding\.qa\e2e_kanban.py     # expect: 23/23 checks passed

# 4. focused probe while building
python D:\orca-onboarding\.qa\probe_quickset.py # expect: green + "0 console errors"

# 5. static gates
npm run typecheck
npm run lint
```

## Conventions agents MUST follow

- **Never rename `data-testid`s.** New UI gets a stable testid; the list
  lives in CLAUDE.md.
- Login via visible form testids (`auth-form` email/password + `auth-submit`);
  `page.context.clear_cookies()` between roles (sessions are cookie-based).
- `$env:PYTHONIOENCODING="utf-8"` (tick/JP text output).
- Screenshots land in `.qa\shots\`.
- Probe-order matters: navigate pages deliberately (some checks assert
  per-page state, e.g. modal triggers must be checked ON that page).
- Radix dialogs close asynchronously - use the probe `settle()` helper or
  reload before fragile clicks.
- Console discipline: any unexplained console error fails the run; the
  accepted single entry is the browser's own log of the DESIGNED 503
  (AI maintenance / storage unconfigured).
- Expected literals (do not reword app copy in tests): "Send comment",
  "note is required", "uploads are disabled", AI "temporarily
  unavailable".
- When a check fails: FIX THE APP FIRST (root cause), never weaken the
  assertion - tightened probes are lessons, loosened ones are regressions.
- Rate-limit-aware probes: identities that hammer login endpoints are
  RUN-UNIQUE (`hammer-<timestamp>@nowhere.dev`) so a previous run's fixed
  window cannot short-circuit the expected 401->429 ramp.
- Dev-run console noise that a cache-busted rebuild clears is NOT a product
  bug: Next's incremental cache (.next/cache) can serve stale RSC pages after
  source edits - verify console errors against a cache-busted URL or a fresh
  `npm run build`-grade restart before diagnosing.

## Round-24/25 production-readiness gates (all green)

- Round 24: reseed -> e2e 23/23 -> reseed -> full ordered battery
  (final_prd, storage_cleanup, security_media, b2_live, richtext, ui,
  quickset, modal_overflow, round15, gradients2, cache, scrolllock_clean,
  strip_pos, wow, responsive): **15/15 exit 0, 0 console errors**.
- Round 25: reseed -> e2e 23/23 -> reseed -> battery incl. the two new
  probes (duplicate_names 17/17, toast_locale PASS): **17/17 exit 0,
  0 console errors** -> reseed.
- Round 26: e2e 23/23 -> battery **19/19 exit 0, 0 console errors**
  (adds member_unique 12/12 + loading_ui 8/8) -> reseed; tsc 0 / eslint 0;
  root loading fallback (hamster wheel) verified present in SSR documents.
- Round 27: tsc 0 / eslint 0 -> e2e **23/23**; console-banner probe **6/6**
  (home prints the "Dev by Hoang Dung" figlet, other routes stay silent).
- `tsc --noEmit` 0, `eslint src` 0.
- Backblaze bucket count after everything: **0 objects** (probe artifacts and
  probe projects fully cleaned; media lifecycle leaves no residue).
- Known RARE/benign class documented (see ISSUES-TRACKING): Next incremental
  cache staleness in the dev sandbox; relative-time hydration noise now
  suppressed at the three SSR surfaces (board card, table view, home card).

## What to add when building a new feature

1. New testids + a focused probe file `probe_<feature>.py` following the
   current helpers (`check()`, `settle()`).
2. Extend `e2e_kanban.py` ONLY for durable user-visible contracts (keep the
   file lean - it is the release gate).
3. Append the probe result to the round gate in
   `IMPLEMENTATION-NOTES.md`, then update `DEVELOPMENT-TRACKING-PROGRESS.md`.


<!-- round 28e: session-gated pages stream behind Suspense; auth bounce regression covered by e2e A1-A3 + prod-sim document-load checks -->
