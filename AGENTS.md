# AgentX — Panduan Agent

Konteks persisten untuk agent di repo **AgentX** (`agentx`).

## Stack

**Next.js 16** (App Router) · **React 19** · **TypeScript** · **PostgreSQL** + **Drizzle** · **Vercel AI SDK v7** + **OpenRouter** · **Tailwind 4** + **shadcn/ui**

- Auth: session cookie, role `admin` | `client` | `guest`
- Path alias: `@/*` → root proyek
- Protected routes: `/chat`, `/dashboard` via `middleware.ts`

## Bahasa & UX

**Semua teks user-facing dalam Bahasa Indonesia** — label, error, empty state, aria-label, response API di UI.

- Nada percakapan, ringkas, imperatif ("Simpan", bukan "Anda perlu menyimpan")
- Istilah teknis tetap Inggris jika terjemahan aneh: API, server, cache, Email, Error
- Error: "Gagal [action]" / "Tidak dapat [action]"; empty state positif ("Belum ada chat")
- Tetap Inggris: kode, docs dev, system prompt (`lib/ai/chat-config.ts`), deskripsi tool untuk model

Belum ada i18n — string inline di `lib/site-config.ts`, `components/chat/`, `components/auth/`, `app/api/auth|chat|chats/`, `components/dashboard/`.

## Konvensi kode

- File **kebab-case**; tool keys **snake_case** (`get_time`)
- Server Components untuk fetch; `"use client"` untuk UI interaktif
- Auth: `getSessionUser()` / `resolveUser()`
- Tool access: `lib/ai/roles/tools-by-role.ts` (single source of truth)
- Icons brand/integrasi: SVG inline di `components/icons/`, bukan `<img>`
- Tanggal SSR: locale `id-ID` + `timeZone: "Asia/Jakarta"`

### Native AI tools

Folder wajib 4 file di `lib/ai/tools/<tool-name>/`:

```
*.tool.ts   # thin factory
schema.ts   # Zod + input type
execute.ts  # business logic (panggil client, bukan fetch langsung)
types.ts    # *ToolResult extends ToolResult
```

- `ai-tools.types.ts` — hanya `ToolResult` base + barrel re-export
- HTTP client eksternal: `lib/ai/<domain>/` (mis. `lib/ai/exa/client.ts`)
- Konstanta lintas tool domain: `lib/ai/tools/<domain>/constants.ts` (mis. Gmail)
- Wire: `tool-keys.ts` → `index.ts` → `resolve-tools.ts` → `chat-agent.ts`
- Detail: `docs/adding-ai-tools.md` · MCP: `docs/adding-mcp-tools.md`

## Workspace facts

- Native tools (Exa, Google, todos, memory, Apify social, schedules, …) seragam pakai kontrak 4 file; memory: `remember_memory` / `forget_memory` / `list_memories`
- Apify social: `fetch_tiktok_data` / `fetch_twitter_data` / `fetch_threads_data` — async on cache miss; worker `npm run apify:worker` menulis hasil ke Kanal utama (`source: "apify"`)
- Chat UI tool registry belum ada — `message-row.tsx` masih conditional per tool (Exa chip, SocialMediaToolChip, generic ToolChip); soft-fail (`success: false`) ditampilkan sebagai **Gagal** + `message` di chips
- System prompt (`chat-config.ts`) mewajibkan balasan Bahasa Indonesia setelah tool gagal — jangan silent turn; Apify: jangan sebut job/snapshot/actor IDs ke user
- `summarizedUpToSequence` default `-1`; `0` tanpa summary = belum di-summarize
- Main channel per user; WhatsApp channel global (admin scan QR, user pair nomor di Settings)
- Saat tool jalan di path WhatsApp (main-channel mirror / channel reply), kirim status singkat ke WA via `onToolExecutionStart` (`tool-progress-labels.ts`); kirim error tool via `onToolExecutionEnd` (`notifyWhatsAppToolError`)
- Konteks chat di-ringkas ~5k token; riwayat lama via infinite scroll

## Environment

`.env.example` → `.env.local`. Wajib: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `DATABASE_URL`, `SESSION_SECRET`. Opsional sosial: `APIFY_API_TOKEN`.

## Prinsip implementasi

- Diff minimal — ikuti pola file sekitar
- Jangan over-engineer
- Jangan edit file plan terlampir saat implementasi
- Jangan commit kecuali diminta user
