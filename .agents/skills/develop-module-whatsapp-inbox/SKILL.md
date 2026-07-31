## When to Use

Develop or extend AgentX personal WhatsApp inbox (read-only ingest, executive summaries, per-user Evolution instance).

## Overview

Two WhatsApp modes coexist:

- **Global channel** — admin QR, users pair phone to chat with the bot (`whatsapp_channel_config`).
- **Personal inbox** — each user scans QR for their own account; messages ingested read-only into dedicated tables for summaries.

## Key locations

- Schema: `lib/db/schema.ts` — `whatsapp_user_instances`, `whatsapp_inbox_events`, `whatsapp_chats`, `whatsapp_messages`, `whatsapp_chat_summaries`, `whatsapp_digest_snapshots`
- Personal inbox module: `lib/integrations/whatsapp-inbox/`
  - `config.ts` — digest and durable-worker env helpers
  - `user-instance-repository.ts` — per-user Evolution instance lifecycle
  - `ingest/` — durable event enqueue, worker processing, and atomic text promotion
  - `summary/` — executive summaries + digest snapshots
- Shared WhatsApp provider: `lib/integrations/whatsapp/` (factory, Evolution/Meta providers, webhook dedup)
- Webhook routing: `app/api/integrations/whatsapp/webhook/route.ts` (routes by `instance` name)
- API: `app/api/integrations/whatsapp/inbox/` — digest snapshots via `GET/POST .../digest`
- AI tools: `list_whatsapp_chats`, `summarize_whatsapp_chat`, `summarize_whatsapp_digest`
- Settings UI: `components/settings/whatsapp-inbox-connect-card.tsx` — connected subtitle shows `phoneE164` (Settings SSR syncs via `syncUserConnectionStatus` with `getUserInstance` fallback); Putuskan opens confirm `AlertDialog` (see `develop-feature-integrations`)
- Phone for connected personal instances comes from Evolution `fetchInstances` (`owner` / `ownerJid` / `number`) — `connectionState` does not return owner.
- Dashboard: `app/dashboard/whatsapp-inbox/` — snapshot-centric UI (`snapshot-list`, `snapshot-panel`); `snapshot-panel` renders `digestText` via shared `MessageMarkdown` (`components/chat/message-markdown.tsx`)

## References

- `docs/research/whatsapp-webhook-burst-handling.md` — pre-implementation assessment plus current burst-safe design and remaining load-test work

## Learned user preferences

- When the user asks for WhatsApp catch-up / ringkasan, always recreate the digest and persist a new snapshot in DB — do not return a recent cached snapshot.
- AgentX PostgreSQL is the personal-inbox source of truth. Do not move raw-message reads back to Evolution; the user considers that provider access an account restriction/ban risk.

## Behavior agents must know

- Personal instance webhooks: ingest only — no `processChannelMessage`, no outbound signals (reply, typing, read receipts).
- Personal webhooks bulk-insert provider events into `whatsapp_inbox_events` and acknowledge after that durable write; they do not synchronously update chats/messages.
- Run `npm run whatsapp-inbox:worker` as a separate process. It atomically claims only the oldest queued event per `userId + remoteJid`, orders by the database-generated enqueue sequence, and processes different chats with bounded concurrency.
- Text promotion uses transactional `ON CONFLICT` writes and a monotonic `lastMessageAt`. A crash after message insertion is safe to retry.
- Audio/image/video/document events are durable metadata-only placeholders with status `deferred`; no media download, transcription, or binary storage runs yet.
- Worker states are `queued`, `processing`, `completed`, `deferred`, and `failed`; stale processing locks are requeued and retry delay is exponential.
- Digest reads apply `sentAt` filtering and the configured per-chat message cap in PostgreSQL before formatting prompts.
- Before single-chat or digest summarization, capture the user's highest inbox-event sequence and poll until every event through that watermark is terminal (`completed`, `deferred`, or `failed`). The wait has no application timeout, is abort-aware, and never runs worker processing inline.
- Promoted text messages persist `sourceEventSequence`. Summary message queries include legacy rows with a null source sequence and queued-origin rows only when `sourceEventSequence <= captured watermark`; never discard the watermark after waiting.
- Named-chat entry points share one readiness gate, then resolve by chat ID or name/JID and call a non-waiting summary core. Never call `generateChatSummary` from `generateChatSummaryByQuery`, because that captures a second watermark.
- **Reply allowlist (critical):** the webhook may auto-reply *only* when `payload.instance === whatsapp_channel_config.instance_name`. Every other instance returns `{ ok: true, ignored: true }`. Never fall through to the bot path on an unrecognized instance — Evolution keeps zombie/rotated instances alive and a fall-through sends `UNREGISTERED_REPLY` to the user's personal contacts.
- `isUserInstanceName()` (`agentx-u-` prefix) is the second guard, so a personal instance stays silent even if its DB row was rotated or deleted.
- Global channel webhook path: AI auto-reply to registered phones. Inbound images/documents are downloaded from Evolution, saved to the user's File storage under `wa/<phone>/` (or `wa/<group>/`), and answered with the admin-configured vision model when needed.
- Instance naming: `agentx-u-{shortUserId}-{ts}` with rotation on re-pair. `discardInstance` is best-effort, so Evolution can hold **multiple open instances for the same phone**; only the one in `whatsapp_user_instances` ingests, the rest are ignored. Audit with `GET /instance/fetchInstances` when the inbox looks empty.
- Webhooks target one AgentX origin (`AGENTX_WEBHOOK_URL`, prod `127.0.0.1:3000`). Inbox changes have no effect until that server is rebuilt and restarted — `next dev` on 3001 does not receive them.
- There is no connect-time history backfill and no provider `findChats` / `findMessages` API. Only durable webhook events become personal-inbox history.
- Text events are promoted into summary history; groups (`@g.us`) are included. Media events remain deferred metadata placeholders until a media worker is implemented.
- **Digest snapshots:** `generateDigest` always regenerates on each user ask (no stale snapshot reuse), batches up to 100 chats per LLM call (`getWhatsAppDigestChunkSize`), joins chunk outputs in code (no merge LLM), and inserts a new row in `whatsapp_digest_snapshots`. Concurrent in-flight calls for the same user share one promise; abort clears that in-flight work. 250 chats → 3 LLM calls → 1 new snapshot. Summarize uses `reasoning: "none"` plus fallback to `reasoningText` when DeepSeek V4 leaves `text` empty on long prompts; empty digests must not be persisted.
- **Dashboard:** snapshot-first — list recent snapshots, view all-chat digest body rendered as markdown (`MessageMarkdown`); list and digest panes scroll independently; no per-DM/per-group summary panel.
- **Agent catch-up:** call `summarize_whatsapp_digest` once for general summary asks; `summarize_whatsapp_chat` only when user names a specific chat/JID.
- Single-chat `generateChatSummary` still exists for named-chat AI tool; writes `whatsapp_chat_summaries` (not used by digest path).

## Learned Workspace Facts

- WhatsApp global-channel path excludes `summarize_whatsapp_chat` / `list_whatsapp_chats`; catch-up uses `summarize_whatsapp_digest` once, then one final WA reply (no per-step sends). Tool start still sends a short status line (e.g. "Merangkum chat WhatsApp…") via `notifyWhatsAppToolStart`.
- Overlapping WA agent runs for the same user abort the previous run and clear in-flight digest work.
