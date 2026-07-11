---
name: develop-feature-apify
description: >-
  Develop or extend AgentX Apify social media snapshots (TikTok, Twitter/X,
  Threads tools, worker, cache, main-channel notify). Use when working on
  fetch_*_data tools, apify_social_snapshots, or the apify worker.
---

# Develop Feature: Apify Social Snapshots

## When to Use

- Adding or changing TikTok / Twitter/X / Threads fetch tools
- Changing Apify client, input mapping, cache hash, or worker polling
- Debugging async snapshot status (`queued` / `running` / `completed` / `failed`)
- Changing how completed/failed results land in Kanal utama or WhatsApp

## Overview

Apify tools scrape social platforms asynchronously. On cache hit they return a preview immediately (`source: "cache"`). On miss they enqueue a snapshot row, start an actor run when possible, and return `queued`/`running`. The `apify:worker` process polls Apify, stores items, then posts an assistant message to the user's main channel (metadata `source: "apify"`) and optionally WhatsApp.

## Key locations

| Area | Path |
|------|------|
| Domain client / env | `lib/ai/apify/` (`client.ts`, `env.ts`, `constants.ts`) |
| Input + hash | `lib/ai/apify/input-mapping.ts`, `hash.ts` |
| Submit / cache | `lib/ai/apify/submission.ts`, `repository.ts` |
| Worker | `lib/ai/apify/worker.ts`, `worker-service.ts` |
| Result notify | `lib/ai/apify/notify.ts`, `analysis.ts`, `preview.ts` |
| Tools | `lib/ai/tools/fetch-tiktok-data/`, `fetch-twitter-data/`, `fetch-threads-data/` |
| Schema | `lib/db/schema.ts` — `apifySocialSnapshots` |
| Migration | `drizzle/0011_hard_wasp.sql` |
| Prompt | `lib/ai/chat-config.ts` — `PROMPT_APIFY` + Exa social deferral |
| Role gate | `lib/ai/roles/tools-by-role.ts` |
| Chat UI chip | `components/chat/message-row.tsx` — `SocialMediaToolChip` |
| Env | `.env.example` — `APIFY_API_TOKEN`, `APIFY_WORKER_POLL_INTERVAL_MS` |
| Script | `package.json` — `apify:worker` |

## Behavior agents must know

- Wire new tools through `tool-keys.ts` → `index.ts` → `tools-by-role.ts` → `chat-config.ts` like other native tools (4-file folder under `lib/ai/tools/`).
- Do not expose Apify internals (token, actor IDs, run/snapshot IDs, queue jargon) in user-facing Indonesian replies.
- Soft-fail with `APIFY_NOT_CONFIGURED` when token missing; map it in `friendly-tool-error.ts`.
- Add WA progress labels in `tool-progress-labels.ts` for each new fetch tool.
- Keep Exa secondary for social listening — Exa tool descriptions and `PROMPT_EXA` already defer to Apify.
- Migration numbering on this branch: Apify table is `0011_hard_wasp` (after `0010_left_kitty_pryde` memories). Do not reintroduce the noop `0010_apify_social_snapshots`.
- Worker env file matches scheduler on this branch: `tsx --env-file=.env` (not `.env.local`).
