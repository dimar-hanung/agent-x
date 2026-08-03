## When to Use

Develop or extend AgentX global model settings (admin text/vision model dropdowns) and WhatsApp inbound media handling.

## Overview

Chat model selection is stored in PostgreSQL (`app_settings` singleton) and applied globally to web chat, WhatsApp channel replies, scheduler runs, and summarization fallbacks. WhatsApp inbound media on the global channel is saved to each user's SeaweedFS tree under `wa/<phone>/` or `wa/<group>/` before the agent runs with multimodal parts when vision is required.

## Key locations

| Area | Path |
|------|------|
| Schema | `app_settings` in `lib/db/schema.ts` |
| Constants / allowed models | `lib/admin/model-settings/constants.ts` |
| Repository | `lib/admin/model-settings/repository.ts` |
| Admin API | `app/api/admin/model-settings/route.ts` |
| Admin UI | `app/dashboard/model-settings/page.tsx`, `components/dashboard/model-settings-card.tsx`, `components/dashboard/model-settings-row.tsx` |
| OpenRouter wiring | `lib/ai/openrouter.ts`, `lib/ai/agents/chat-agent.ts` |
| Summarize model reuse | `lib/ai/context/resolve-summarize-model.ts`, `context-config.ts` |
| Multimodal parts | `lib/ai/build-multimodal-parts.ts` |
| Channel entry | `lib/channel/process-channel-message.ts`, `app/api/chat/route.ts` |
| WA media parse/download | `lib/integrations/whatsapp/providers/unofficial-evolution.ts` |
| WA media save | `lib/integrations/whatsapp/save-inbound-media.ts` |
| Folder helper | `lib/files/ensure-folder-path.ts` |
| Webhook | `app/api/integrations/whatsapp/webhook/route.ts` |

## References

- (none)

## Learned user preferences

- (none)

## Behavior agents must know

- **Text model (required):** `deepseek/deepseek-v4-flash`, `deepseek/deepseek-v4-pro`, `qwen/qwen3-8b` — used for all text-only chat runs globally.
- **Vision model:** `disabled`, `qwen/qwen3.7-flash`, `google/gemini-3.6-flash`, `qwen/qwen3-vl-8b-instruct` — used only when an inbound run includes image/visual attachments and vision is not `disabled`.
- `OPENROUTER_MODEL` env is bootstrap fallback when seeding the first `app_settings` row; admin UI is the runtime source of truth.
- WA media download uses Evolution `POST /chat/getBase64FromMediaMessage/{instance}` (webhook stays `webhookBase64: false`).
- Saved WA files use existing `uploadFileBytes` + `user_files` hierarchy: `wa` → `wa/<phoneDigits>` for DMs, `wa/<groupSlug>` for groups. S3 keys remain `users/{userId}/{fileId}/{name}`.
- Personal inbox ingest remains text-only; global channel bot handles media.
- When vision is disabled and user sends image-only/binary WA message, webhook replies with Indonesian error (`WA_VISION_DISABLED_REPLY`) instead of silent ignore.
- SeaweedFS must be configured for WA media save; otherwise user gets `WA_STORAGE_NOT_CONFIGURED_REPLY`.
- Multimodal user messages persist **text-only** in `messages.parts` (jsonb); image `file` parts are used only for the current agent turn via `stripFilePartsFromMessage` before save/history.
- Admin UI uses centered `max-w-2xl` layout with `surface-panel` + `divide-y` rows (`ModelSettingsRow`: label/description left, control right). Vision/voice enablement uses green toggle switches; model picks use compact right-aligned selects.

## Learned Workspace Facts

- Readable text attachments (txt, csv, md, json) inject text into the user message; images/PDFs route through vision model when enabled.
