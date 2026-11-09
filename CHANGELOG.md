# CHANGELOG (DymTicket)

Format: Keep-a-Changelog style groups (Added / Changed / Fixed /
Docs+Security) per build phase. The project ships as one continuously
verified build; detailed forensics live in `IMPLEMENTATION-NOTES.md`
(append-only rows 1-41 + round gates). Dates are the session's Asia/Saigon
calendar dates. Status of every line: DONE + probe-verified.

## 2026-11-09 - rounds 28-28e (production-login root cause + fix)

- **Root cause (proven on production, not guessed)**: the protected (app)
  routes were prerendered at BUILD time without a session cookie, baking
  redirect('/login') (+ a meta-refresh) into the shared static document.
  Vercel served that constant shell (x-vercel-cache: PRERENDER) with HTTP
  200 for every document load - so a signed-in visitor opening
  /dashboard (typed URL, F5, or any full navigation) got bounced to
  /login, while client-router flights happened to hit the dynamic layer
  and worked. Local dev has no production prerender layer, which is why
  the issue only appeared after deploying.
- **Fix (documented cacheComponents auth pattern)**: every session-gated
  page/layout now streams its per-user content behind a Suspense
  boundary with a skeleton fallback - the build prerenders only the safe
  skeleton shell; session checks, redirects and notFound() fire per
  request with the cookie. The build now emits all protected routes as
  Partial Prerender (static skeleton + streamed dynamic content).
- Login success still performs a full-document navigation (round 28) so
  the fresh kanban_session cookie is attached to the first /dashboard
  request; the proxy returns to its minimal signature-only JWT gate.
- Gate: tsc 0 / eslint 0 -> e2e 23/23; production-sim (next start)
  regression: login + three document loads of /dashboard stay signed in
  with rendered project cards; signed-in root / streams to /dashboard.

## 2026-11-08 - round 27 (console easter egg "Dev by Hoang Dung")

- **Console banner on the home page**: opening the browser console on the
  home page now prints the figlet "Dev by Hoang Dung" ASCII art in indigo.
  Implemented as a client-only `ConsoleBanner` mounted on the dashboard home
  (effect-based, SSR-silent, hydration-identical). The art is generated with
  pyfiglet (standard font) and embedded as a JSON-escaped string so the
  backticks/backslashes inside the glyphs survive exactly - the pasted art's
  mangled line breaks are fixed into the true single-block figlet.
- Verified by `probe_console_banner.py` (6/6): prints on home, art shape
  asserted, silent on /analytics, reprints on a fresh home mount, 0 console
  errors. Gate: tsc 0 / eslint 0 -> e2e 23/23.

## 2026-11-07 - round 26 (duplicate-member guard, modern loading language)

- **Duplicate-member rule**: adding an email that is ALREADY a member of the
  same project fails 409 `MEMBER_ALREADY` and toasts in the ACTIVE language
  ("That member is already in this project." / EN-locale message localized
  via the code pipeline); an unknown email answers 404 `USER_NOT_FOUND`
  ("ask them to register first", localized). The SAME email keeps working in
  a DIFFERENT project, and the members-dialog flow is unchanged otherwise.
  Verified by `probe_member_unique.py` (12 checks: first add 201, re-add
  409+code, unknown 404+code, cross-project reuse, self-cleanup).
- **Modern loading language**: a shared brand shimmer (`.skeleton` gradient
  sweep, static under reduced motion) + a slim indigo `LoaderBar` now top
  every route loading tree - dashboard (gradient banner, cards, search),
  board (columns + progress strip), analytics, knowledge, admin and the
  shell fallback all mirror their real layouts instead of gray pulses.
- **New default loader**: the root first-paint loader is now the Uiverse.io
  hamster wheel (`HamsterLoader` component; exact CSS ported with reduced
  motion stops). SSR documents verified to ship it; segment loading trees
  verified shipping via RSC payloads and the painted shimmer/bar caught
  under a throttled flight (`probe_loading_ui.py`, 8 checks).
