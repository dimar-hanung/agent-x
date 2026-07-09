---
name: agentx-mcp-todos
description: >-
  Manage AgentX todos via the agentx-todos MCP server (list, get, create,
  update, delete). Use when the user asks to track work, create/update/list
  todos, sync tasks to AgentX, or mentions MCP todo / TODO-N codes.
---

# AgentX MCP Todos

Kelola todo di **AgentX** lewat MCP server `user-agentx-todos` (tools: `list_todos`, `get_todo`, `create_todo`, `update_todo`, `delete_todo`).

## When to Use

- User minta buat, ubah, daftar, atau hapus todo
- User sebut kode `TODO-N`, status kanban, atau project AgentX
- Setelah rencana implementasi: pecah kerja jadi todo yang actionable
- Sebelum mulai kerja: cek todo aktif / in progress

## MCP Workflow

1. **Discover** — pastikan tool schema dari server `user-agentx-todos` (via GetMcpTools) sebelum invoke.
2. **Auth** — jika tool gagal auth, panggil `mcp_auth` sekali, lalu retry.
3. **Read before write** — `list_todos` / `get_todo` dulu jika update/delete atau cek duplikat.
4. **Write** — `create_todo` / `update_todo` / `delete_todo` dengan field yang valid.
5. **Confirm** — ringkas hasil ke user (kode, judul, status); jangan dump raw JSON.

### Tools

| Tool | Kapan |
|------|--------|
| `list_todos` | Daftar; filter opsional `status`, `project` |
| `get_todo` | Detail by `id` (UUID) atau `code` (`TODO-1`) |
| `create_todo` | Buat baru (`title` wajib) |
| `update_todo` | Ubah by `id` (minimal 1 field selain `id`) |
| `delete_todo` | Hapus permanen by `id` |

### Status

`todo` → `in_progress` → `waiting` (opsional) → `done`

| Status | Arti |
|--------|------|
| `todo` | Belum dikerjakan |
| `in_progress` | Sedang dikerjakan |
| `waiting` | Menunggu pihak/hal lain |
| `done` | Selesai |

### Project (repo ini)

Untuk kerja di repo AgentX ini, set:

```text
project: "agent-x"
```

Filter daftar: `list_todos` dengan `project: "agent-x"`.

### Batas field

- `title`: 1–255 karakter
- `description`: max 5000 (markdown)
- `project`: max 128
- `tags`: max 20 item, tiap tag max 64
- `update_todo` butuh UUID `id` (bukan code) — resolve dulu via `get_todo` / `list_todos` jika user kasih `TODO-N`

---

## Menulis Todo yang Baik

Prinsip (dari praktik task writing: judul imperatif, what + why, acceptance criteria testable, batas scope):

1. **Judul = aksi + objek + konteks singkat** (≈ 8–12 kata, verb imperatif).
2. **Deskripsi cukup agar orang lain bisa mulai tanpa tanya** — bukan novel.
3. **Acceptance criteria = pass/fail**, 3–6 item; lebih dari ~8 → pecah todo.
4. **Sebut out of scope** agar tidak scope creep.
5. **Deskriptif soal outcome; jangan over-prescribe solusi** kecuali constraint teknis wajib.

### Judul

| ✅ Baik | ❌ Hindari |
|---------|------------|
| Tambah validasi email di form Settings | Fix bug |
| Perbaiki duplikat hasil pagination search API | Update API |
| Dokumentasikan setup MCP todos di README | Users / Backend |

Pola: `[Verb] [hal spesifik] [untuk/di konteks]`

### Deskripsi — template markdown + emoji

Gunakan emoji **secukupnya** (heading saja), bukan di setiap baris.

**PENTING — emoji respons MCP ≠ emoji di DB:**

- Respons tool (`create_todo` / `get_todo` / dll.) selalu dihias oleh `lib/mcp/todos/format.ts` (✨, 📋 status, 📝, 📁, 🏷️). Emoji itu **hanya di teks balasan**, tidak ditulis ke kolom `description`.
- Yang tersimpan ke DB / tampil di dashboard = isi field `title` + `description` yang dikirim di argumen tool.
- Pipeline (Zod → repository → PostgreSQL) **tidak** strip emoji. Kalau description di DB tanpa emoji, artinya argumen `description` memang dikirim tanpa emoji (mis. `## Summary` plain).
- **MUST**: tulis emoji di string `description` (template di bawah). Jangan mengandalkan emoji di konfirmasi MCP sebagai bukti data tersimpan.

