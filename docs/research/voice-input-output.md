# WhatsApp voice input and conditional voice output

Date: 2026-08-02

## Question

How should AgentX let a registered user speak to the main/global WhatsApp agent
and sometimes receive a WhatsApp voice note in return, while keeping news,
long-form, structured, or otherwise unsuitable replies as text?

## Short answer

Treat speech as transport, not as a second conversation pipeline. Download an
eligible WhatsApp voice note from Evolution, transcribe it to canonical user
text, and run the existing `processChannelMessage` flow. Generate and persist one
canonical assistant text reply. Only then apply deterministic voice eligibility
rules; if the reply is eligible, make one configurable random selection. A
selected reply is synthesized to MP3 and sent through Evolution's dedicated
WhatsApp-audio endpoint, which converts it to a PTT-compatible Ogg/Opus voice
note. Any transcription, synthesis, or audio-delivery failure falls back to a
short Indonesian text response or the canonical assistant text.

This capability belongs only to the global bot channel. Personal WhatsApp
inboxes remain ingestion-only. The existing personal-to-bot bridge is the one
exception: an outbound voice note from a user's personal instance to the global
bot number may be forwarded into the global agent path, but it must never enable
replies to any other personal-inbox contact.

## Implementation status

Implemented in the same development cycle after this research:

- global and exact personal-to-global bridge voice-note parsing and STT;
- 120-second, 10 MiB, and PTT input safeguards;
- dedicated OpenRouter STT/TTS client with timeouts;
- persisted canonical assistant text plus sampled delivery metadata;
- deterministic text-only policy followed by a 35 percent cryptographic random choice;
- Evolution sendWhatsAppAudio delivery with canonical-text fallback;
- Admin-managed voice model, enable/disable, probability, and safety limits in
  the shared app settings row.

Static diff validation passes. TypeScript, ESLint, build, and live provider canaries
still require a shell with Node/npm and a running Evolution/OpenRouter environment.

## Scope and non-goals

In scope:

- voice-note input on the registered user's conversation with the global bot;
- the personal-to-global bridge for a voice note addressed specifically to the
  global bot number;
- conditional PTT/voice-note output from the global Evolution instance;
- deterministic text-only rules followed by a configurable random choice;
- canonical text persistence and text fallback.

Out of scope:

- voice replies from personal WhatsApp inbox instances;
- transcription of all personal-inbox audio for summaries;
- web-chat recording/playback UI;
- voice calls or real-time streaming audio;
- changing the existing chat model or agent/tool behavior.

## Pre-implementation checkout trace

### Global channel inbound

[`app/api/integrations/whatsapp/webhook/route.ts`](../../app/api/integrations/whatsapp/webhook/route.ts)
verifies the webhook, routes by Evolution instance, rejects stale/personal
instances from the auto-reply path, deduplicates by message ID/content, resolves
the registered AgentX user, optionally downloads attachments, and calls
`processChannelMessage({ source: "whatsapp", replyViaWhatsApp: true })`.

