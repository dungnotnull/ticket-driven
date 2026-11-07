# MVPS - Minimum Viable Product Scope (DymTicket)

Defines what "MVP complete" means for this project: the contracted feature
set, explicit out-of-scope items, and the acceptance evidence for each core
flow. All items marked MVP were IMPLEMENTED and are Playwright-verified.

## In-scope (implemented, verified)

### Roles & access
- **Auth**: email/password (bcrypt) + httpOnly JWT cookie; first registered
  account becomes global admin; self-registration grants `team` role; client
  accounts are created by admins and linked to specific projects.
- **RBAC matrix** (server-enforced everywhere, not just UI):

| Capability | Global admin | Project admin | Project team | Project client |
|---|---|---|---|---|
| View board/table/dashboard | Yes | Yes | Yes | Yes (assigned projects only) |
| Create/edit projects, backgrounds, gradients, quick-add set | Yes | Yes | Yes | No |
| Create/edit/move tickets, comments, questions | Yes | Yes | Yes | No |
| Answer verification questions | No | Yes | Yes | Yes |
| Submit review verdict | No | No | No | Yes |
| Admin console (users, global roles, deletion, client-user creation) | Yes | No | No | No |
| AI review trigger | Yes | Yes | Yes | No |

### Kanban core
- Multi-project dashboard with search; board (4 columns: todo / in_progress /
  in_review / done) + list/table view; pointer DnD reordering with correct
  ordering even while filters hide cards; hydration-safe board mounting.
- Tickets: title, Tiptap-rendered rich description, priority, member-only
  assignee, due date with overdue surfacing, R2 attachments, rich-text
  comments, activity timeline with field-level diffs.

### Client collaboration loop (the "MVP heart")
1. Team creates ticket, optionally adds verification questions (or taps the
   project's **Default set** - independent copies) inside the create modal.
2. Client opens the ticket, answers questions (any option may require a
   text note), sees `✓ Name` ticks of everyone's picks.
3. Client submits a review: **approved** -> column becomes `done`;
   **changes_requested** (note required) -> column becomes `in_progress`;
   stays otherwise. `required` questions with zero answers block approval.
4. Team iterates; activity timeline records every step.

### Project meta (admin/team)
- Editable name/description; curated board backgrounds; card-header
  gradient presets (6, brand-safe); per-project default question set.

### Observability surfaces
- Analytics dashboards (admin/team), knowledge-brain graph + health score
  (admin/team), global activity timeline per ticket.

### Platform
- EN/JA chrome i18n with persistence; light/dark themes; SEO surfaces
  (robots, sitemap, OG/Twitter cards, noindex on authed pages); loading /
  error / not-found chrome; responsive verified 390px + 768px; TTL server
  cache for aggregate-heavy surfaces with instant write invalidation.

## Explicitly OUT of MVP scope

- Email verification, password reset, email invites (skipped by user choice).
- Realtime sync (no websockets/SSE in MVP).
- Subtasks, ticket dependencies, epics, milestones.
- Per-card cover images (gradient headers only).
- Mobile-native app (responsive web only; PWA deferred).
- Billing, SSO, 2FA, audit-log export.
- Server-side search/pagination at large scale (client-side for demo scale).
- Non-Atlas databases; non-R2 storage (cloud-only directive).

## Acceptance evidence (how MVP is proven green)

- `D:\orca-onboarding\.qa\e2e_kanban.py`: **23/23 checks** (auth flows, RBAC
  UI gating, kanban move + review column shifts, questions lifecycle,
  storage-safety 503, admin flows).
- Per-feature probes (all must end green with **0 console errors**):
  `probe_ui` 21/21, `probe_richtext` 18/18, `probe_cache` (TTL +
  invalidation), `probe_quickset` 23/23, `probe_responsive` 17/17,
  `probe_round15` 14/14, `probe_modal_overflow`, `probe_scrolllock_clean`,
  `probe_strip_pos`, `probe_wow` 14/14.
- Static gates: `npm run typecheck` + `npm run lint` = 0 problems.
