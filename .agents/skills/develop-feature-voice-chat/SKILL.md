## When to Use

Develop or extend AgentX voice-note input, speech transcription, conditional voice replies, WhatsApp PTT delivery, web chat mic STT, or Admin-managed voice settings on the main/global WhatsApp agent channel.

## Overview

Voice is a transport around the existing canonical text conversation: transcribe an authorized WhatsApp voice note, run the shared agent with the transcript, persist one canonical assistant text and delivery decision, then send text or synthesized PTT. Personal WhatsApp inboxes remain ingestion-only. Non-secret voice configuration is global and stored with the Admin model settings.

## Key locations

- Research and policy: docs/research/voice-input-output.md
- Admin model options, validation, and persistence: lib/admin/model-settings/
- Admin settings UI and API: components/dashboard/model-settings-card.tsx, app/api/admin/model-settings/route.ts
- Database schema and migration: lib/db/schema.ts, drizzle/0016_voice_model_settings.sql
- Speech config mapping, policy, and OpenRouter client: lib/ai/voice/
- Web chat STT API and request schema: app/api/voice/transcribe/route.ts, lib/ai/voice/transcribe-request-schema.ts
- Web chat mic hook and composer wiring: components/chat/use-chat-voice-input.ts, components/chat/chat-panel.tsx
- Webhook routing and STT orchestration: app/api/integrations/whatsapp/webhook/route.ts
- Shared generation, persistence, and final delivery: lib/channel/process-channel-message.ts
- Provider contract and Evolution implementation: lib/integrations/whatsapp/provider.ts, lib/integrations/whatsapp/providers/unofficial-evolution.ts
- WhatsApp types and channel delivery: lib/integrations/whatsapp/types.ts, lib/integrations/whatsapp-channel-repository.ts
- Personal-to-global bot exception: lib/integrations/whatsapp/personal-bot-bridge.ts
- Global/personal channel boundaries: .agents/skills/develop-module-whatsapp-inbox/SKILL.md
- Evolution runtime pin: infra/evolution/docker-compose.yml
- Secret configuration: .env.example keeps OPENROUTER_API_KEY only

## Behavior agents must know

- Only the configured global Evolution instance may auto-reply. Never enable voice replies for normal personal-inbox contacts.
- The personal-to-bot bridge handles an outbound voice note only when its DM remoteJid exactly matches the configured global bot number; the reply is sent from the global instance.
- Keep webhookBase64 false; dedupe and authorize from audio metadata before downloading or calling STT.
- Do not persist or log raw audio/base64. Persist the transcript, minimal input metadata, canonical assistant text, and sampled delivery decision.
- OpenRouter STT and TTS use dedicated /audio/transcriptions and /audio/speech endpoints through lib/ai/voice/openrouter-audio.ts. Browser MediaRecorder blobs are usually audio/webm; resolveAudioFormat must accept webm. STT requests pass language: "id" so transcripts prefer Bahasa Indonesia.
- Web chat mic records in the browser, POSTs ephemeral base64 to /api/voice/transcribe, and inserts the transcript into the composer draft (append with space). User edits then presses Kirim — do not auto-send. Mic is hidden when Admin voice input is disabled.
- Voice input and reply models have independent Admin allowlists. Selecting disabled is the feature switch, matching Vision. Do not add non-secret voice env overrides.
- Resolve one app-settings snapshot per request and pass the derived VoiceConfig through input validation, STT, reply policy, metadata, and TTS.
- OPENROUTER_API_KEY remains in env because it is secret.
- Voice input defaults to PTT messages no longer than 120 seconds or 10 MiB. Unknown formats, non-PTT audio files, oversized audio, and empty transcripts fail with concise Indonesian text.
- Evaluate deterministic text-only rules before randomness. News/search/social tool output, long or structured text, URLs/citations, errors/warnings, exact values, high-risk content, state-changing action results, and explicit requests for written text stay text.
- In the conservative first release, only voice-originated direct global-channel replies are eligible. Eligible replies use a cryptographic random draw against the Admin-managed reply percentage, default 35.
- Persist the sampled deliveryMode, policy reason, and probability with the canonical assistant text before sending.
- TTS or Evolution-audio failure sends the exact canonical text fallback without regenerating or re-randomizing.
- WhatsApp agent generation disables reasoning with the OpenRouter provider setting `reasoning: { enabled: false, effort: "none" }`; the generic AI SDK reasoning option alone does not disable DeepSeek V4 reasoning. If a WhatsApp run still returns no visible text, persist and send a deterministic text-only fallback; never finish the webhook with an empty assistant reply.
- Select the OpenRouter TTS response format by model. Gemini TTS requires raw 24 kHz, 16-bit mono PCM; wrap it in a WAV container before sending it through Evolution `sendWhatsAppAudio`, which converts the input to WhatsApp PTT Ogg/Opus.
- Tool progress and tool errors remain text and are never randomized.
- The official Meta provider remains intentionally unsupported for voice until its separate audio contract is implemented.

## References

- docs/research/voice-input-output.md - current checkout trace, primary-source provider contracts, policy, failure rules, configuration boundary, and verification plan