```markdown
## 📋 Summary
[1–2 kalimat: apa yang dikirim + kenapa penting]

## 🎯 Context
[Masalah / latar. Link desain, issue, atau file terkait jika ada]

## ✅ Acceptance Criteria
- [ ] [Kondisi testable 1]
- [ ] [Kondisi testable 2]
- [ ] [Kondisi testable 3]

## 🚫 Out of Scope
- [Hal yang sengaja tidak termasuk]

## 📝 Notes
- [Constraint teknis, pola yang harus diikuti, dependency — opsional]
```

Untuk todo sangat kecil, minimal:

```markdown
## 📋 Summary
[Satu kalimat outcome]

## ✅ Acceptance Criteria
- [ ] [Done when…]
```

### Acceptance criteria

| ✅ Baik | ❌ Buruk |
|---------|----------|
| Form menolak email tanpa `@` dan tampilkan error | Fitur jalan |
| Endpoint return 400 jika field kosong | Code bersih |
| Tidak ada item duplikat antar halaman pagination | Cepat / bagus |

### Tags (opsional)

Contoh: `bug`, `docs`, `mcp`, `auth`, `ui`. Konsisten lowercase singkat.

---

## Contoh Create

```json
{
  "title": "Tambah skill agent untuk MCP todos AgentX",
  "project": "agent-x",
  "status": "todo",
  "tags": ["docs", "mcp"],
  "description": "## 📋 Summary\nBuat skill Cursor agar agent memakai MCP todos AgentX dengan deskripsi markdown yang jelas.\n\n## 🎯 Context\nRepo AgentX punya server MCP `agentx-todos`. Agent perlu konvensi judul, deskripsi, project, dan status.\n\n## ✅ Acceptance Criteria\n- [ ] Skill ada di `.agents/skills/agentx-mcp-todos/SKILL.md`\n- [ ] Mencakup workflow tool MCP + template deskripsi\n- [ ] Project default untuk repo ini: `agent-x`\n\n## 🚫 Out of Scope\n- Perubahan API MCP server\n- UI dashboard todos"
}
```

## Contoh Update Status

Setelah resolve `id` dari `TODO-3`:

```json
{
  "id": "<uuid>",
  "status": "in_progress"
}
```

Saat selesai: `status: "done"`.

## Response ke User

Setelah operasi MCP, balas ringkas dalam Bahasa Indonesia:

1. **Apa** yang terjadi (dibuat / diubah / dihapus / daftar)
2. **Kode + judul** (mis. `TODO-12 — …`)
3. **Status / project** jika relevan
4. Langkah berikutnya hanya jika perlu

---

## Rules

- **MUST**: Pakai MCP `user-agentx-todos` untuk CRUD todo AgentX (jangan inventori todo hanya di chat jika user minta track di AgentX).
- **MUST**: Set `project: "agent-x"` untuk kerja di repo ini, kecuali user minta project lain.
- **MUST**: Tulis `title` imperatif + spesifik; `description` markdown dengan heading ber-emoji (**📋 Summary**, **🎯 Context**, **✅ Acceptance Criteria**, **🚫 Out of Scope**) — emoji harus ada di argumen `description`, bukan hanya di respons formatter.
- **MUST**: Emoji secukupnya di heading deskripsi; jangan spam emoji di judul.
- **MUST**: Resolve `TODO-N` → UUID sebelum `update_todo` / `delete_todo`.
- **NEVER**: Anggap emoji di teks konfirmasi MCP sudah tersimpan di DB — cek field `description` yang dikirim.
- **NEVER**: Hapus todo tanpa konfirmasi eksplisit user.
- **NEVER**: Buat todo duplikat — `list_todos` dulu jika ragu.
- **NEVER**: Commit API key MCP atau tempel key di chat/skill.

## Resources

- Docs setup MCP: `docs/mcp-todos.md`
- Tool registration: `lib/mcp/todos/tools.ts`
- Response formatting (emoji UI): `lib/mcp/todos/format.ts`
- Schema: `lib/todos/schemas.ts`
