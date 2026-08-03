---
name: develop-feature-dashboard-overview
description: >-
  Develop AgentX dashboard home overview (attention, work snapshot, recent
  chats). Use when changing /dashboard home content, overview data aggregation,
  or what the landing summary must show.
---

# Develop Feature: Dashboard Overview

## When to Use

- Changing what appears on `/dashboard` (home after login)
- Adding or adjusting summary counts, attention rules, or recent activity
- Debating whether a module belongs on the home overview vs only in its own page

## Overview

The dashboard home is a **status + next action** surface, not a second sidebar. It answers: what needs attention, what is open, and how to continue work (usually chat).

## Key locations

| Area | Path |
|------|------|
| Page (auth + fetch) | `app/dashboard/page.tsx` |
| Overview UI | `components/dashboard/overview/dashboard-overview.tsx` |
| Data aggregation | `lib/dashboard/get-overview.ts` |
| Empty pattern | `components/dashboard/dashboard-empty-state.tsx` |
| Shared routes | `lib/site-config.ts` → `appRoutes` |

## Behavior agents must know

- **Show state, not nav duplicates.** Sidebar already lists modules; home must not be a grid of the same links.
- **Primary CTA is chat** (`appRoutes.chat`). Secondary only when attention exists (e.g. Lihat todo).
- **Attention rules** (capped): overdue open todos → starts today → ends today → active schedules with `lastError`.
- **First-use** (`isFirstUse`): empty invite to open chat — no empty metric panels.
- **Calm clear state:** when there is data but no attention items, say nothing is urgent — do not invent fake urgency.
- **One frame + `divide-y`** for lists (`surface-panel`); never nested panels or three equal feature cards.
- Copy is Bahasa Indonesia (anti-slop); dates/times use `id-ID` + `Asia/Jakarta`.

## References

- (none)

## Learned user preferences

- Home should make the next action obvious and surface work that needs attention before browsing modules.

## Learned Workspace Facts

- Overview fetches in parallel via existing repositories (todos, schedules, chats, memory count, file quota) — prefer extending `get-overview.ts` over new ad-hoc queries in the page.