- Round-26 final gate: e2e **23/23** -> probe battery **19/19 exit 0, 0
  console errors** (adds member_unique 12/12 + loading_ui 8/8) -> reseed;
  tsc 0 / eslint 0.

## 2026-11-07 - round 25 (localized API toasts, duplicate-name rules, final battery re-verified)

- **Localization of every API error/success toast**: every `ApiError` now
  carries a stable machine `code` (`VALIDATION`, `AUTH_REQUIRED`,
  `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`,
  `SERVICE_UNAVAILABLE`, `AI_MAINTENANCE`, `PROJECT_NAME_TAKEN`,
  `TICKET_NAME_TAKEN`, `INTERNAL`) and route handlers emit `{error, code}`;
  server actions return `{ ok:false, error, code }` the same way. The client
  `apiFetch` preserves the code (`ApiClientError`), and a new
  `explainApi(err, t, fallbackKey)` helper renders the message in the ACTIVE
  UI language (new `api.*` dict keys EN/JA) falling back to the caller's own
  localized string. All 16 error-toast/inline-error surfaces switched to it
  (ticket modal, review, questions, quick-add, members, admin users,
  background, attachments, rich-text uploads, moves, project create/edit).
- **Duplicate-name rules**: project names are GLOBALLY unique
  (case-insensitive + trimmed) on create AND rename; ticket titles are
  unique WITHIN their project (same normalization) on create AND rename -
  the same title in ANOTHER project stays allowed, and renaming to one's own
  existing title (case/whitespace drift) is a no-op, not a conflict. Both
  answered 409 with the codes above so the dialog/toast localizes.
