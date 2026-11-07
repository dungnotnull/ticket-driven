# DESIGN (DymTicket design system)

The visual contract for this app. Tokens live in `src/app/globals.css`
(Tailwind v4, CSS-first). If a value here and `globals.css` disagree,
`globals.css` wins and this file gets updated.

## Brand foundations

- **Palette story**: white base + deep navy/indigo gradient accents
  (user-specified). Forbidden accents: violet, fuchsia, lavender (taste
  rule), regardless of trend.
- **Theme system**: light-first (white surfaces); dark mode retained as
  `[data-theme="dark"]` override; a pre-paint inline script prevents
  wrong-theme flash.
- **Type**: system stack via Tailwind defaults; strong hierarchy from
  weights/spacing, not exotic fonts.

## Signature gradients

| Token | Value (exact) | Reserved for |
|---|---|---|
| `--grad-banner` | `linear-gradient(135deg, rgb(30,27,75) 0%, rgb(49,46,129) 30%, rgb(67,56,202) 60%, rgb(30,58,95) 100%)` | Homepage banner ONLY |
| `--grad-primary` | `#312e81 -> #4338ca -> #1e3a5f` (brighter in-family stops) | Buttons, logo text |
| `--grad-soft` / `--grad-mesh` | navy/indigo families, de-violetted | Soft backgrounds, decorative mesh |

Exposed as Tailwind v4 `@utility` classes (`bg-gradient-primary/banner/soft/
mesh`, `text-gradient-primary`, `elev-card`, `elev-dialog`) so `hover:`
variants work.

## Elevation

- Cards: `elev-card` (1px border `--border` + soft ambient shadow).
- Dialogs: `elev-dialog` (deeper shadow), fixed-height grid on desktop
  (`md:h-[78vh]` ticket modal), top-anchored (`top-[4vh]`), zero layout
  shift on inner accordion toggles.
- **Header**: borderless; the ONLY separator is a downward-only layered
  shadow - `0 1px 2px rgba(13,18,38,0.03), 0 8px 24px -10px
  rgba(37,51,116,0.14)`; height exactly 56px (`h-14`), matching the board's
  `min-h-[calc(100dvh-3.5rem)]`.
- **Search fields**: feather-light field shadow `0 1px 2px
  rgba(13,18,38,0.04), 0 2px 10px rgba(37,51,116,0.07)` so inputs do not
  sink into white surfaces.

## Project visuals

- **Card-header gradients** (6 presets, `.grad-proj-*`): `indigo`, `ocean`,
  `steel`, `sky`, `teal`, `amber`. Chosen in the project edit dialog
  (`gradient-picker`, click selected swatch again to reset). Server
  allowlist `isProjectGradient`; `null`/`""` = automatic name-hash cover
  (legacy look is preserved when unset).
- **Board backgrounds**: curated Unsplash landscape gallery
  (server-side allowlisted); visible to the whole project, editable by
  admin/team only.

## Components (Radix-style wrappers in `src/components/ui/`)

- Button (gradient primary / outline / ghost; `.press` step-hover +
  press-scale, reduced-motion respected), Input, Select (popover options),
  Dialog with sizes `sm (max-w-sm) / md (max-w-lg) / lg (max-w-2xl) /
  xl (max-w-4xl) / 2xl (max-w-[1200px])` and the phone gutter contract
  `w-[calc(100%-1.5rem)]`, Confirm dialog, Dropdown menu, Sonner toasts.

## Responsive contract

- The shared dialog primitive reserves 12px side gutters on phones; a
  `probe_responsive.py` sweep asserts 0 horizontal overflow and modal
  gutters (left >= 5px at 390px) on: login, dashboard, analytics,
  knowledge, admin, board, and every modal surface (create-project, ticket
  `2xl`, project-edit `lg`, background `lg`, members `md`, confirm `sm`).
- **Mobile navigation**: `mobile-nav` sticky strip under the header
  (visible < 640px, `hidden` >= 640px): icon + label chips with horizontal
  scrolling; desktop nav remains `hidden sm:flex` in the header.
- Board header control groups wrap under `sm` (`flex-wrap` full-width row).

## Motion & scroll

- `.press` micro-motion on interactive elements; duration ~120ms step.
- `scroll-thin` (6px rounded slim scrollbars) + `scrollbar-stable`
  (reserved gutter, no width toggling); overlay scrollbar handling keeps
  body scroll locked without layout jump when dialogs open.

## Do / do-not checklist

- DO keep the header borderless (shadow only), dialogs guttered on phones,
  gradients in the navy family.
- DO verify look-sensitive changes with computed-style probes (see the
  boxShadow var-layer trap in `SECOND-BRAIN-KNOWLEDGE.md`).
- DO NOT introduce violet/fuchsia accents, top hairlines back on the
  header, local upload fallback UI, or violet `--grad-*` regressions.
- DO NOT let the banner gradient appear outside the homepage banner.
