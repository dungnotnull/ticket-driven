# ISSUES-TRACKING (DymTicket)

Single place to see what is broken/open. Deep forensics for RESOLVED items
lives in `IMPLEMENTATION-NOTES.md` (numbered bug rows 1-41 + round gates);
this file tracks the STATE.

## Open issues

| ID | Severity | Area | Issue | Workaround / plan | Status |
|---|---|---|---|---|---|
| O-1 | Low | Dev tooling | `npm install` on this machine requires `--include=dev` (user `~/.npmrc` sets `omit=dev`) - forgetting it breaks `tsc`/`eslint` | Always install with `--include=dev`; documented in README/CLAUDE | Accepted (documented) |
| O-2 | Low | Dev tooling | Mongoose model cache pins schemas until restart - editing `models.ts` needs a dev-server restart + reseed | Restart ritual documented; probes reseed automatically | Accepted (documented) |
| O-3 | Low | Dev tooling | Turbopack may serve stale CSS for newly added arbitrary utilities - a just-added `shadow-[...]`/`@utility` can look "missing" until restart | Restart dev server after `globals.css` edits; verify computed styles | Accepted (documented) |
| O-4 | Info | Ops | Uploads are cloud-only: without R2_* OR B2_* credentials attachments are disabled (designed 503 toast) | Set Cloudflare R2 creds, OR the Backblaze B2 free-tier trio (10 GB storage + 1 GB/day downloads, no credit card required) | By design |
| O-5 | Info | Ops | AI review needs `GEMINI_API_KEY`; absent key = calm maintenance toast only | Add key to enable; failure path is safe-to-fail | By design |
| O-6 | Low | Data | `npm run seed -- --force` resets demo data and changes IDs (any manually created demo content is wiped) | Reseed only before/after probe runs; note it in summaries | Accepted |
| O-7 | Info | Windows | Orca-injected git env vars (`GIT_CONFIG_COUNT` with missing keys) break plain `git` in some shells | Run git with `GIT_CONFIG_COUNT=0` or fix the injected pair | External (Orca) |
| O-8 | Low | Scale | Client-side search/filter only (see `DEVELOPMENT-TRACKING-PROGRESS.md` LIMITATION) | Server-side search is a backlog item (FUTURE-IMPROVEMENT #1) | Backlog |
| O-9 | Low | Tests | Touch/drag on real mobile devices is not probe-verified (desktop Playwright only) | Manual device check before release | Backlog |
| O-10 | Low | Deps | create-next-app reports 8 moderate advisories (dev-time dependencies) | Low-priority audit review | Backlog |
| O-11 | Info | QA | e2e A9 (comment appears in timeline) flaked ONCE (run 22/23, UI-settle timing; POST was 200). Re-run from clean state = green. NOTE: a suite run that DIES mid-flow leaves its `QA Test Project` behind and contaminates the NEXT run (A3/B1/B2 fail on counts) - reseed clears it, and probe_security_media now self-deletes its own project after its checks | None (tracking note) | Monitoring |
| O-12 | Low | Dev tooling | Next's INCREMENTAL CACHE (.next/cache) can serve stale RSC pages in a long-lived dev server after source edits - console errors (like the fixed duplicate-key) appear "still present" though the code is fixed; a cache-busted URL or a fresh dev start settles it | Cache-bust / restart before diagnosing; production builds render fresh | Accepted (documented) |
| O-13 | Info | Ops (deploy) | The B2 bucket CORS rule `dymticket-presign` currently allows only localhost:3000 origins - the REAL production origin must be added before the deployed app can upload | Add the deploy origin (s3_put/s3_get) to the bucket rule right after the domain is known | Pending (user deploy step) |
| O-14 | Info | Ops (security) | The B2 application key secret was shared in chat during activation | Rotate the key after the session (create key v2, update .env.local, delete the old) | Pending (user step) |
| O-15 | Info | Product decision | Media GET stays AUTH-CHECKED (project-scoped); anonymous/public link sharing disabled - the round-25 "open full public view" suggestion was skipped because view+upload was already verified 100%; revisit only if shareable media URLs are wanted (would need signing or a public bucket) | None (deliberate) | By design |

## Resolved highlights (all verified after fix - details in IMPLEMENTATION-NOTES.md)

- 41 logged defects/decisions across rounds 1-17, every one fixed with a
  server-verified probe or e2e assertion.
- High-impact classes: Turbopack `"use server"` sync-export poisoning (1),
  infinite redirect ping-pong with stale sessions (10), hydration mismatches
  (8/9/11/25), nested-HTML bugs (4/5/12), modal scroll overflow (21),
  silent question-set save failures due to blank zod-min options (39),
  gradient `""` re-save 400 regression (41-adjacent), drag-under-filter
  order corruption (prevented by anchor-translated `buildMovePlan`).
- Regression suite at time of writing: e2e **23/23**; probes green
  (`probe_ui` 21, `probe_richtext` 18, `probe_quickset` 23,
  `probe_responsive` 17, `probe_round15` 14, `probe_cache`, `probe_wow` 14,
  `probe_scrolllock_clean`, `probe_strip_pos`, `probe_modal_overflow`) with
  0 console errors.

## Tracking conventions

- New open issues get IDs `O-n` with severity `P0/P1/Low/Info`.
- Anything fixed is moved to "Resolved highlights" WITH its probe/evidence;
  the durable forensic row is only ever appended to
  `IMPLEMENTATION-NOTES.md` (never edited retroactively).
