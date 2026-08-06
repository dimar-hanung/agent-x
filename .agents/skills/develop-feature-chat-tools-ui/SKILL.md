---
name: develop-feature-chat-tools-ui
description: >-
  Develop chat tool call UI and failure feedback (tool chips, Exa chips, system
  prompt after tool errors, WhatsApp tool progress). Use when changing how tool
  results/errors appear in chat, WA status lines, or how the model must reply
  after success: false.
---

# Develop Feature: Chat Tools UI

## When to Use

- Changing how tool calls render in the chat transcript
- Soft-fail (`success: false`) vs hard-fail (`output-error`) UX
- System prompt rules for summarizing tool success/failure
- Aligning generic tool chips with Exa-specific chips
- WhatsApp progress messages when a tool starts (e.g. "Menghubungkan ke kalender…")

## Overview

Native tools return `ToolResult` (`success`, optional `message`). Soft failures stay `output-available` with `success: false`. The model must explain failures in Indonesian; the UI must not show soft fails as “Selesai”. When replies mirror to WhatsApp, each tool start sends a short Indonesian status line before the tool runs.

## Key locations

| Area | Path |
|------|------|
| System prompt | `lib/ai/chat-config.ts` — `PROMPT_INTRO` failure rule |
| Generic tool chip | `components/chat/message-row.tsx` — `ToolChip` |
| Social media chip | `components/chat/message-row.tsx` — `SocialMediaToolChip` (`fetch_*_data`) |
| Web search tool chip | `components/chat/exa-tool-chip.tsx` — provider-neutral exports with legacy Exa-key support |
| Result contract | `lib/ai/tools/ai-tools.types.ts` — `ToolResult` |
| WA progress labels | `lib/ai/tools/tool-progress-labels.ts` |
| Friendly tool errors | `lib/ai/tools/friendly-tool-error.ts` |
| WA tool-start notify | `lib/integrations/whatsapp/notify-tool-progress.ts` |
| Agent callbacks | `lib/ai/agents/chat-agent.ts` — `onToolExecutionStart` / `onToolExecutionEnd` |
| WA paths | `app/api/chat/route.ts` (main-channel mirror), `lib/channel/process-channel-message.ts` |

## Behavior agents must know

- Soft fail: `{ success: false, message }` → still `state === "output-available"`; treat as failed in UI (label **Gagal**, show `message`).
- Hard fail: `state === "output-error"` → show **Gagal** + fallback “Tool gagal dijalankan.”
- Prompt requires a non-silent Indonesian reply after any failed tool.
- Web search chips handle soft fails; generic `ToolChip` must match that pattern.
- Chat tool registry is still per-tool conditionals in `message-row.tsx` (no shared registry yet): web search → `WebSearchToolChip`, Apify social → `SocialMediaToolChip`, else `ToolChip`.
- Model-visible web search keys are `web_search` / `web_fetch`. The web UI also recognizes historical `exa_web_search` / `exa_web_fetch` parts so old chat transcripts still render.
- Message source badge: `scheduler` → **Otomatisasi**, `apify` → **Media sosial**, `whatsapp` → **WhatsApp**.
- WhatsApp tool progress: wire `onToolExecutionStart` on the agent (not only `onStepEnd`). Labels live in `tool-progress-labels.ts`; unknown tools fall back to `Menjalankan {name}…`. Mid-tool search progress uses `notifyWhatsAppToolProgress` with dynamic `Mencari dengan: …` lines (recognized by `isToolProgressLabel` / `isWhatsAppSearchProgressMessage`).
- WhatsApp summary tools use the status `Menyinkronkan dan merangkum data WhatsApp…` while the inbox watermark catches up. The web generic tool chip shows the same running label; do not send repeated polling messages.
- WhatsApp tool errors: wire `onToolExecutionEnd` → `notifyWhatsAppToolError`. Soft + hard fails mapped via `toFriendlyToolError` / `formatWhatsAppToolError` (no snake_case tool keys, no API/HTTP jargon). Format: `❌ {friendly Indonesian message}`.
- Progress/error notifies are for main-channel web mirror and WhatsApp/scheduler channel replies; send failures are swallowed so the agent continues.
- Async Apify assistant messages can include `metadata.socialPreviews`. Render these with `components/chat/social-media-result-cards.tsx` as stable, wide source cards before the analysis.
- Keep missing-image placeholders the same size as image-backed cards so social results do not collapse into a smaller chip.
- Friendly error map: `lib/ai/tools/friendly-tool-error.ts` — also used by chat tool chips.
