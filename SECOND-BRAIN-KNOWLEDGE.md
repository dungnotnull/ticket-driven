# SECOND-BRAIN-KNOWLEDGE (DymTicket)

Distilled, durable lessons from building this app - the "why it works and
what silently breaks it" knowledge that is easy to lose between rounds.
Forensics per bug: `IMPLEMENTATION-NOTES.md`; current state:
`PROJECT-DETAIL.md`.

## Next.js 16 (App Router, Turbopack)

- **Read the bundled docs first** (`node_modules/next/dist/docs/`) - APIs
  moved from the training-data era. Standing patterns in this repo:
  `proxy.ts` (edge, signature-only, NEVER writes cookies), and
  `export const instant = false` on cookie-reading segments.
- RSC may not `cookies().set()`; only Server Actions / Route Handlers write
  cookies (regression: once 500'd the layout).
- A sync function exported from a `"use server"` file poisons the whole
  actions chunk (every route importing it 500s). Exports from server-action
  files must be async.
- Turbopack can serve stale CSS for newly added arbitrary utilities - after
  `globals.css` edits, verify computed styles (or restart).
- Infinite redirect loops come from two half-checks disagreeing; one side
  (the edge proxy) must never bounce valid-JWT visitors - now only
  protected prefixes are matched and auth pages never redirect.

## Mongoose / MongoDB

- The `models.X ?? model()` cache keeps the OLD schema on HMR: schema edits
  require a dev-server restart (then reseed). Debugging sessions that skip
  this chase "ghost bugs" that are already fixed in source.
- Mongoose `post()` middleware hangs off the SCHEMA, and a union of write
  hooks needs an `op as never` cast. It must be attached BEFORE models
  compile - this is what makes the TTL cache invalidation trustworthy.
- Raw driver `insertOne` does not generate `_id` for nested subdocs - the
  seed sets `new mongoose.Types.ObjectId()` explicitly.
- populate must be path-correct for the root document
  (`"members.userId"`), not a flat list of root fields.

## Caching architecture lesson

- Correct layer placement: the client `apiFetch` only sends mutations and
  auth (no GET traffic), and RSC pages call services directly - so the only
  workable cache is SERVER-side read-through. TTLs (2 min stats, 5 min
  knowledge) only matter for CROSS-user aggregates; own edits reach users
  instantly because ANY write (service, route, seed) drops the cache via
  schema middleware. Collaboration surfaces stay deliberately uncached.
- In-flight dedupe matters more than TTL for burst-y pages (several
  pipelines fire together on first analytics render).

## UI / React learnings (verified by probes)

- computed-style assertions trap: Tailwind v4 emits leading transparent
  `--tw-var` layers inside `boxShadow`, so `!== "none"` is a false-positive
  check. Assert the real color layer + geometry (e.g. `8px 24px`).
- Headless browsers hide Windows overlay scrollbars: scrollbar-behavior
  probes must run headed (headless=False) or they "pass" wrong.
- Radix dialog teardown is async: Escape can leave `data-state="open"`
  overlays that intercept the next click. Probe helper `settle()` (Escape
  loop) or a clean reload before fragile interactions.
- Zero-shift dialogs: top-anchor + fixed-height grid + internal scroll on
  both columns + `scrollbar-gutter: stable`; verify by comparing the modal
  bounding box during accordion toggles (0px drift measured).
- dnd-kit hydration: `DndDescribedBy-N` comes from a module counter ->
  SSR/client mismatch. The board mounts behind a `useSyncExternalStore`
  gate (skeleton first, live DndContext after hydration) - keep the gate.
- Drag under filters: translate the VISIBLE anchor to a real order slot on
  the FULL list (`anchorId`; null = append end) - otherwise filtered views
  corrupt stored orders. The progress strip stays unfiltered on purpose.
- Independent copies beat references for user-facing duplication: the
  quick-add question set PROVED clone-at-insert is the right contract
  (later template edits must never show up inside old tickets).
- Blank-required zod fields (option labels) can make a whole dialog save
  silently die - sanitize empty template rows client-side AND make the
  error paragraph/toast trustworthy (`result.error ?? null` hides "").
- Legacy edge values normalize at THREE layers (service input, serialize,
  dialog state init) - one layer is not enough for a `""` placeholder that
  predates the allowlist (the "Unknown header gradient." incident).
- Phone modals need an explicit width contract (`100% - 1.5rem`); desktop
  `max-w-*` caps do the right thing automatically. Sweeps at 390px + 768px
  catch every popup, not just the one you edited.

## Process / agent learnings

- Write the bug row + round gate IMMEDIATELY when verified - the durable
  file (IMPLEMENTATION-NOTES.md) is append-only truth; progress/issue MDs
  summarize, they do not duplicate forensics.
- Probes are the regression suite; a "green" probe run with console errors
  is NOT green (the DESIGNED 503 resource log is the only accepted entry).
- Reseed behavior belongs in every QA story (IDs change, user edits wiped)
  so nobody mistakes a reset for data loss.
- Repo reality check before commit work: the workspace root is the actual
  git repo (`D:\orca-onboarding`), kanban-app has nested .gitignore rules
  that must keep working (`.env*`, `/.data/`).
