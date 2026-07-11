---
name: develop-feature-memory
description: >-
  Develop or extend AgentX user memory (durable preferences across chats).
  Use when working on remember/forget/list memory tools, user_memories schema,
  summarization extraction, system-prompt injection, or Memory dashboard UI.
---

# Develop Feature: User Memory

## When to Use

- Adding or changing remember / forget / list memory tools
- Touching `user_memories` schema, repository, or Memory dashboard UI
- Changing how memories are injected into the system prompt or extracted after summarization

## Overview

Long-term user preferences for AgentX chat. One user → many memory rows.

## Key locations

| Area | Path |
|------|------|
| Schema | `lib/db/schema.ts` — `userMemories`, `MEMORY_SOFT_CAP` (200), `MEMORY_PROMPT_LIMIT` (40) |
| Repository | `lib/memory/repository.ts`, `lib/memory/schemas.ts` |
| Prompt inject | `lib/ai/context/prepare-model-context.ts` + `formatUserMemoryBlock` in `lib/ai/chat-config.ts` |
| Auto extract | `lib/ai/context/extract-user-memories.ts` (after summarization) |
| Tools | `lib/ai/tools/remember-memory/`, `forget-memory/`, `list-memories/` |
| API | `app/api/memories/`, `app/api/memories/[id]/` |
| Dashboard UI | `app/dashboard/memories/page.tsx`, `components/dashboard/memories/memory-workspace.tsx` |
| Nav | `appRoutes.memories` in `lib/site-config.ts`, sidebar item in `components/dashboard/app-sidebar.tsx` |

## Behavior agents must know

- Injected into **all** chats (channel + conversation), max **40 newest** in system prompt
- Soft cap **200** rows per user; exact-normalize dedup on create
- Sources: `tool` (remember_memory) or `summary` (auto extract)
- Extraction is best-effort — never fail the chat request
- Management UI: dedicated **Memory** sidebar menu — list + delete only (no edit/create form)
- Not part of Integrations/Settings

## Wiring checklist for new memory tools

1. 4-file folder under `lib/ai/tools/<name>/`
2. `tool-keys.ts` → `index.ts` → `ai-tools.types.ts` → `tools-by-role.ts`
3. Keep `PROMPT_MEMORY` in `chat-config.ts` in sync with tool names
