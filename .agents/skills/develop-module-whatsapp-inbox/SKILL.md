## When to Use

Develop or extend AgentX personal WhatsApp inbox (read-only ingest, executive summaries, per-user Evolution instance).

## Overview

Two WhatsApp modes coexist:

- **Global channel** — admin QR, users pair phone to chat with the bot (`whatsapp_channel_config`).
- **Personal inbox** — each user scans QR for their own account; messages ingested read-only into dedicated tables for summaries.

## Key locations

- Schema: `lib/db/schema.ts` — `whatsapp_user_instances`, `whatsapp_inbox_events`, `whatsapp_chats`, `whatsapp_messages`, `whatsapp_contacts`, `whatsapp_groups`, `whatsapp_chat_summaries`, `whatsapp_digest_snapshots`
- Personal inbox module: `lib/integrations/whatsapp-inbox/`
  - `config.ts` — digest and durable-worker env helpers
  - `user-instance-repository.ts` — per-user Evolution instance lifecycle
  - `ingest/` — durable event enqueue, worker processing, and atomic text promotion
  - `summary/` — executive summaries + digest snapshots
  - `search/` — ILIKE message search, AI keyword generation (5 keywords per attempt, max 10 attempts), 500-chat analysis batches. Bounded to avoid stuck runs: SQL `LIMIT` per keyword (`getWhatsAppSearchMaxRowsPerKeyword`, 500), per-chat message cap (`getWhatsAppSearchMaxMessagesPerChat`, 20) + char cap (`getWhatsAppSearchMaxCharsPerChat`, 2000) applied before building the analysis prompt — never send an uncapped result set to the LLM.
  - `directory/` — Evolution `findContacts` + `fetchAllGroups` sync into `whatsapp_contacts` / `whatsapp_groups`; `directorySyncedAt` on `whatsapp_user_instances`; auto-sync on first connect + manual **Muat ulang** from dashboard. Call `findContacts` once with `{ where: {} }` only — Evolution ignores `take`/`skip` and returns the full set every time, so pagination loops never terminate. AI tools `list_whatsapp_contacts` / `list_whatsapp_groups` page DB rows (default 50, max 100) with optional `query`/`offset`; dashboard API still returns the full list.
- Shared WhatsApp provider: `lib/integrations/whatsapp/` (factory, Evolution/Meta providers, webhook dedup)
- Personal→bot bridge: `lib/integrations/whatsapp/personal-bot-bridge.ts`
- **Global bot reply queue: `lib/integrations/whatsapp/bot-queue/`** — durable queue that decouples reply generation from the webhook (`job-repository.ts` enqueue/claim/retry, `worker-service.ts` runs `processChannelMessage`, `worker.ts` entrypoint, `config.ts` env). Table `whatsapp_bot_jobs`. Run `npm run whatsapp-bot:worker`.
- Webhook routing: `app/api/integrations/whatsapp/webhook/route.ts` (routes by `instance` name)
- API: `app/api/integrations/whatsapp/inbox/` — digest snapshots via `GET/POST .../digest`; message search via `GET .../messages/search?query=`; directory via `GET .../contacts`, `GET .../groups`, `POST .../directory/sync`
- AI tools: `list_whatsapp_chats`, `list_whatsapp_contacts`, `list_whatsapp_groups`, `summarize_whatsapp_chat`, `summarize_whatsapp_digest`, `search_whatsapp_messages`
- Settings UI: `components/settings/whatsapp-inbox-connect-card.tsx` — connected subtitle shows `phoneE164` (Settings SSR syncs via `syncUserConnectionStatus` with `getUserInstance` fallback); Putuskan opens confirm `AlertDialog` (see `develop-feature-integrations`)
- Phone for connected personal instances comes from Evolution `fetchInstances` (`owner` / `ownerJid` / `number`) — `connectionState` does not return owner.
- Dashboard: `app/dashboard/whatsapp-inbox/` — tabs **Pencarian pesan** (`message-search-panel`), **Snapshot ringkasan** (`snapshot-list`, `snapshot-panel`), **Kontak** (`contact-list-panel`), **Grup** (`group-list-panel`); digest renders via `MessageMarkdown`

## References

- `docs/research/whatsapp-webhook-burst-handling.md` — pre-implementation assessment plus current burst-safe design and remaining load-test work

## Learned user preferences

- When the user asks for WhatsApp catch-up / ringkasan, always recreate the digest and persist a new snapshot in DB — do not return a recent cached snapshot.
- AgentX PostgreSQL is the personal-inbox source of truth. Do not move raw-message reads back to Evolution; the user considers that provider access an account restriction/ban risk.

## Behavior agents must know

