# WhatsApp webhook burst handling

Date: 2026-07-31

## Question

Can the current AgentX webhook safely handle a burst of text, audio, and file
messages for a high-volume personal WhatsApp account?

## Short answer

The implemented path is burst-safe at the application durability boundary: personal-inbox webhooks append idempotent event envelopes to PostgreSQL and acknowledge without doing chat/message promotion inline. A bounded worker preserves per-chat ordering, retries failures, and retains media as metadata-only deferred events. The maximum sustainable rate still requires a controlled load test.

## Decision and implementation status

AgentX PostgreSQL is the source of truth. The application does not perform provider history reads or connect-time backfill; the user considers that access pattern an account restriction/ban risk.

The burst-safe durability core is now implemented: the webhook durably appends events, a separate worker preserves per-chat order while processing chats concurrently, text promotion is atomic and idempotent, media is retained as a deferred metadata-only placeholder, and digest limits execute in SQL. Apply migration `0015_whatsapp_inbox_events.sql` and run `npm run whatsapp-inbox:worker` with the web app.

Summary requests now capture the user's highest accepted inbox-event sequence and wait until every event through that watermark is terminal before reading chat/message tables. The wait is abort-aware and exposes a syncing/summarizing progress state instead of returning a partial digest. Promoted text messages retain their source event sequence, and summary reads include only legacy messages or events at or below that same watermark, so later arrivals cannot leak into the current snapshot.

## Pre-implementation assessment

The findings below describe the request path before the durable queue was implemented. They are retained as the design evidence for the target architecture.

### Previous request paths

The single route
[`app/api/integrations/whatsapp/webhook/route.ts`](../../app/api/integrations/whatsapp/webhook/route.ts)
multiplexes two different products:

1. **Personal inbox (`agentx-u-*`)**: resolve the Evolution instance to an
   AgentX user, parse all text messages in the payload, ingest them sequentially,
   then return `200`.
2. **Global bot channel**: resolve a registered sender, optionally download and
   save attachments, run the Agent, send a reply, then return `200`.

These paths have different burst behavior and must not be treated as one
pipeline.

### Previous personal-inbox findings

### Mixed media is not ingested

The personal parser's `buildIngestMessage` accepts only text found in
`conversation` or `extendedTextMessage`. It returns `null` when that text is
empty. It does not use the image/document/video caption extractor and it has no
audio representation. Consequently:

- text messages are ingested;
- audio messages are ignored;
- file, image, and video-only messages are ignored;
- media captions are also ignored by the personal-inbox parser.

The route responds successfully with zero ingested messages for such a payload,
so Evolution has no reason to retry it. This is a permanent coverage gap, not
just delayed processing.

Evidence:
[`lib/integrations/whatsapp/providers/unofficial-evolution.ts`](../../lib/integrations/whatsapp/providers/unofficial-evolution.ts),
[`lib/integrations/whatsapp/types.ts`](../../lib/integrations/whatsapp/types.ts).

### Each accepted text message is synchronous database work

The route awaits messages in a `for...of` loop. For a new, non-duplicate text
message, `ingestWhatsAppMessage` performs approximately four sequential database
round trips:

1. check message ID;
2. find the chat;
3. update or insert the chat;
4. insert the message.

The route also reads channel configuration and resolves the personal instance
once per webhook request. A batch of `N` accepted messages therefore has roughly
`2 + 4N` database round trips before acknowledgment. This is a code-path model,
not a benchmark.

The Postgres client is capped at 10 connections per AgentX process. Concurrent
webhook requests contend for this pool; messages within one payload are still
processed serially.

Evidence:
[`app/api/integrations/whatsapp/webhook/route.ts`](../../app/api/integrations/whatsapp/webhook/route.ts),
[`lib/integrations/whatsapp-inbox/ingest/service.ts`](../../lib/integrations/whatsapp-inbox/ingest/service.ts),
[`lib/db/index.ts`](../../lib/db/index.ts).

### Idempotency exists, but concurrent races remain

The database has unique indexes for `(user_id, wa_message_id)` and
`(user_id, remote_jid)`. These are useful final guards against duplicates.
However, the implementation uses `SELECT` followed by `INSERT`, rather than an
atomic `INSERT ... ON CONFLICT`. Concurrent duplicate deliveries can both pass
the pre-check and one can fail on the unique constraint. Concurrent first
messages for a new chat have the same race.

The personal branch has no local error boundary. A database exception becomes a
non-2xx response. Evolution retries retryable failures, which can eventually
recover, but it also increases load during the burst. There is no transaction
covering chat activity and message insertion.

Chat activity is updated with the arriving message timestamp directly. If
separate webhook requests finish out of order, an older message can overwrite a
newer `lastMessageAt`.

Evidence:
[`lib/db/schema.ts`](../../lib/db/schema.ts),
[`lib/integrations/whatsapp-inbox/ingest/service.ts`](../../lib/integrations/whatsapp-inbox/ingest/service.ts).

