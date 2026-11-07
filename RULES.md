# RULES (DymTicket)

Binding rules for anyone (human or agent) working in `kanban-app/`. These
were established through user directives and verified incidents; breaking
one is a review failure.

## 1. Platform & infrastructure

- **No Docker. Ever.** Database = MongoDB Atlas in the cloud (user
  directive). Do not start containers, do not write compose files.
- **Storage is cloud-only.** Uploads MUST use Cloudflare R2 presigned PUTs.
  No local upload fallback may be reintroduced; without credentials the
  designed behavior is a calm 503 toast (`att.unconfigured`), and legacy
  `.data/uploads` files stay DOWNLOADABLE only.
- Do NOT touch sibling directories under `D:\orca-onboarding` (other
  projects live side by side; `kanban-app/` is fully self-contained).
- On this Windows host, npm needs `--include=dev` (user `.npmrc` sets
  `omit=dev`) - never "fix" that by editing the user config.

## 2. Security

- Real secrets live ONLY in `.env.local` (gitignored). `.env.example` may be
  committed but must contain placeholders only.
- Never commit keys, tokens, Atlas URIs, R2 credentials or `.data/uploads`
  files. `.gitignore` (app + workspace root) is part of the security
  contract - extend it whenever a new secret-shaped artifact appears.
- Server-enforced RBAC only: the client never decides authorization. Review
  is strictly client-only (global admins are deliberately excluded).
- Upload serving validates ticket -> project membership per request;
  private CDN-less serving via `/api/files/[...key]` must stay
  authentication-checked.
- Never mutate ticket/question content from AI output; AI review is
  read-only and must only ever fail as `ApiError(503, MAINTENANCE)`.

## 3. Frontend & brand

- Brand: white + deep navy/indigo. NO violet/fuchsia/lavender accents. The
  banner gradient is reserved for the homepage banner only.
- The app header is borderless with a downward-only light shadow (exactly
  56px tall); dialogs keep 12px side gutters on phones
  (`w-[calc(100%-1.5rem)]`); phones get the `mobile-nav` strip.
- Button micro-interactions use the `.press` utility; reduced-motion is
  respected.
- All chrome text goes through `useLang().t("key")` from
  `src/lib/i18n/dictionary.ts` (EN/JA). User data is NEVER translated;
  default locale stays `en` for QA stability.
- Gradient keys `""` and `null` both mean "automatic cover" - normalize
  empty strings before allowlisting.

## 4. Code & data

- Never rename `data-testid`s - the Playwright e2e and probes depend on
  them. Extend, don't rename.
- Server boundaries are Zod-validated; DTOs live in `src/lib/types.ts`
  (client-safe); client components never import Mongoose-typed modules.
- Quick-add question templates create INDEPENDENT copies on tickets -
  template edits must never mutate already-created questions.
- `buildMovePlan` plans reorders on FULL column lists with an `anchorId`
  ("insert before this visible card", null = append at end) - visible
  (filtered) UI never maps indexes straight to stored orders.
- The TTL cache covers aggregates only (stats/knowledge, per-user keys) and
  is invalidated by Mongoose post-middleware on ANY write; board/tickets/
  dashboard list stay uncached - own edits must always render instantly.
- Activity events carry sentence-style notes (`changed priority: ...`);
  new event types must include actor + human-readable line for the timeline.

## 5. Quality gates (definition of done)

1. `npm run typecheck` -> 0 errors.
2. `npm run lint` -> 0 errors/0 warnings.
3. If `src/lib/models.ts` changed -> restart dev server AND reseed.
4. The round's focused `.qa` probe(s) green with **0 console errors**.
5. Full `python D:\orca-onboarding\.qa\e2e_kanban.py` -> **23/23**.
6. Append the round gate to `IMPLEMENTATION-NOTES.md` and update
   `DEVELOPMENT-TRACKING-PROGRESS.md` / `ISSUES-TRACKING.md` as applicable.

## 6. Collaboration

- Chat summaries may be written in Vietnamese (user preference); every file
  committed to the repo is **100% English** (no Vietnamese fragments, no
  em-dash characters - use plain hyphens).
- Reseeding wipes demo edits - always announce it in the round summary.
- Keep the MD documentation set synchronized when reality changes:
  - **Snapshot / how-to**: `README.md` (setup) - `PROJECT-DETAIL.md`
    (project snapshot) - `DESIGN.md` (design system) - `API-REFERENCE.md`
    (server boundaries) - `DATA-MODEL.md` (schemas) - `TESTING.md` (QA).
  - **State / traceability**: `DEVELOPMENT-TRACKING-PROGRESS.md` (log with
    LIMITATION + FUTURE-IMPROVEMENT) - `ISSUES-TRACKING.md` (open state) -
    `REQUIREMENT-LOG.md` (requirement traceability with REQ IDs) -
    `CHANGELOG.md` (keep-a-changelog) - `MVPS.md` (MVP scope).
  - **Rules / knowledge**: `RULES.md` (this file) - `SECOND-BRAIN-KNOWLEDGE.md`
    (lessons) - `IMPLEMENTATION-NOTES.md` (append-only forensics, the
    canonical source for every other doc).