The provider already listens to `MESSAGES_UPSERT` with `webhookBase64: false`.
[`lib/integrations/whatsapp/providers/unofficial-evolution.ts`](../../lib/integrations/whatsapp/providers/unofficial-evolution.ts)
therefore downloads accepted media on demand through
`POST /chat/getBase64FromMediaMessage/{instance}`. Evolution's official API
reference confirms that endpoint accepts a message key and returns the media for
that message. [Evolution API: Get Base64 From Media Message](https://docs.evoapicloud.com/api-reference/chat-controller/get-base64)

The blocking gap is in AgentX's global inbound type/parser:

- `WhatsAppInboundMediaType` contains only image, document, and video;
- `extractMediaAttachments` recognizes only `imageMessage`,
  `documentMessage`, and `videoMessage`;
- a voice note has no text and no recognized attachment, so
  `parseInboundRecord` returns `null` before deduplication or user resolution.

The personal-inbox ingest representation does recognize `audioMessage` and its
`seconds` metadata, but that representation is currently metadata-only and is
not the global agent attachment contract. Evidence:
[`lib/integrations/whatsapp/types.ts`](../../lib/integrations/whatsapp/types.ts)
and
[`lib/integrations/whatsapp/providers/unofficial-evolution.ts`](../../lib/integrations/whatsapp/providers/unofficial-evolution.ts).

### Personal-to-global bridge

The personal-inbox branch durably enqueues every incoming provider event, then
uses
[`lib/integrations/whatsapp/personal-bot-bridge.ts`](../../lib/integrations/whatsapp/personal-bot-bridge.ts)
only when the event is an outbound DM to the configured global bot phone. This
bridge exists because a user with a connected personal instance may not produce
the expected `messages.upsert` on the global instance.

Today the bridge requires non-empty text, and `personalOutboundToChannelInbound`
drops media metadata. Voice support must extend this narrowly: accept only an
outbound `audio` DM whose `remoteJid` matches `channelPhoneE164`, download it
from that personal Evolution instance, transcribe it, and then call the same
global `processChannelMessage` path. Do not generalize personal-instance audio
processing and do not send through the personal instance.

### Agent reply

[`lib/channel/process-channel-message.ts`](../../lib/channel/process-channel-message.ts)
generates the final assistant text, sends it immediately with
`sendWhatsAppToUser`, and then persists the assistant message. The repository's
provider interface has `sendText` and generic image/video/document media, but no
audio/PTT operation. Evidence:
[`lib/integrations/whatsapp/provider.ts`](../../lib/integrations/whatsapp/provider.ts),
[`lib/integrations/whatsapp-channel-repository.ts`](../../lib/integrations/whatsapp-channel-repository.ts).

Voice output needs a delivery seam after final text generation. Persist the
canonical assistant text and its selected delivery mode before attempting TTS
or WhatsApp delivery. This preserves web/main-channel history and makes the
exact same text available when audio fails.

## Primary-source findings

### Evolution API 2.3.7 can download and send PTT audio

The repo pins `evoapicloud/evolution-api:v2.3.7` in
[`infra/evolution/docker-compose.yml`](../../infra/evolution/docker-compose.yml).
The matching Evolution API source exposes
`POST /message/sendWhatsAppAudio/{instance}` and accepts a multipart file, URL,
or raw base64 audio. Its default `encoding` path runs FFmpeg, produces
Ogg/Opus at 48 kHz mono, sends with `ptt: true`, and uses a recording presence.
[Evolution API 2.3.7 audio route](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/src/api/routes/sendMessage.router.ts#L65-L76),
[Evolution API 2.3.7 audio implementation](https://github.com/evolution-foundation/evolution-api/blob/2.3.7/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts#L3104-L3243)

The official endpoint documentation also says `audio` may be a URL or base64
and shows the resulting WhatsApp `audioMessage` with `ptt: true`.
[Evolution API: Send WhatsApp Audio](https://docs.evoapicloud.com/api-reference/message-controller/send-audio)

Implication: AgentX does not need its own FFmpeg dependency for the first
version. It can request compressed MP3 from TTS, base64-encode the returned raw
bytes, and let the pinned Evolution service perform the WhatsApp conversion.
The production canary must still verify this exact path against the deployed
container before enabling randomized replies.

### OpenRouter now has dedicated STT and TTS endpoints

OpenRouter's dedicated transcription endpoint is
`POST /api/v1/audio/transcriptions`. It accepts raw base64 audio plus a format
such as `ogg`, can optionally receive an ISO-639-1 language hint, and returns a
JSON object containing `text` and usage. [OpenRouter Speech-to-Text guide](https://openrouter.ai/docs/guides/overview/multimodal/stt),
[OpenRouter transcription API reference](https://openrouter.ai/docs/api/api-reference/transcriptions/create-audio-transcriptions)

As checked on 2026-08-02, OpenRouter's primary Models API lists several
transcription models, including `openai/gpt-4o-mini-transcribe`,
`openai/whisper-large-v3`, and `openai/whisper-1`. Model availability and
provider support are runtime facts, so the chosen model must be configurable and
validated at startup/canary time rather than embedded in the parser.
[OpenRouter Models API filtered for transcription](https://openrouter.ai/api/v1/models?output_modalities=transcription)

OpenRouter's dedicated speech endpoint is `POST /api/v1/audio/speech`. It
accepts text, model, provider-specific voice, output format, and optional speed;
it returns raw audio bytes rather than JSON. For `mp3`, the documented content
type is `audio/mpeg`; non-200 failures return JSON error bodies and must not be
forwarded to Evolution as if they were audio. [OpenRouter Text-to-Speech guide](https://openrouter.ai/docs/guides/overview/multimodal/tts),
[OpenRouter speech API reference](https://openrouter.ai/docs/api/api-reference/speech/create-audio-speech)

Use the dedicated STT/TTS endpoints instead of asking the normal chat model to
both reason and speak. That keeps transcription, agent generation, policy, and
delivery independently testable and preserves the existing text-model path.

## Recommended inbound design

1. Extend the global inbound attachment contract with an audio/voice-note type
   carrying `mimeType`, `durationSeconds`, `ptt`, and the existing message key.
   Unwrap the same ephemeral/view-once containers supported by the provider
   media downloader before looking for `audioMessage`.
2. Keep `webhookBase64: false`. Parse only metadata first so message-ID and
   content deduplication happen before a network download or STT charge.
3. Accept voice notes only from the already-authorized global path. For the
   personal bridge, require all existing bridge conditions plus
   `messageType === "audio"` and an exact global-bot `remoteJid` match.
4. Apply local operational limits before STT. Proposed initial policy: PTT audio
   only, at most 120 seconds, and at most 10 MiB after download. These values are
   AgentX product limits, not provider limits, and should be configurable.
5. Download once with the existing provider method. Map
   `audio/ogg; codecs=opus` to OpenRouter format `ogg`; send raw base64, not a
   data URL. Reject an unknown MIME/format rather than guessing.
6. Transcribe with a configurable STT model. Omit the language hint by default
   so Indonesian/English code-switching can auto-detect; allow an `id` override
   after a real-audio accuracy test.
7. Reject an empty/whitespace transcript with a short Indonesian error. Never
   invoke the agent with an invented placeholder such as `[audio]`.
8. Call `processChannelMessage` with the transcript as normal user text and add
   message metadata such as `inputMode: "voice"`, original MIME type, duration,
   and provider message ID. Persist only the transcript by default; do not log
   or durably store base64/raw voice bytes.

Recommended user-facing failures:

- unsupported/too long: `Pesan suara terlalu panjang untuk diproses. Kirim maksimal 2 menit.`
- download/STT failed: `Gagal memahami pesan suara. Coba kirim ulang atau tulis pesannya.`
- empty transcript: `Pesan suara belum terdengar jelas. Coba rekam ulang.`

## Recommended outbound policy

The model must not decide whether to speak. Build the policy from observable
request/agent facts and the final canonical text.

### Deterministic eligibility first

A reply is voice-eligible only when all of these are true:

1. it is a direct reply on the global WhatsApp agent path;
2. the triggering user message was a voice note (recommended conservative first
   release; text-originated conversations remain text);
3. voice output, TTS model, and voice are configured;
4. the user did not explicitly request a written/text reply;
5. the final reply is short: proposed maximum 600 characters and 80 words;
6. no current-news/research/social tool ran: at minimum
   `exa_web_search`, `exa_web_fetch`, `fetch_tiktok_data`,
   `fetch_twitter_data`, or `fetch_threads_data`;
7. the request is not clearly asking for news/latest/current/trending content;
8. the reply contains no URL, `Sumber:` section, code fence, Markdown table,
   multi-item list, or attachment/media card;
9. the reply is not an error, refusal, warning, safety/high-stakes guidance, or
   action result whose exact dates, amounts, addresses, IDs, or instructions are
   important to re-read.

Rules 5-9 are intentionally conservative. They make news, citations, long
content, and exact/structured information text-only without a second LLM
classification call. Tool names are already visible in
`onToolExecutionStart`; collect them into generation metadata for policy use.

### Random selection second

Only after eligibility passes, sample against a configurable probability.
Proposed default: 35 percent.

```text
if textOnlyReason exists:
  deliveryMode = text
else:
  deliveryMode = random(0..99) < appSettings.voiceReplyPercent
    ? voice
    : text
```

Use an injectable cryptographic random function (for example
`crypto.randomInt`) rather than putting randomness in the model prompt. Persist
the sampled mode and policy reason in assistant-message metadata before
delivery, so retries or post-generation failures do not silently choose a new
mode. Tests should inject a fixed sampler.

Suggested metadata:

```json
{
  "source": "whatsapp",
  "inputMode": "voice",
  "deliveryMode": "voice",
  "voiceEligibility": "eligible",
  "voiceProbabilityPercent": 35
}
```

Do not store the random draw when the reply is ineligible; record the
deterministic text-only reason instead (`news`, `long`, `structured`, `error`,
`explicit_text`, or `tts_unavailable`).

## Recommended delivery sequence

1. Generate the complete canonical assistant text. Continue suppressing
   per-step WhatsApp replies on `replyViaWhatsApp` runs.
2. Collect executed tool names and evaluate deterministic eligibility.
3. If eligible, sample text versus voice once.
4. Persist the canonical assistant text and delivery metadata.
5. For text mode, use the existing `sendWhatsAppToUser` path.
6. For voice mode, switch presence to `recording`, call OpenRouter TTS with
   `response_format: "mp3"`, validate the HTTP status and `audio/mpeg` response,
   then call a provider-level `sendAudio` operation backed by Evolution
   `/message/sendWhatsAppAudio/{instance}`.
7. If TTS or Evolution audio delivery fails, send the already-persisted
   canonical text. Do not regenerate the answer and do not retry audio after a
   possibly-successful ambiguous send.

On WhatsApp, voice mode sends the PTT note instead of duplicating the full text.
The canonical text remains visible in AgentX's main-channel history and is the
fallback. Tool-progress/error notifications remain text and are not randomized.

## Configuration boundary

Voice configuration is stored in the singleton app_settings row and edited
through Dashboard -> Pengaturan Model:

    voiceInputModelId=<transcription model or disabled>
    voiceReplyModelId=<speech model or disabled>
    voiceReplyVoice=nova
    voiceReplyPercent=35
    voiceInputMaxSeconds=120
    voiceInputMaxBytes=10485760
    voiceReplyMaxChars=600
    voiceReplyMaxWords=80

Selecting disabled on the input or reply model is the feature switch, matching
the existing Vision setting. Each request resolves one settings snapshot and
passes the derived VoiceConfig through STT, reply policy, and TTS. This avoids
configuration drift during a request. Reuse OPENROUTER_API_KEY from the
environment because it is a secret; no non-secret voice settings remain in env.

Keep the speech model option lists independent from TEXT_MODEL_OPTIONS and
VISION_MODEL_OPTIONS; speech capabilities and availability have a different
lifecycle.

## Failure and privacy rules

- Never write audio/base64 to application logs, message metadata, or error
  telemetry.
- Do not persist raw global-channel voice notes by default. Persist the
  transcript and minimal format/duration metadata; document a retention policy
  before storing raw audio.
- Apply STT/TTS request timeouts and abort propagation. A newer incoming message
  already aborts the previous per-user agent run; speech calls should honor the
  same signal where possible.
- Dedupe before STT. Duplicate Evolution deliveries must not incur a second
  transcription or produce a second reply.
- Treat TTS as optional delivery. Its outage must not make the canonical agent
  answer unavailable.
- Keep the official Meta provider explicitly unsupported until its own audio
  contract is implemented; the current class is a stub. Do not silently route
  the Evolution-specific endpoint through it.

## Implementation seams used by the implementation

- Inbound metadata/types and audio extraction:
  `lib/integrations/whatsapp/types.ts`,
  `lib/integrations/whatsapp/providers/unofficial-evolution.ts`
- Provider capability:
  `lib/integrations/whatsapp/provider.ts`, Evolution implementation, official
  stub
- STT/TTS HTTP clients:
  new focused modules under `lib/ai/audio/` or `lib/ai/speech/`
- Global and bridge orchestration:
  `app/api/integrations/whatsapp/webhook/route.ts`,
  `lib/integrations/whatsapp/personal-bot-bridge.ts`
- Canonical persistence, tool-fact collection, and final delivery:
  `lib/channel/process-channel-message.ts`,
  `lib/integrations/whatsapp-channel-repository.ts`
- Configuration:
  lib/admin/model-settings/, components/dashboard/model-settings-card.tsx,
  lib/db/schema.ts, and the focused speech config module

## Verification plan

Unit/fixture coverage:

- parse a normal and ephemeral `audioMessage`, including MIME, `seconds`, PTT,
  and message key;
- reject audio from groups, unregistered users, stale instances, and personal
  contacts other than the exact global bot number;
- bridge an outbound personal-instance voice note to the global agent without
  enabling any personal-inbox auto-reply;
- dedupe before media download/STT;
- map Ogg/Opus MIME to `ogg` and reject unknown formats;
- treat empty STT output as failure;
- force each deterministic text-only reason;
- prove the random sampler is not called for ineligible replies;
- with a fixed sampler, cover both eligible text and eligible voice outcomes;
- fall back to the exact canonical text on TTS and Evolution send failures.

Integration/canary coverage:

- send Indonesian and Indonesian/English code-switched voice notes from a
  registered phone;
- repeat through the personal-to-global bridge;
- confirm the main-channel stored user message is the transcript and the stored
  assistant message is canonical text;
- ask for current news and a long explanation by voice and verify text-only;
- ask short conversational questions enough times to observe the configured
  voice/text ratio;
- inspect the delivered WhatsApp message as a playable PTT voice note;
- verify Evolution 2.3.7 accepts the chosen OpenRouter MP3 bytes and performs
  conversion;
- stop/fail OpenRouter TTS and confirm one text fallback with no duplicate audio;
- confirm personal inbox contacts never receive an automated message.

## Decision summary

- Use OpenRouter's dedicated STT and TTS endpoints with runtime-configured
  speech models.
- Reuse Evolution's existing on-demand media download and its dedicated
  `sendWhatsAppAudio` PTT conversion; keep `webhookBase64: false`.
- Keep one canonical text conversation. Speech is input/output transport only.
- Make only short, conversational, voice-originated global-channel replies
  eligible for randomized voice in the first release.
- Make news/search/social, long, structured, cited, exact, risky, or failed
  replies deterministically text-only before randomization.
- Persist the delivery decision before sending and always fall back to the same
  canonical text.
- Preserve the personal inbox as ingestion-only; extend only the exact
  personal-to-global bot bridge case.
