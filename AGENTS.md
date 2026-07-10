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

- 22 native tool seragam pakai kontrak 4 file; memory: `remember_memory` / `forget_memory` / `list_memories`
- Chat UI tool registry belum ada — `message-row.tsx` masih conditional per tool
- `summarizedUpToSequence` default `-1`; `0` tanpa summary = belum di-summarize
- Main channel per user; WhatsApp channel global (admin scan QR, user pair nomor di Settings)
- Konteks chat di-ringkas ~5k token; riwayat lama via infinite scroll

## Environment

`.env.example` → `.env.local`. Wajib: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `DATABASE_URL`, `SESSION_SECRET`.

## Prinsip implementasi

- Diff minimal — ikuti pola file sekitar
- Jangan over-engineer
- Jangan edit file plan terlampir saat implementasi
- Jangan commit kecuali diminta user

## Skills (`.agents/skills`)

Every development cycle must create or update skills inside `.agents/skills`.

Format:

```
.agents/skills/develop-feature-[module-name]/SKILL.md
.agents/skills/develop-module-[feature-name]/SKILL.md
```

Scope: hanya major features atau modules.

Guidelines:

- Buat skill di level tinggi — fokus lokasi file relevan, bukan detail implementasi spesifik
- Tambahkan hal berguna yang perlu diketahui agent
- Tujuan: agent tidak perlu gather/explore terlalu banyak konteks di awal
