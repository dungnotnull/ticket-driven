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
| `probe_richtext.py` (18) | progress strip live-math, Tiptap editors (comment + description), bold reaches timeline, editor clear-on-send, storage-safety image refusal, collapsed AI/badge surfaces |
| `probe_quickset.py` (23) | quick-add default question set: hidden when empty, template editor persistence (incl. options), draft insert, API append, **independent copies** (template edit never mutates created ones), 390px fit, gradient `""` re-save edge |
| `probe_responsive.py` (17) | 390px + 768px horizontal-overflow sweep on all pages, every modal keeps 12px side gutters, `mobile-nav` visible < 640px / hidden >= 640px, confirm-dialog gutter |
| `probe_round15.py` (14) | header shadow assertions (REAL rgb layer + no border), home search flow (debounce/empty-state), gradient picker save -> `grad-proj-*` + `data-gradient`, board search/unassigned/priority filters + reset |
| `probe_gradients2.py` (11) | gradient palette v2 (11 presets): swatch count, pick -> save -> dashboard render + computed color, dialog persistence, 390px wrap without overflow, toggle back to automatic |
| `probe_ai_live.py` | LIVE Gemini review with a real key: admin opens ticket, clicks AI review, asserts real score/suggestions panel (not the maintenance toast), 0 console errors; also used to prove the fallback chains (bogus model -> 404 -> fallback model served; bogus key 1 -> key-level switch -> real key 2 served; server log shows both rotate warnings) |
| `probe_storage_cleanup.py` (21) | media cleanup lifecycle with REAL disk evidence: description-edit diff removes dropped images (keeps shared ones), attachment full-replace orphans removed, ticket delete wipes description+comment images, project delete cascades everything, zero orphans left; server log shows the matching `[storage] removed N/N` lines |
| `probe_cache.py` | TTL cache reads (knowledge 1159->739 ms, analytics 1533->836 ms), instant invalidation after writes, 0 unexpected console errors |
| `probe_modal_overflow.py` | real wheel: outer modal scroll dead, aside scrolls internally |
| `probe_scrolllock_clean.py` | dialog open/close: zero body/scrollbar layout shift, `data-scroll-locked` toggles |
| `probe_strip_pos.py` | progress strip geometry/position |
| `probe_wow.py` (14) | analytics SVG panels, knowledge graph nodes + inspector + health score, EN/JA toggle, AI 503 toast, timeline tracking |
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

## What to add when building a new feature

1. New testids + a focused probe file `probe_<feature>.py` following the
   current helpers (`check()`, `settle()`).
2. Extend `e2e_kanban.py` ONLY for durable user-visible contracts (keep the
   file lean - it is the release gate).
3. Append the probe result to the round gate in
   `IMPLEMENTATION-NOTES.md`, then update `DEVELOPMENT-TRACKING-PROGRESS.md`.
