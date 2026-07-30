## When to Use

Develop or extend AgentX personal WhatsApp inbox (read-only ingest, executive summaries, per-user Evolution instance).

## Overview

Two WhatsApp modes coexist:

- **Global channel** — admin QR, users pair phone to chat with the bot (`whatsapp_channel_config`).
- **Personal inbox** — each user scans QR for their own account; messages ingested read-only into dedicated tables for summaries.

## Key locations

- Schema: `lib/db/schema.ts` — `whatsapp_user_instances`, `whatsapp_chats`, `whatsapp_messages`, `whatsapp_chat_summaries`, `whatsapp_digest_snapshots`
- Personal inbox module: `lib/integrations/whatsapp-inbox/`
  - `config.ts` — backfill + digest env helpers
  - `user-instance-repository.ts` — per-user Evolution instance lifecycle
  - `ingest/` — webhook ingest + connect backfill
  - `summary/` — executive summaries + digest snapshots
- Shared WhatsApp provider: `lib/integrations/whatsapp/` (factory, Evolution/Meta providers, webhook dedup)
- Webhook routing: `app/api/integrations/whatsapp/webhook/route.ts` (routes by `instance` name)
- API: `app/api/integrations/whatsapp/inbox/` — digest snapshots via `GET/POST .../digest`
- AI tools: `list_whatsapp_chats`, `summarize_whatsapp_chat`, `summarize_whatsapp_digest`
- Settings UI: `components/settings/whatsapp-inbox-connect-card.tsx` — connected subtitle shows `phoneE164` (Settings SSR syncs via `syncUserConnectionStatus` with `getUserInstance` fallback); Putuskan opens confirm `AlertDialog` (see `develop-feature-integrations`)
- Phone for connected personal instances comes from Evolution `fetchInstances` (`owner` / `ownerJid` / `number`) — `connectionState` does not return owner.
- Dashboard: `app/dashboard/whatsapp-inbox/` — snapshot-centric UI (`snapshot-list`, `snapshot-panel`); `snapshot-panel` renders `digestText` via shared `MessageMarkdown` (`components/chat/message-markdown.tsx`)

## References

- (none)

## Learned user preferences

- When the user asks for WhatsApp catch-up / ringkasan, always recreate the digest and persist a new snapshot in DB — do not return a recent cached snapshot.

## Behavior agents must know

- Personal instance webhooks: ingest only — no `processChannelMessage`, no outbound signals (reply, typing, read receipts).
- **Reply allowlist (critical):** the webhook may auto-reply *only* when `payload.instance === whatsapp_channel_config.instance_name`. Every other instance returns `{ ok: true, ignored: true }`. Never fall through to the bot path on an unrecognized instance — Evolution keeps zombie/rotated instances alive and a fall-through sends `UNREGISTERED_REPLY` to the user's personal contacts.
- `isUserInstanceName()` (`agentx-u-` prefix) is the second guard, so a personal instance stays silent even if its DB row was rotated or deleted.
- Global channel webhook path: AI auto-reply to registered phones. Inbound images/documents are downloaded from Evolution, saved to the user's File storage under `wa/<phone>/` (or `wa/<group>/`), and answered with the admin-configured vision model when needed.
- Instance naming: `agentx-u-{shortUserId}-{ts}` with rotation on re-pair. `discardInstance` is best-effort, so Evolution can hold **multiple open instances for the same phone**; only the one in `whatsapp_user_instances` ingests, the rest are ignored. Audit with `GET /instance/fetchInstances` when the inbox looks empty.
- Webhooks target one AgentX origin (`AGENTX_WEBHOOK_URL`, prod `127.0.0.1:3000`). Inbox changes have no effect until that server is rebuilt and restarted — `next dev` on 3001 does not receive them.
- Backfill on first connect: last N days, capped by `WHATSAPP_BACKFILL_*` env vars.
- Text-only ingest in v1; groups (`@g.us`) included for personal inbox.
- **Digest snapshots:** `generateDigest` always regenerates on each user ask (no stale snapshot reuse), batches up to 100 chats per LLM call (`getWhatsAppDigestChunkSize`), joins chunk outputs in code (no merge LLM), and inserts a new row in `whatsapp_digest_snapshots`. Concurrent in-flight calls for the same user share one promise; abort clears that in-flight work. 250 chats → 3 LLM calls → 1 new snapshot. Summarize uses `reasoning: "none"` plus fallback to `reasoningText` when DeepSeek V4 leaves `text` empty on long prompts; empty digests must not be persisted.
- **Dashboard:** snapshot-first — list recent snapshots, view all-chat digest body rendered as markdown (`MessageMarkdown`); list and digest panes scroll independently; no per-DM/per-group summary panel.
- **Agent catch-up:** call `summarize_whatsapp_digest` once for general summary asks; `summarize_whatsapp_chat` only when user names a specific chat/JID.
- Single-chat `generateChatSummary` still exists for named-chat AI tool; writes `whatsapp_chat_summaries` (not used by digest path).
- Evolution API required for `findChats` / `findMessages` on connect backfill.

## Learned Workspace Facts

- WhatsApp global-channel path excludes `summarize_whatsapp_chat` / `list_whatsapp_chats`; catch-up uses `summarize_whatsapp_digest` once, then one final WA reply (no per-step sends). Tool start still sends a short status line (e.g. "Merangkum chat WhatsApp…") via `notifyWhatsAppToolStart`.
- Overlapping WA agent runs for the same user abort the previous run and clear in-flight digest work.
