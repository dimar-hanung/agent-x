# Pengindeksan file (Docling + pgvector)

AgentX mengindeks **PDF** dan **DOCX** setelah unggahan dashboard dikonfirmasi (`POST /api/files/confirm`). Proses berjalan di worker terpisah; chat file memakai RAG vektor.

## Prasyarat

- PostgreSQL dengan extension **pgvector** (`CREATE EXTENSION vector`).
- **Docling Serve** dapat dijangkau dari server app (default env: `http://172.16.81.16:5001`).
- `OPENROUTER_API_KEY` (embedding: `openai/text-embedding-3-large`).

## Environment

Lihat [`.env.example`](../.env.example):

| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `DOCLING_SERVE_URL` | Disarankan | Base URL Docling Serve |
| `DOCLING_SERVE_API_KEY` | Opsional | Header `X-Api-Key` jika server memakai auth |
| `OPENROUTER_EMBEDDING_MODEL` | Opsional | Default `openai/text-embedding-3-large` |
| `FILES_INDEX_WORKER_POLL_INTERVAL_MS` | Opsional | Default `15000` |

## Migrasi database

`DATABASE_URL` dibaca dari **`.env.local` dan `.env`** (script `npm run db:migrate`).

```bash
npm run db:migrate           # termasuk migrasi 0012 (chats.source_file_id)
npm run db:file-rag          # alternatif idempoten hanya 0012
npm run db:file-rag:vectors  # tabel indeks — butuh pgvector di server PostgreSQL
```

## Menjalankan worker

```bash
npm run files:index-worker
```

Worker mem-poll baris `user_file_indexes` berstatus `pending`, memanggil Docling HybridChunker (`/v1/chunk/hybrid/file`), embedding via OpenRouter, menyimpan ke `user_file_chunks`.

## Alur singkat

1. User unggah PDF/DOCX di Dashboard → File → konfirmasi.
2. API confirm meng-enqueue `user_file_indexes` (status `pending`).
3. Worker: chunk contextualized (`text` field) → embed → `ready`.
4. User buka **Tanya isi file** → `/dashboard/files/{fileId}`.
5. Chat mengirim `fileId` ke `POST /api/chat`; server retrieval top-K cosine lalu injeksi konteks ke system prompt.

## API

| Endpoint | Fungsi |
|----------|--------|
| `GET /api/files/{id}/index` | Status indeks |
| `GET /api/files/{id}/preview` | Index ready: `kind: "chunks"` (+ optional `pdfUrl`); PDF before ready: iframe URL |
| `POST /api/chat` + `fileId` | Chat RAG terikat file |

## Troubleshooting

- **Kolom `source_file_id` tidak ada** / error di `/dashboard/files/[fileId]`: `npm run db:migrate` atau `npm run db:file-rag`.
- **Indeks tetap `pending`**: jalankan `npm run files:index-worker` dan `npm run db:file-rag:vectors` (pgvector).
- **Docling gagal**: cek koneksi ke `DOCLING_SERVE_URL` dan log worker.
- **Embedding gagal**: cek saldo/kuota OpenRouter dan model embedding.
- **pgvector error** (`extension "vector" is not available`): pasang `postgresql-16-pgvector` (atau sesuai versi PG), lalu `npm run db:file-rag:vectors`.
