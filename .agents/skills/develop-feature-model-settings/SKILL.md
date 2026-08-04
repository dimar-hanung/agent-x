## When to Use

Develop or extend AgentX global model settings (admin text/vision model dropdowns) and WhatsApp inbound media handling.

## Overview

Chat model selection is stored in PostgreSQL (`app_settings` singleton) and applied globally to web chat, WhatsApp channel replies, scheduler runs, and summarization fallbacks. Text and vision models may route to OpenRouter or Ollama based on model id. WhatsApp inbound media on the global channel is saved to each user's SeaweedFS tree under `wa/<phone>/` or `wa/<group>/` before the agent runs with multimodal parts when vision is required.

## Key locations

| Area | Path |
|------|------|
| Schema | `app_settings` in `lib/db/schema.ts` |
| Constants / allowed models | `lib/admin/model-settings/constants.ts` |
| Repository | `lib/admin/model-settings/repository.ts` |
| Admin API | `app/api/admin/model-settings/route.ts` |
| Admin UI | `app/dashboard/settings/model/page.tsx`, `components/dashboard/model-settings-card.tsx`, `components/dashboard/model-settings-row.tsx` |
| Provider routing | `lib/ai/openrouter.ts` (`getChatModel`, `isChatModelConfigured`) |
| Ollama client | `lib/ai/ollama.ts` |
| Web search provider | `app_settings.webSearchProvider` (`exa` \| `ollama`); admin dropdown on Model settings card |
| Web search routing | `lib/ai/web-search/execute.ts` — dispatches `web_search` / `web_fetch` by provider |
| Ollama.com web APIs | `lib/ai/ollama-web/` — `OLLAMA_API_KEY` for `https://ollama.com/api/web_search` and `/web_fetch` |
| Web search configured check | `lib/ai/web-search/is-configured.ts`, `lib/ai/web-search/runtime.ts` |
| Agent | `lib/ai/agents/chat-agent.ts` |
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

- **Text model (required):** OpenRouter — `deepseek/deepseek-v4-flash`, `deepseek/deepseek-v4-pro`, `qwen/qwen3-8b`. Ollama — `gemma4:31b-cloud`, `kimi-k2.7-code:cloud`, `gemma4:12b-it-q4_K_M` (local, `num_ctx: 4096`). Used for all text-only chat runs globally.
- **Vision model:** `disabled`, OpenRouter — `qwen/qwen3.7-flash`, `google/gemini-3.6-flash`, `qwen/qwen3-vl-8b-instruct`. Ollama — `gemma4:31b-cloud`, `kimi-k2.7-code:cloud`, `gemma4:12b-it-q4_K_M`. Used only when an inbound run includes image/visual attachments and vision is not `disabled`.
- **Ollama routing:** `isOllamaModelId()` in constants; `getChatModel()` routes Ollama ids to `lib/ai/ollama.ts` via `@ai-sdk/openai` against `{OLLAMA_BASE_URL}/v1`. Default base URL `http://172.16.81.16:11434`. OpenRouter-only settings (e.g. `reasoning`) are skipped for Ollama.
- **Web search provider:** Admin selects `exa` or `ollama` in Model settings (`webSearchProvider`). Model-visible tool keys are provider-neutral: `web_search` / `web_fetch`. Exa uses `EXA_API_KEY`; Ollama Search uses `OLLAMA_API_KEY` against ollama.com (not `OLLAMA_BASE_URL`). Default provider is `exa`.
- **Chat gate:** `POST /api/chat` uses `isChatModelConfigured(textModelId)` — Ollama models do not require `OPENROUTER_API_KEY`. Voice, embeddings, and Apify analysis still require OpenRouter.
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