### Evolution retries protect delivery, but are not the queue AgentX needs

Evolution API v2.3.7 waits for the webhook POST and retries failures. Its tagged
source defaults to a 30-second request timeout, 10 attempts, an initial
five-second delay, exponential backoff capped at 300 seconds, and jitter. Status
codes `400`, `401`, `403`, `404`, and `422` are non-retryable by default.

AgentX's checked `infra/evolution/.env` does not override those retry settings.
The Docker daemon was not running during this research, so the live container
environment could not be confirmed.

Retries improve eventual delivery for timeouts and server errors, but they do
not provide admission control, per-user fairness, observable backlog, or
dead-letter handling inside AgentX.

Primary sources:

- [Evolution API v2.3.7 webhook controller](https://github.com/EvolutionAPI/evolution-api/blob/2.3.7/src/api/integrations/event/webhook/webhook.controller.ts)
- [Evolution API v2.3.7 environment configuration](https://github.com/EvolutionAPI/evolution-api/blob/2.3.7/src/config/env.config.ts)
- [Evolution API v2.3.7 example environment](https://github.com/EvolutionAPI/evolution-api/blob/2.3.7/.env.example)

## Global bot-channel findings

> **Update (2026-08-05): resolved.** The global bot path (and the personal→bot
> bridge) now enqueue a durable job into `whatsapp_bot_jobs` and acknowledge
> Evolution immediately; a separate worker (`npm run whatsapp-bot:worker`)
> generates and delivers the reply with per-user FIFO ordering, attempts/backoff,
> and stale-lock requeue. This removes the timeout→retry→dedup-drop loss and the
> "latest run wins" abort described below. Module:
> `lib/integrations/whatsapp/bot-queue/`. The findings below are retained as the
> pre-fix design evidence.

The global channel is not a lossless burst queue either:

- image, document, and video attachments are downloaded sequentially within a
  request;
- audio is not represented by the inbound attachment types and is ignored;
- the route waits for storage, Agent execution, and WhatsApp delivery before
  acknowledging the webhook;
- for one AgentX user, a new request aborts the previous in-memory Agent run
  rather than queueing it.

This implements “latest run wins,” not “process every incoming message in
order.” The deduplication and active-run maps are process-local, so they are not
a distributed guarantee if AgentX is scaled to multiple processes.

Evidence:
[`app/api/integrations/whatsapp/webhook/route.ts`](../../app/api/integrations/whatsapp/webhook/route.ts),
[`lib/integrations/whatsapp/webhook-dedup.ts`](../../lib/integrations/whatsapp/webhook-dedup.ts).

### Previous downstream summary cost

High-volume ingestion also made digest generation progressively more
expensive. `getMessagesForChatInWindow` previously selected every stored message
for a chat and filtered the requested time window in JavaScript. Digest loading
did this one active chat at a time and only then sliced to the configured
message cap.

The database index on `(chat_id, sent_at)` was present, but the query did not use
a `sent_at` predicate or database-side `LIMIT`. A busy account could therefore
read far more rows than were sent to the model.

Evidence:
[`lib/integrations/whatsapp-inbox/ingest/service.ts`](../../lib/integrations/whatsapp-inbox/ingest/service.ts),
[`lib/integrations/whatsapp-inbox/summary/service.ts`](../../lib/integrations/whatsapp-inbox/summary/service.ts).

## Target status and future enhancements

Items 1, 2, 5, and 7 below are implemented. Item 4 currently stops at durable media metadata. Weighted/reserved user capacity, binary-media processing, and production metrics remain future enhancements.

For an important, high-volume account:

1. Validate the webhook and durably append a small event envelope using an
   atomic provider-message-id key; acknowledge immediately after that write.
2. Process envelopes in workers. Serialize by `userId + remoteJid` to preserve
   chat order, while allowing bounded parallelism across different chats.
3. Give important accounts reserved or weighted capacity, but keep per-user
   concurrency limits so one account cannot starve all others.
4. Represent every supported message type. Persist media metadata first; fetch
   binary media in a worker with retry, size, MIME-type, and retention controls.
   Keep `webhookBase64: false` so large bodies do not hit the webhook endpoint.
5. Use atomic `ON CONFLICT` writes and a monotonic chat timestamp
   (`GREATEST(existing, incoming)`).
6. Record processing state, attempts, last error, and a dead-letter state.
   Monitor acknowledgment latency, queue age, retry count, duplicate count,
   messages by type, and dropped/unsupported messages.
7. Push time-window filtering and row limits into SQL before generating a
   digest.


## Verification still needed

- Run a controlled load test with separate scenarios: text-only, media-only,
  mixed traffic, duplicates, one hot chat, and many chats on one instance.
- Measure p50/p95/p99 acknowledgment latency, Postgres pool wait, errors, retry
  amplification, ordering, and final message completeness.
- Confirm production retention and recovery requirements for deferred audio/file metadata before implementing binary download or transcription.
