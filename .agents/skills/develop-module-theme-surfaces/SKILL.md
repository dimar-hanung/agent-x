---
name: develop-module-theme-surfaces
description: >-
  AgentX visual surface system (theme tokens, white app chrome, recessed content
  well, raised panels, premium gradients). Use when changing colors, backgrounds,
  card/table/panel surfaces, dark mode tokens, or dashboard/chat shell chrome.
---

# Develop Module: Theme & Surfaces

## When to Use

- Changing any color token in `app/globals.css` (`:root` / `.dark`)
- Adding a new panel, card, table, or list container that must read as raised
- Touching the dashboard shell (sidebar chrome, content well) or the chat shell
- Adding a background/gradient anywhere, or debugging "why is this surface invisible"
- Adjusting shadcn primitives whose default `bg-background` no longer fits

## Overview

Surfaces are a deliberate three-step **ladder**, not a flat palette. The page background is *recessed* — it is not white in light mode and not the darkest possible in dark mode by accident. Everything else is positioned relative to it.

| Step | Token | Light | Dark | Used for |
|------|-------|-------|------|----------|
| Chrome (top) | `--sidebar` | `#fff` | `#1c1616` | Sidebar + the frame around the well |
| Panel | `--card` / `--popover` | `#fff` | `#1d1717` | Cards, tables, lists, inputs, modals |
| Well (recessed) | `--background` | `#f7f2f2` | `#0f0b0b` | Page content area |

**Consequence:** `bg-background` is now a *recessed* surface. Anything that should look raised — cards, inputs, modals, outline buttons, floating controls — must use `bg-card` / `bg-popover` / `surface-panel`, never `bg-background`. This is the single most common mistake when adding UI here.

Neutrals carry a small chroma at hue ~20–25 (a whisper of the crimson brand hue) so grays read warm rather than clinical. Keep new neutrals on that hue; do not introduce cool gray, violet, or indigo.

## Key locations

| Area | Path |
|------|------|
| All tokens, gradients, elevation, surface utilities | `app/globals.css` |
| Dashboard shell (applies `surface-chrome`) | `app/dashboard/layout.tsx` |
| Sidebar chrome + content well wiring | `components/ui/sidebar.tsx` — `Sidebar`, `SidebarInset` |
| Card base (uses `surface-panel`) | `components/ui/card.tsx` |
| Chat shell chrome | `components/chat/chat-sidebar.tsx` |
| Panels that opt into the raised surface | `components/dashboard/{users,schedules,todos,memories,files}/*`, `app/dashboard/settings/page.tsx` |

## Surface utilities

Three utilities in the `@layer utilities` block of `app/globals.css`. Use these instead of hand-rolling gradients.

| Class | What it does | Pair with |
|-------|--------------|-----------|
| `surface-chrome` | Vertical white→warm-white gradient for app chrome | `bg-sidebar` |
| `surface-well` | Two faint corner blooms (brand rose top-right, warm shade bottom-left) for depth | `bg-background` |
| `surface-panel` | **Self-contained**: sets `background-color`, gradient sheen, and `--elevation-panel` shadow | nothing — do not add `bg-card` or `shadow-*` |

`surface-panel` sets `box-shadow` directly, so a `ring-*` or `shadow-*` utility on the same element will clobber it. Put focus rings on a child or an inner wrapper.

## Behavior agents must know

- **New table / list / card container:** `surface-panel overflow-hidden rounded-lg border`. Do not use `rounded-lg border` alone — with a recessed page it reads as an empty outline, and the user explicitly wants cards to be noticeable.
- **Never nest a panel inside a panel.** Two `surface-panel` layers stack two gradients and two shadows and looks broken. Use one outer frame plus `divide-y` / `border-b` separators. `app/dashboard/settings/page.tsx` is the reference pattern: one `surface-panel` frame, `IntegrationRow` children with no surface of their own.
- **The dashboard uses `Sidebar variant="inset"`.** The `SidebarProvider` wrapper paints the chrome; `sidebar-inner` is forced `bg-transparent` for that variant so the wrapper's gradient runs seamlessly through the sidebar column *and* its gutters. Painting `bg-sidebar` back onto `sidebar-inner` creates a visible vertical seam.
- **`SidebarInset` carries `ring-1 ring-border`, not `shadow-sm`.** The well is recessed; a drop shadow would say "raised" while the color says "recessed".
- **Gradients are direction-committed:** chrome runs top→bottom; the well uses corner-anchored radial blooms (so page height does not stretch the effect); cards get a top-down sheen. Keep alphas in the 0.05–0.12 range — these must stay subtle.
- **Dark mode keeps the same relationships,** not the same values: well is deepest, chrome and cards sit above it. Verify both themes when touching tokens; the toggle lives in `components/dashboard/nav-user.tsx` (dashboard) and `components/ui/theme-toggle.tsx` (chat).
- **Brand accent is crimson** (`--primary` ≈ `#d9005a`). `--sidebar-accent` is a faint blush so nav hover/active reads branded instead of gray. Active nav also gets a `before:bg-primary` left bar in `components/dashboard/nav-main.tsx`.
- Tokens are global, so a token change hits `/chat` and `/login` too. That is intentional — the chat shell follows the same white-chrome / recessed-content language.
- Verify compiled output rather than guessing: fetch the dev server's CSS chunk and grep for the token or utility. Tailwind emits sRGB hex fallbacks alongside `oklch()`, which makes the ladder easy to eyeball.

## Learned user preferences

- Sidebar must be **white**; content area **slightly** darker so cards are noticeable. "Slightly" is a real constraint — do not push the well toward mid-gray.
- Premium feel should come from warm-tinted neutrals, soft tinted shadows, and restrained gradients — not from neon glow, heavy saturation, or violet/indigo gradients.

## Learned Workspace Facts

- `--input` is a **border** color in shadcn v4, not a fill. Input fills were switched from `bg-transparent` to `bg-card` so fields stay distinct when placed directly on the well.
- `dialog.tsx`, `alert-dialog.tsx`, and `sheet.tsx` use `bg-popover` (modals are the most elevated surface). The mobile sidebar overrides this with `bg-sidebar` via `SheetContent`.
- Kanban columns in `components/dashboard/todos/todo-kanban-column.tsx` are intentionally **fill-free** — hairline border plus header divider only — so white todo cards pop against the well without nesting surfaces.
- **Empty states:** use `components/dashboard/dashboard-empty-state.tsx` (`DashboardEmptyState`) for dashboard list/workspace zero-data and no-results views. `variant="panel"` for primary content area; `variant="inline"` for nested panels (e.g. snapshot sidebar). Always include title + helpful description + next action when one exists (CTA button or reset filter).
- `sidebarMenuButtonVariants` outline variant previously used `hsl(var(--sidebar-border))` against OKLCH tokens, which produced no border. It now uses `var(--sidebar-border)` directly.
