---
name: develop-feature-todos
description: >-
  Develop or extend AgentX todos (dashboard table/kanban, CRUD API, AI tools,
  MCP). Use when working on todo UI, status labels/colors, repository, time
  fields (starts_at / ends_at / notify_reminder_at), or wiring todo tools.
---

# Develop Feature: Todos

## When to Use

- Changing todo dashboard UI (table, kanban, detail page)
- Touching todo schema, repository, status labels/colors, or CRUD API
- Wiring create / list / get / update / delete todo AI tools or MCP
- Changing timed-todo fields or WhatsApp start/reminder delivery

## Overview

User-scoped task board: table + kanban, detail page, native AI tools, MCP server.
Optional time window (`starts_at`, optional `ends_at`) with early reminders — separate from scheduled AI jobs.

## Key locations

| Area | Path |
|------|------|
| Schema | `lib/db/schema.ts` — `todos`, `TODO_STATUSES` |
| Labels / colors | `lib/todos/labels.ts` — status + datetime helpers |
| Time field logic | `lib/todos/time-fields.ts` |
| Repository / Zod | `lib/todos/repository.ts`, `lib/todos/schemas.ts` |
| Time form UI | `components/dashboard/todos/todo-time-fields.tsx` |
| Dashboard | `app/dashboard/todos/`, `components/dashboard/todos/` |
| Table view | `components/dashboard/todos/todo-table.tsx` |
| Table status (inline) | `components/dashboard/todos/todo-status-select.tsx` — PATCH `{ status }` via `TodoWorkspace.handleStatusChange` |
| Kanban | `todo-kanban.tsx`, `todo-kanban-column.tsx`, `todo-card.tsx` |
| API | `app/api/todos/`, `app/api/todos/[id]/` |
| AI tools | `lib/ai/tools/{create,list,get,update,delete}-todo/` |
| MCP | `lib/mcp/todos/tools.ts`, `lib/mcp/todos/format.ts` |
| Delivery | `lib/scheduler/process-todo-notifications.ts` (via worker poll) |
| Agent skill (MCP ops) | `.agents/skills/agentx-mcp-todos/SKILL.md` |

## Behavior agents must know

- Project default for work in this repo: `agent-x` (see MCP todos skill)
- UI user-facing Bahasa Indonesia; status labels mixed (To Do / In Progress / Menunggu / Selesai)
- Status flow: `todo` → `in_progress` → `waiting` (optional) → `done`
- Status colors (single source: `TODO_STATUS_COLORS`): `todo` slate, `in_progress` sky, `waiting` amber, `done` emerald
- Kanban column headers use `.dot`; table status badge uses `.badge` via `className` on `Badge` (inline table control uses same badge colors on `SelectTrigger`)
- Kanban reorder: persist via API move/position
- MCP response formatting emoji ≠ `description` content in DB

### Time fields

| Field | Role |
|-------|------|
| `starts_at` | When event/task starts; WhatsApp notify then `status = done` |
| `ends_at` | Optional planned end (display only; no auto action) |
| `notify_reminder_at` | `timestamptz[]` early pings; remove timestamp after fire |

- Default reminder: 1 hour before `starts_at` when reminders omitted on create
- Explicit `notify_reminder_at: []` = no early reminders
- Clearing `starts_at` clears `ends_at` and reminders
- No `done_at` / `due_at` / `notify_at`
- Does not create `scheduled_jobs` rows
- `listTodosDueToStart` must use drizzle `lte(todos.startsAt, now)` + `isNotNull` — interpolating `Date` into `sql\`...\`` crash-loops `scheduler:worker`

## References

- (none)

## Learned user preferences

- (none yet)

## Learned Workspace Facts

- Kanban columns use fixed mobile width (`w-[min(85vw,20rem)] shrink-0`) with horizontal scroll; from `md` they use `flex-1`
- Touch drag uses `TouchSensor` (200ms delay) + `MouseSensor`; do not put `touch-none` on cards or mobile scroll breaks
