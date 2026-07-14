---
name: develop-feature-chat-panel
description: >-
  Develop AgentX web chat UI (ChatPanel composer, streaming status, stop
  generation, message list wiring). Use when changing the chat input bar,
  send/stop controls, useChat transport, or new-chat navigation after stream.
---

# Develop Feature: Chat Panel

## When to Use

- Changing the chat composer (textarea, send/stop button)
- Wiring `useChat` status, transport, or abort behavior
- New-chat URL navigation after the first reply finishes or is stopped
- Passing server `abortSignal` for cancelled generations

## Overview

`ChatPanel` is the main web chat surface. It uses `@ai-sdk/react` `useChat` with `DefaultChatTransport` against `POST /api/chat`. While status is `submitted` or `streaming`, the composer shows a stop control that calls `stop()`; the API receives `abortSignal: req.signal` so generation aborts when the client disconnects.

## Key locations

| Area | Path |
|------|------|
| Chat composer + `useChat` | `components/chat/chat-panel.tsx` |
| Message list / typing indicator | `components/chat/chat-message-list.tsx` |
| Chat API stream | `app/api/chat/route.ts` — `createAgentUIStreamResponse` |
| Chat pages | `app/chat/page.tsx`, `app/chat/[id]/page.tsx` |

## Behavior agents must know

- Destructure `stop` from `useChat`; call it when the user clicks stop during `submitted` / `streaming`.
- Replace the send button with a stop (filled square) while busy — do not keep a spinner-only disabled send.
- Pass `abortSignal: req.signal` into `createAgentUIStreamResponse` so server work cancels with the client abort.
- After a new (unsaved URL) chat becomes `ready` from a busy state with messages, navigate to `/chat/{chatId}` — treat both `streaming` and `submitted` as prior busy statuses (covers stop before first token).
- User-facing labels in this UI should be Bahasa Indonesia (e.g. aria-label **Hentikan**, **Kirim pesan**).