- **Verified** (user's conditions): image upload + view is already 100%
  handled (draft previews included), so the suggested open-public file view
  was skipped BY DESIGN - serving stays auth-checked (private bucket, no
  anonymous media URL) and both live probes prove member viewing works.
  Caching model re-verified and documented: TTL cache only for expensive
  aggregates (org stats 2 min / knowledge 5 min, per-user, invalidated by
  every Mongoose write); board, tickets, search and dashboard lists are
  ALWAYS fetched fresh; pages render per-request (`instant = false`) - no
  static build layer can serve stale critical data.
- **New probes**: `probe_duplicate_names.py` 17/17 (exact/case variants,
  same-name rename no-op, cross-project title reuse, localized codes),
  `probe_toast_locale.py` (JA + EN inline error wording for the duplicate
  project toast). Round-25 final gate: fresh reseed -> e2e **23/23** ->
  reseed -> full battery **17/17 exit 0, 0 console errors** -> reseed;
  tsc 0 / eslint 0; bucket back to **0 objects**.

## 2026-11-07 - round 24 (production-readiness sweep: full e2e + full probe battery verified)

- **Files route re-authorization (draft previews)**: `GET /api/files/<key>`
  now derives project access from the KEY's own `tickets/<projectId>/`
  segment (project-level `read`), so media previews work while the object is
  still an ATTACHMENT DRAFT (editor image picked, ticket not yet saved);
  an attachments match only ENRICHES the response (content type / filename).
  Foreign-project keys cannot tunnel (24-hex project segment required) and
  missing objects answer a calm 404 JSON (NoSuchKey/NotFound/404 caught).
- **Login brake redesigned to count ONLY FAILURES**: `assertLoginAllowed`
  (read-only bucket check, 429 when exhausted) + `recordLoginFailure`
  (increment) - successful logins no longer consume the window, so normal
  flows can never lock themselves out; the hammer test still proves
  10 fresh 401s then 429 (run-unique identity in the probe).
- **Knowledge graph duplicate-key bug FIXED**: question node ids used a
  running counter that was never incremented during the build loop
  (`summary.questionsTotal` was only recomputed AFTER the loop) - one ticket
  holding several unanswered required questions produced COLLIDING node ids
  and React "two children with the same key" console errors on /knowledge;
  ids are now `question:<ticketId>:<questionIndex>`.
- **Hydration-time noise silenced at the source**: the three SSR-rendered
  relative-time surfaces (board card meta, table view updated column, home
  project card) get `suppressHydrationWarning` - a minute boundary crossed
  between SSR and hydration ("3m ago" -> "4m ago") used to log the (benign,
  self-recovering) hydration-mismatch error.
- **Probes brought to the live-B2 contract**: `probe_storage_cleanup.py`
  re-worked DRIVER-AGNOSTIC (uploads via app presign+PUT, uses the REAL
  returned keys including B2 uuid segments, existence oracle = auth-checked
  GET 200+bytes vs 404) - the two key-mismatch runs that "passed for the
  wrong reason" are gone; `probe_security_media.py` uses a REAL uploaded
  orphan + run-unique hammer identity + self-deletes its probe project;
  `probe_richtext.py` now proves the LIVE editor upload path
  (image inserted, draft preview renders); `probe_modal_overflow.py` picks
  cards by board index (relative-time immune); `probe_strip_pos.py` seeds
  filler tickets so the root-clip assertion no longer depends on demo data.
- **Final verification gate**: fresh reseed -> e2e **23/23** -> reseed ->
  full ordered battery **15/15 exit 0, 0 console errors**
  (final_prd, storage_cleanup 21/21, security_media 16/16, b2_live 20/20,
  richtext, ui, quickset, modal_overflow, round15, gradients2, cache,
  scrolllock_clean, strip_pos, wow, responsive) -> reseed; tsc 0 / eslint 0;
  bucket `dymticket-upload` = **0 objects** after everything.
- **Deploy checklist (user)**: add the real production origin to the B2
  bucket CORS rule (`dymticket-presign` currently covers localhost), and
  rotate the B2 application key after the session (it was shared in chat).

## 2026-11-07 - round 23 (hardening day: images-only, caps, sanitizer, rate limits, dialog media cleanup)

- **Images-only uploads across the board**: `ALLOWED_ATTACHMENT_TYPES` dropped pdf - `presignSchema` now rejects pdf/video/anything but `png|jpeg|gif|webp` (400) for attachments AND editor/paste images; e2e-safe (fixture.png path unused pdf probe removed in favour of API-probe).
- **Hard caps**: max 5 attachments per ticket (`MAX_TOTAL_ATTACHMENTS`, zod `.max()` on create+update) and max 5 images per rich-text body (`MAX_EDITOR_IMAGES`, editor toolbar counter + toast `rt.imageLimit`).
- **Persistence-side sanitizer** (`src/lib/sanitize.ts`): `stripDangerousHtml` wired into createTicket/updateTicket descriptions, create/update project descriptions, review notes + comment bodies (zod transforms); display-side DOMPurify allowlist unchanged. **Zod gotcha discovered**: a bare `.optional().transform(fn)` turns every ABSENT field into `""` - the transform must pass `undefined` through (`(v) => v === undefined ? undefined : stripDangerousHtml(v)`) or an attachments-only PATCH wipes the description AND deletes its images (caught by the storage-cleanup probe: imgD died on the attachments-replace step).
- **New orphan-cleanup endpoint** `POST /api/content/graphics/cleanup` {projectId, keys[<=50]}: RBAC project read; keys must match `tickets/<projectId>/...`; deletes only keys referenced by NO ticket (attachments `$in`, description + activity.note `$regex`); rate 15/min. Ticket + project edit dialogs now collect session-uploaded keys (editor images + pending attachments) and fire the endpoint on dialog close - the server decides, clients never diff references.
- **Rich-text editor upgraded** (`rich-text.tsx`): multi-file toolbar picker + paste loop with remaining-image budget; `onMediaKeyUploaded(key)` callback.
- **Attachment rows get thumbnails + lightbox** (`attachment-upload.tsx` + new `ui/image-preview.tsx`): blob preview while uploading, auth-checked `/api/files/<key>` when done, click-to-zoom dialog (`image-preview`), slot-cap toast, `att.preview` hint.
- **Rate limiting** (`src/lib/rate-limit.ts`, in-memory fixed window, per-instance): login 10/5min (+email), register 5/15min (+email), tickets 30/min, comments 20/min, review 20/min, ai-review 5/min, presign 30/min, media cleanup 15/min - all returning the calm 429 literal.
- **Busy disable everywhere**: comment Send (was missing) now disables on POST; review/save paths already gated - verified.
- **Project description → rich text**: edit dialog swaps Textarea for Tiptap (testid `edit-project-desc` KEPT as the contenteditable host; create dialog intentionally keeps a plain textarea - no projectId, no presign target yet); board header + home cards project plain text via `stripRichHtml`; API cap 600 → 4000.
- **Probes**: new `.qa/probe_security_media.py` 16/16 (sanitizer round-trip incl. script/onerror/javascript:, pdf+video 400, cleanup keeps referenced/imgD-safe, login hammer → 429 with a throwaway identity so it never poisons e2e accounts, 0 console errors) + `.qa/repro_replacing.py` (the zod regression). storage-cleanup 21/21, security 16/16, e2e 23/23 after the fix; reseeded.
- **Backblaze B2 activated (user creds)**: bucket/region auto-discovered via the native v3 API (limited key resolves its own bucket), bucket CORS auto-provisioned (`dymticket-presign` rule for s3_put/s3_get, localhost origins); `.qa/probe_b2_live.py` 19/19 proves the REAL cycle - presign 201 `driver=b2`, direct presigned PUT, auth-checked byte-identical GET, anonymous GET denied, referenced object survives cleanup, ticket delete cascade-deletes the cloud object; bucket reads **0 objects** after the full e2e (free tier protected). e2e A8 flipped from the designed-503 contract to the LIVE upload contract - 23/23; reseeded. Key hygiene: rotate the app key after the session (it was shared in chat).

## 2026-11-07 - round 19 (storage choice: B2 + live AI)

### Added
- Backblaze B2 as a SECOND S3-compatible storage provider: generic driver
  layer (`getStorageDriver` -> `s3ClientFor`), R2 kept as-is, B2 enabled by
  `B2_KEY_ID` / `B2_APPLICATION_KEY` / `B2_BUCKET` (+ `B2_REGION`, default
  us-west-004, `B2_PUBLIC_BASE`); the file-serving route streams through
  the same client - free tier is 10 GB storage + 1 GB/day downloads and
  the signup needs no credit card (ideal for this small project).
- Live Gemini AI review verified END-TO-END with a real key: cheap lite
  models (`gemini-3.1-flash-lite` - and `gemini-3.5-flash-lite`) validated
  via the models list AND live generateContent; full ticket review UI
  probe (`probe_ai_live.py`) PASS - real score + 5 suggestions rendered,
  0 console errors, maintenance path untouched as fallback.

### Verified
- tsc 0 / eslint 0; e2e 23/23 (A8 storage-safety unchanged); AI live probe
  in `.qa/probe_ai_live.py`.

## 2026-11-07 - round 22 (media cleanup lifecycle)

### Added
- STORAGE HYGIENE layer (`src/lib/storage-cleanup.ts`): uploaded objects
  never orphan anymore. Ticket deletion collects EVERY media key the
  ticket referenced - attachments, description images, comment images,
  review-note images - and deletes the objects; description edits and
  attachment full-replacements clean only the media they dropped; project
  deletion cascades the same cleanup across ALL tickets of the project.
  Keys still visible elsewhere on the ticket are preserved.

### Changed
- Cloud mode deletes objects through the active driver (S3
  DeleteObject); no-driver mode unlinks the matching legacy files under
  `.data/uploads`. Cleanup is best-effort: individual object failures are
  logged (`[storage] ...`) and NEVER break the outer flow - every route
  still returns the same response shape.

### Verified
- NEW `.qa/probe_storage_cleanup.py` (21 checks, 0 console errors):
  REAL disk-level deletion evidence (legacy local files actually
  disappear) across edit-diff / attachment-replace / ticket-delete /
  project-delete-cascade + no orphans left; server log shows the
  matching `[storage] removed N/N` lines. tsc 0 / eslint 0; e2e 23/23
  (one A9 comment-timeline flake in a first run; green from clean state,
  logged in ISSUES-TRACKING); reseeded after.

## 2026-11-07 - round 21 (dual-key rotation + key 2 verdict)

### Added
- SECOND API-KEY layer for Gemini review: `GEMINI_API_KEY_2`. Rotation
  order = per-key model chain first, then the next key with its full
  model chain; only when EVERY key/model combination is exhausted does
  the calm 503 maintenance toast appear (no page or flow ever breaks).
- Key rejection handling: 401 always switches keys, and 400 with
  `API_KEY_INVALID` is recognized as a key-level failure (Google reports
  bad keys as 400) instead of a request error - no wasted retries.

### Verified
- Key 2 (user-provided) TESTED: authenticates + lists 50 models, but its
  Google project has the FREE TIER DISABLED - every generateContent call
  403s with "set up billing". Per the user's own condition ("if this key
  works"), it is NOT enabled in `.env.local` (commented placeholder with
  the exact 403 reason); a REPLACEMENT second key (also user-provided,
  AI Studio project) then PASSED the same test battery - both lite
  models respond - and was wired in as `GEMINI_API_KEY_2`.
