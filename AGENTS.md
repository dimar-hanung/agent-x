# AgentX — Panduan Agent

Dokumen ini memberi konteks persisten untuk agent yang bekerja di repo **AgentX** (`agentx`).

## Ringkasan proyek

AgentX adalah platform agent berbasis **Next.js 16** (App Router) + **React 19** + **TypeScript**, dengan:

- **Auth** — session cookie, role `admin` | `student` | `guest`
- **Chat AI** — **Vercel AI SDK v7**, **OpenRouter**, tool native (Exa REST)
- **Database** — **PostgreSQL** + **Drizzle ORM**
- **UI** — **Tailwind CSS 4**, **shadcn/ui**, dark mode

Path alias: `@/*` → root proyek.

## Bahasa & UX writing

**Semua teks yang dilihat user harus dalam Bahasa Indonesia** — microcopy, label, placeholder, error message, empty state, aria-label, dan response API yang ditampilkan di UI.

**Istilah teknis tetap dalam bahasa Inggris** jika terjemahan terasa aneh atau membingungkan.

### Suara & nada

- Gunakan **Bahasa Indonesia percakapan** — hangat, ringkas, siap membantu (bukan formal/birokratis)
- Kata sehari-hari yang pendek: "butuh" bukan "membutuhkan", "pilih" bukan "memilih"
- **Active voice** dan bentuk imperatif: "Simpan file", bukan "Anda perlu menyimpan file"
- Hindari "Mohon" → pakai "Silakan" atau hilangkan
- Hindari overuse "Anda" → subjek implisit atau "kamu" untuk app konsumen
- Tombol: maksimal 2–3 kata, bentuk imperatif ("Simpan", "Kirim", "Batal")

### Istilah yang tetap Inggris

| Kategori | Contoh |
|----------|--------|
| Nama produk | AgentX, OpenRouter, Vercel |
| Akronim | API, URL, UI, UX, MCP, SQL, PIN |
| Tech jargon | server, database, cloud, cache, streaming, session |
| Format file | PDF, JPEG, CSV, .docx |
| Istilah dev (kode/docs) | debug, deploy, commit, push, merge |
| Placeholder variabel | `{email}`, `{username}` — jangan ubah isi kurung kurawal |

### Istilah umum yang diterjemahkan

| English | Indonesian |
|---------|------------|
| Save | Simpan |
| Cancel | Batal |
| Delete | Hapus |
| Settings | Pengaturan |
| Account | Akun |
| Log in / Sign in | Masuk |
| Sign up | Daftar / Buat akun |
| Error | Error / Kesalahan (konteks teknis boleh "Error") |
| Upload / Download | Upload / Download (boleh tetap Inggris) |
| Email / Password | Email / Password |

### Aturan penting

- **Ekspansi teks:** Bahasa Indonesia bisa 15–20% lebih panjang — prioritaskan ringkas agar UI tidak pecah
- **Placeholder:** Pertahankan `{variable}` persis seperti aslinya
- **Kapitalisasi:** judul/menu Title Case ("Simpan Sebagai"); kalimat sentence case; akronim UPPERCASE (API, URL)
- **Angka:** titik untuk ribuan (1.000), koma untuk desimal (5,25)
- **Ampersand (&):** tulis "dan" kecuali bagian dari kode/variabel

### Pola pesan error

- "Cannot / Could not" → "Tidak dapat [action]"
- "Failed to" → "Gagal [action]"
- Contoh: "Tidak dapat menghubungkan ke server", "Upload gagal", "Format email salah"

### Empty state

- Nada membantu, bukan negatif: "Belum ada chat" bukan "Tidak ada chat"

### Contoh terjemahan

| English | ❌ Buruk | ✅ Baik |
|---------|----------|---------|
| Upload failed | Unggah gagal | Upload gagal |
| API connection error | Kesalahan koneksi antarmuka pemrograman aplikasi | Error koneksi API |
| Save your changes? | Apakah Anda ingin menyimpan perubahan Anda? | Simpan perubahan? |
| Something went wrong | Sesuatu salah | Terjadi kesalahan |
| Log in to your account | Log masuk ke akun Anda | Masuk ke akun |
| Invalid email format | Format surel tidak valid | Format email salah |
| Cache cleared | Tembolok dibersihkan | Cache dihapus |

### Yang tetap bahasa Inggris

- **Kode** — nama variabel, fungsi, komentar teknis, commit message
- **Dokumentasi developer** — `docs/adding-ai-tools.md`, `docs/adding-mcp-tools.md`, README setup
- **System prompt AI** — `lib/ai/chat-config.ts` (kecuali diminta sebaliknya)
- **Deskripsi tool untuk model** — `lib/ai/tools/`, `lib/ai/mcp/` (bahasa Inggris agar model memahami)

## Lokasi string UI

Belum ada framework i18n — string inline di file berikut:

| Area | File |
|------|------|
| Branding | `lib/site-config.ts` |
| Login / register | `components/auth/login-form.tsx`, `app/page.tsx`, `app/login/page.tsx` |
| Chat | `components/chat/chat-panel.tsx`, `chat-sidebar.tsx`, `chat-shell.tsx` |
| Dashboard nav | `components/dashboard/app-sidebar.tsx`, `nav-*.tsx`, `app/dashboard/page.tsx` |
| API errors (user-facing) | `app/api/auth/`, `app/api/chat/`, `app/api/chats/` |
| A11y | `components/ui/theme-toggle.tsx`, `sidebar.tsx`, `sheet.tsx` |
| Default chat title | `lib/db/repositories/chat-repository.ts` |

Saat menambah string baru, tulis langsung dalam Bahasa Indonesia sesuai panduan di atas.

## Konvensi kode

- File: **kebab-case** (`chat-panel.tsx`, `get-time.tool.ts`)
- Tool keys: **snake_case** (`get_time`, `exa_web_search`)
- Server Components untuk data fetch; `"use client"` untuk UI interaktif
- Tool access: `lib/ai/roles/tools-by-role.ts` (single source of truth)
- Auth server-side: `getSessionUser()` / `resolveUser()`
- Protected routes: `/chat`, `/dashboard` via `middleware.ts`

## Menambah fitur AI

- Native tool → `docs/adding-ai-tools.md`
- MCP tool → `docs/adding-mcp-tools.md`
- Wire: `tool-keys.ts` → `tools/index.ts` + `mcp/servers/` → `resolve-tools.ts` → `chat-agent.ts`

## Environment

Salin `.env.example` → `.env.local`. Variabel wajib: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `DATABASE_URL`, `SESSION_SECRET`.

## Prinsip implementasi

- Diff minimal — jangan ubah kode yang tidak terkait
- Ikuti pola yang sudah ada di file sekitar
- Jangan over-engineer atau tambah abstraksi yang tidak perlu
- Jangan commit kecuali diminta user