- Personal instance webhooks: ingest only for normal contacts — no bot reply to the user's personal chats.
- **Personal→bot bridge (exception):** when a personal instance receives an *outbound* DM to the global channel phone (`whatsapp_channel_config.channel_phone_e164`), bridge it through `lib/integrations/whatsapp/personal-bot-bridge.ts` into the global auto-reply path (`processChannelMessage` + `sendWhatsAppToUser` on the global instance). Needed because with a connected personal inbox, messages the user sends to the bot often never arrive as `messages.upsert` on the global instance.
- Bridged inbound for `markAsRead` / typing must use the *sender* JID (`{senderDigits}@s.whatsapp.net`), not the personal outbound `remoteJid` (which is the bot number).
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
- **Global bot path is now decoupled (durable queue):** the webhook does the fast work (dedup, resolve user, media download/transcription/vision-gate) then calls `enqueueWhatsAppBotJob` and returns `200` immediately — it no longer awaits `processChannelMessage`. A separate worker (`npm run whatsapp-bot:worker`) claims jobs and generates + delivers the reply. This kills the old Evolution timeout→retry→dedup-drop loss. The **bridge path** enqueues too (after inline voice transcription). Jobs are keyed `(userId, waMessageId)` (idempotent vs webhook retries), processed **per-user FIFO** (`claimWhatsAppBotJobs` skips a user with an earlier queued/processing job), with attempts/backoff and stale-lock requeue. Attachments (incl. image `dataUrl` for vision) are stored in the job row JSONB. `withWhatsAppUserProcessingLock` ("latest run wins" abort) is no longer used on these paths — every message is now answered in order.
- Global channel webhook path: AI auto-reply to registered phones. Inbound images/videos use the vision model when enabled. PDF/DOCX are saved under `wa/<phone>/` (or `wa/<group>/`), enqueued for Docling indexing, and answered via `ask_file` with durable filename + `file_id` stubs in chat history. Bot replies must cite the exact stored filename. Indexing-in-progress is not a tool failure (no ❌). When indexing finishes, `files:index-worker` notifies WhatsApp that the named file is ready.
- **Webhook dedup / echo:** Evolution replays `messages.upsert` for the same message (often minutes later). In-memory dedup in `lib/integrations/whatsapp/webhook-dedup.ts` uses 24h TTL for messageId + sender/content. `markWhatsAppOutboundContent` registers bot-sent text so echoes are ignored; `isAgentGeneratedWhatsAppText` filters tool progress / `❌` errors on global + personal bridge paths.
- Instance naming: `agentx-u-{shortUserId}-{ts}` with rotation on re-pair. `discardInstance` is best-effort, so Evolution can hold **multiple open instances for the same phone**; only the one in `whatsapp_user_instances` ingests, the rest are ignored. Audit with `GET /instance/fetchInstances` when the inbox looks empty.
- Webhooks target one AgentX origin (`AGENTX_WEBHOOK_URL`, prod `127.0.0.1:3000`). Inbox changes have no effect until that server is rebuilt and restarted — `next dev` on 3001 does not receive them.
- There is no connect-time history backfill and no provider `findChats` / `findMessages` API. Only durable webhook events become personal-inbox history.
- Text events are promoted into summary history; groups (`@g.us`) are included. Media events remain deferred metadata placeholders until a media worker is implemented.
- **Digest snapshots:** `generateDigest` always regenerates on each user ask (no stale snapshot reuse), batches up to 100 chats per LLM call (`getWhatsAppDigestChunkSize`), joins chunk outputs in code (no merge LLM), and inserts a new row in `whatsapp_digest_snapshots`. Concurrent in-flight calls for the same user share one promise; abort clears that in-flight work. 250 chats → 3 LLM calls → 1 new snapshot. Summarize uses `reasoning: "none"` plus fallback to `reasoningText` when DeepSeek V4 leaves `text` empty on long prompts; empty digests must not be persisted.
- **Dashboard:** snapshot tab lists recent snapshots; search tab accepts natural-language `query`, streams NDJSON progress (`stream=1`) with per-attempt keyword status + final AI `analysisText`, deduped hits, and `attemptedKeywords`.
- **Agent catch-up:** call `summarize_whatsapp_digest` once for general summary asks; `summarize_whatsapp_chat` only when user names a specific chat/JID; `search_whatsapp_messages` when user wants to find specific topics/messages (pass `query` only — tool generates 5 keywords per attempt internally, up to 10 attempts). `list_whatsapp_contacts` for address-book contact asks; `list_whatsapp_groups` for group-membership asks — not `list_whatsapp_chats`. Each attempt notifies WhatsApp with `Mencari dengan: … (percobaan n/10)` via `onProgress` → `notifyWhatsAppToolProgress`; analysis phase sends `Menganalisis pesan yang cocok…`.
- Single-chat `generateChatSummary` still exists for named-chat AI tool; writes `whatsapp_chat_summaries` (not used by digest path).

## Learned Workspace Facts

- WhatsApp global-channel path excludes `summarize_whatsapp_chat` / `list_whatsapp_chats`; directory browse tools `list_whatsapp_contacts` / `list_whatsapp_groups` are available on the WA bot path. Catch-up uses `summarize_whatsapp_digest` once; message lookup uses `search_whatsapp_messages`. Tool start sends progress via `notifyWhatsAppToolStart`.
- Overlapping WA agent runs for the same user abort the previous run and clear in-flight digest work.
- Distinguish a missing event from a slow webhook using Evolution logs. `WebhookController` `ECONNABORTED` with `timeout of 60000ms exceeded` proves Evolution emitted the event and AgentX did not acknowledge it in time. **Historical:** the global bot path used to await `processChannelMessage` (model/tools/persistence/final delivery) before returning HTTP 200, so slow generation caused provider retries that the in-memory dedup then dropped → lost replies. This is now fixed by the durable `whatsapp_bot_jobs` queue + `whatsapp-bot:worker` (webhook returns 200 immediately). If replies stop after this change, first check the bot worker is running (jobs pile up in `whatsapp_bot_jobs` with `status='queued'`); do not misdiagnose as a dead Baileys processor.