- ROTATION MECHANISM proven E2E twice: with a bogus key 1 (`AQ.Bogus...`,
  expect 400) server logged `key 1 rejected at key level - switching to
  the next API key` and the UI still rendered a real review (0 console
  errors). Final config = key 1 primary + working key 2 fallback +
  `gemini-3.1-flash-lite` / `gemini-3.5-flash-lite` chain; normal path
  re-verified after restore; e2e 23/23; tsc 0 / eslint 0.

## 2026-11-07 - round 20 (free-tier model rotation)

### Added
- LIVE MODEL CHAIN for Gemini AI review: `GEMINI_MODEL` primary +
  `GEMINI_MODEL_FALLBACKS` (comma-separated). Free-tier API quota is
  **per model**, so when the primary hits its rate limit (429) or is
  otherwise unavailable (404/5xx/network/empty output) the next candidate
  serves the request instead of degrading to the maintenance toast;
  400/401/403 (key/request problems) stop immediately - rotation cannot
  fix those and the calm 503 stays the only failure mode.

### Verified
- Rotation proven END-TO-END: `.env.local` temporarily shipped a bogus
  primary (`gemini-9.9-bogus-expect-404`) + fallback
  `gemini-3.5-flash-lite` -> server log printed the rotate warning (404)
  and the UI still got a real score + suggestions (200). Restored proper
  config (`gemini-3.1-flash-lite` primary, `gemini-3.5-flash-lite`
  fallback) and re-verified; e2e 23/23 after a reseed (one suite run hit
  leftover probe-state data, not code - reseed cleared it).

## 2026-11-07 - round 18 (richer gradient palette + first GitHub push)

### Added
- 5 more project card-header gradient presets (6 -> 11): `rose` (Soft
  rose), `emerald` (Emerald deep), `lagoon` (Lagoon cyan), `mist` (Morning
  mist), `midnight` (Midnight) - same dark -> vivid -> darkest 135deg
  pattern, EN/JA names in the picker; brand rule holds (no violet/fuchsia).

### Changed
- Project repo published: standalone git initialized in `kanban-app/`,
  remote `github.com/dungnotnull/ticket-driven`, LICENSE commit rebased,
  141 files pushed to `main` (staging verified free of `.env.local`,
  `.data/`, `node_modules`).

### Verified
- NEW `probe_gradients2.py`: 11 checks, 0 console errors (11 swatches,
  pick -> save -> rendered + computed color, persistence, 390px wrap,
  reset-to-automatic); full e2e 23/23; tsc/lint 0; reseeded after.

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
