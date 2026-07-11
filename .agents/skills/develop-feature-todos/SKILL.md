---
name: develop-feature-todos
description: >-
  Develop or extend AgentX todos (dashboard table/kanban, CRUD API, AI tools,
  MCP). Use when working on todo UI, status labels/colors, repository, or
  wiring create/list/update/delete todo tools.
---

# Develop Feature: Todos

## When to Use

- Changing todo dashboard UI (table, kanban, detail page)
- Touching todo schema, repository, status labels/colors, or CRUD API
- Wiring create / list / get / update / delete todo AI tools or MCP

## Overview

User-scoped task board: table + kanban, detail page, native AI tools, MCP server.

## Key locations

| Area | Path |
|------|------|
| Schema | `lib/db/schema.ts` — `todos`, `TODO_STATUSES` |
| Labels / colors | `lib/todos/labels.ts` — `TODO_STATUS_LABELS`, `TODO_STATUS_COLORS` (dot + badge) |
| Repository / Zod | `lib/todos/repository.ts`, `lib/todos/schemas.ts` |
| Dashboard | `app/dashboard/todos/`, `components/dashboard/todos/` |
| Table view | `components/dashboard/todos/todo-table.tsx` |
| Kanban | `todo-kanban.tsx`, `todo-kanban-column.tsx`, `todo-card.tsx` |
| API | `app/api/todos/`, `app/api/todos/[id]/` |
| AI tools | `lib/ai/tools/{create,list,get,update,delete}-todo/` |
| MCP | `lib/mcp/todos/tools.ts`, `lib/mcp/todos/format.ts` |
| Agent skill (MCP ops) | `.agents/skills/agentx-mcp-todos/SKILL.md` |

## Behavior agents must know

- Project default for work in this repo: `agent-x` (see MCP todos skill)
- UI user-facing Bahasa Indonesia; status labels mixed (To Do / In Progress / Menunggu / Selesai)
- Status flow: `todo` → `in_progress` → `waiting` (optional) → `done`
- Status colors (single source: `TODO_STATUS_COLORS`): `todo` slate, `in_progress` sky, `waiting` amber, `done` emerald
- Kanban column headers use `.dot`; table status badge uses `.badge` via `className` on `Badge`
- Kanban reorder: persist via API move/position
- MCP response formatting emoji ≠ `description` content in DB
