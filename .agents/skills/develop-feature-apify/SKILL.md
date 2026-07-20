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
| Result notify | `lib/ai/apify/notify.ts`, `analysis.ts`, `preview.ts`, `social-card.ts` |
| Social result cards | `components/chat/social-media-result-cards.tsx` |
| WhatsApp media | `lib/integrations/whatsapp/provider.ts`, `providers/unofficial-evolution.ts` |
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
- `.env` token must be a bare Apify token (`apify_api_…`). A duplicated `APIFY_API_TOKEN=APIFY_API_TOKEN=…` value yields Apify HTTP 401 and failed snapshots.
- Add WA progress labels in `tool-progress-labels.ts` for each new fetch tool.
- Keep Exa secondary for social listening — Exa tool descriptions and `PROMPT_EXA` already defer to Apify.
- Twitter/X uses `api-ninja/x-twitter-advanced-search`. Its contract mixes `search_type` with camelCase grouped fields such as `numberOfTweets`, `contentKeywords`, and `timeSince`; keep the mapper aligned with the actor input schema.
- Twitter/X always sends `search_type: "Top"`, defaults to 100 items (actor minimum 20), and combines tool-level `search_terms` into one OR `query`. The `latest` intent expands to a concrete seven-day Jakarta date window.
- Do not infer Twitter/X `contentLanguage` from the user's conversation language. Leave it unset unless explicitly requested; this actor uses `in` for Indonesian.
- The Twitter/X actor can return `{ "noResults": true }` dataset sentinels. Preview and analysis code must skip these records and show a useful empty-result message instead of `Item tanpa teks`.
- Completed snapshot messages store up to three compact `socialPreviews` in message metadata. The web chat renders them as wide source cards before the analysis text.
- Preview extraction should expose a post `imageUrl` when available. Prefer post media or cover fields; never use profile pictures as the card image.
- Evolution sends the first preview with an image through `/message/sendMedia/{instance}`, then sends the full analysis as text. Media failures are logged and must not block the text analysis.
- Migration numbering on this branch: Apify table is `0011_hard_wasp` (after `0010_left_kitty_pryde` memories). Do not reintroduce the noop `0010_apify_social_snapshots`.
- After merging Apify, apply `drizzle/0011_hard_wasp.sql` (or `npm run db:migrate` / push). Without `apify_social_snapshots`, tools throw and `agentx-apify` crash-loops with `relation does not exist`. This DB may have been provisioned via push (empty `drizzle.__drizzle_migrations`) — prefer applying the Apify SQL if migrate would replay older files.
- Worker env file matches scheduler on this branch: `tsx --env-file=.env` (not `.env.local`).
- PM2 process: `agentx-apify` (`npm run apify:worker`).
