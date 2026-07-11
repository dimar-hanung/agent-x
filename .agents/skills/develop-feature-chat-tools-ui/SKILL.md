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
| Exa tool chip | `components/chat/exa-tool-chip.tsx` |
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
- Exa chips already handled soft fails; generic `ToolChip` must match that pattern.
- Chat tool registry is still per-tool conditionals in `message-row.tsx` (no shared registry yet).
- WhatsApp tool progress: wire `onToolExecutionStart` on the agent (not only `onStepEnd`). Labels live in `tool-progress-labels.ts`; unknown tools fall back to `Menjalankan {name}…`.
- WhatsApp tool errors: wire `onToolExecutionEnd` → `notifyWhatsAppToolError`. Soft + hard fails mapped via `toFriendlyToolError` / `formatWhatsAppToolError` (no snake_case tool keys, no API/HTTP jargon). Format: `❌ {friendly Indonesian message}`.
- Progress/error notifies are for main-channel web mirror and WhatsApp/scheduler channel replies; send failures are swallowed so the agent continues.
- Friendly error map: `lib/ai/tools/friendly-tool-error.ts` — also used by chat tool chips.
