# AgentX

AgentX — intelligent agent platform with chat, role-gated AI tools, todos, memory, WhatsApp channel, and scheduled jobs.

**Stack:** Next.js (App Router) · React · TypeScript · PostgreSQL + Drizzle · Vercel AI SDK + OpenRouter · Tailwind + shadcn/ui

## Prerequisites

- **Node.js 24.x** (Active LTS) — use `nvm use` to read the version from `.nvmrc`
- npm, pnpm, yarn, or bun
- PostgreSQL 16

## Environment

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter API key for the chat model |
| `OPENROUTER_MODEL` | Bootstrap fallback model id when DB settings are empty (default: `deepseek/deepseek-v4-pro`). Runtime text/vision models are configured by admin at **Dashboard → Pengaturan Model**. |
| `DATABASE_URL` | PostgreSQL connection string (`127.0.0.1:5432/agentx`) |
| `SESSION_SECRET` | Random string (32+ chars) for session cookies |
| `INTEGRATIONS_ENCRYPTION_KEY` | 32-byte key (hex or base64) for encrypting integration secrets at rest. Generate with `openssl rand -hex 32` |
| `EXA_API_KEY` | Exa API key for web search tools (`client`/`admin` roles). Get one at [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys) |
| `APIFY_API_TOKEN` | Apify API token for async social media snapshot tools |

See `.env.example` for WhatsApp / Evolution, scheduler, and Apify worker variables.

## Database setup

```bash
# 1. Create database + role (password must match DATABASE_URL in .env.local)
AGENTX_DB_PASSWORD=YOUR_PASSWORD npm run db:provision

# 2. Push schema
npm run db:push

# 3. Seed demo users (local/dev only — blocked when NODE_ENV=production)
npm run db:seed
```

## Dev login (after seed)

Sign in at [http://localhost:3000/login](http://localhost:3000/login):

| Email | Password | Role |
|-------|----------|------|
| `admin@agentx.local` | `admin12345` | admin |
| `client@agentx.local` | `client12345` | client |

Do **not** run seed with these passwords in production.

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Chat is at [http://localhost:3000/chat](http://localhost:3000/chat) (requires login).

## Production (PM2)

Run the Next.js app plus background workers under [PM2](https://pm2.keymetrics.io/).

```bash
# Use the project Node version, then install PM2 once
nvm use
npm i -g pm2

# Build
npm run build

# Workers read `.env` (not `.env.local`) — copy if needed
cp .env.local .env

# Start app + workers
pm2 start npm --name agentx -- start
pm2 start npm --name agentx-scheduler -- run scheduler:worker
pm2 start npm --name agentx-apify -- run apify:worker
pm2 start npm --name agentx-files-index -- run files:index-worker
pm2 start npm --name agentx-whatsapp-inbox -- run whatsapp-inbox:worker
pm2 start npm --name agentx-whatsapp-bot -- run whatsapp-bot:worker

# Persist process list across reboots
pm2 save
pm2 startup
```

Useful commands:

```bash
pm2 status
pm2 logs agentx
pm2 restart all
pm2 stop all
```

After code changes: `npm run build && pm2 restart all`.

## Background workers

All workers are separate Node processes (not part of `next start`). They read `.env` via `--env-file=.env`. Without the relevant worker running, that feature queues work but never finishes it.

| npm script | PM2 name | Purpose |
|------------|----------|---------|
| `scheduler:worker` | `agentx-scheduler` | Runs recurring / one-time AI jobs (`node-schedule`) and posts results to the user's **Kanal utama**. Also sends todo `starts_at` / reminder WhatsApp notifications. |
| `apify:worker` | `agentx-apify` | Polls Apify actor runs for TikTok / Twitter/X / Threads snapshots (`fetch_*_data`). On completion, stores items and notifies the user's main channel (and optionally WhatsApp). |
| `files:index-worker` | `agentx-files-index` | Indexes uploaded PDF/DOCX (Docling + embeddings) for file RAG (`ask_file`). Also indexes WhatsApp-inbound documents under `wa/…` and can notify when a file is ready. |
| `whatsapp-inbox:worker` | `agentx-whatsapp-inbox` | Promotes durable personal-inbox webhook events into inbox chat/message tables (per-chat order, bounded concurrency). Text is stored for summaries; media stays deferred metadata. |
| `whatsapp-bot:worker` | `agentx-whatsapp-bot` | Claims global-channel WhatsApp bot jobs after the webhook enqueues them. Generates the AI reply and delivers it via Evolution. Without this, inbound channel messages queue but never get answered. |

Local / multi-terminal (alongside `npm run dev`):

```bash
npm run scheduler:worker
npm run apify:worker
npm run files:index-worker
npm run whatsapp-inbox:worker
npm run whatsapp-bot:worker
```

Optional poll intervals (defaults `15000` ms unless noted in `.env.example`): `SCHEDULER_POLL_INTERVAL_MS`, `APIFY_WORKER_POLL_INTERVAL_MS`, `FILES_INDEX_WORKER_POLL_INTERVAL_MS`, plus WhatsApp inbox/bot worker env in `.env.example`.

## Features

- **Chat** — streaming agent with role-gated native tools and PostgreSQL history
- **Todos** — dashboard kanban + MCP server for external clients
- **Memory** — persistent user memories via chat tools
- **Scheduled jobs** — recurring / one-time AI jobs via `node-schedule` worker
- **Social media (Apify)** — async TikTok / Twitter/X / Threads snapshots via worker
- **WhatsApp** — global channel via Evolution API (admin QR, user phone pairing); personal read-only inbox with executive summaries per chat
- **Integrations** — Google (Gmail / Calendar / Drive), personal API keys for MCP
- **File storage** — private Drive-like files via SeaweedFS (20 GB/user); Dashboard → File; chat tools `list_files` / `upload_file` / `read_file`

## AI tools

AgentX uses [Vercel AI SDK](https://sdk.vercel.ai) with role-gated tools and PostgreSQL-backed chat history.

- **Add a native tool**: [docs/adding-ai-tools.md](docs/adding-ai-tools.md)
- **Add an MCP tool** (consume external MCP): [docs/adding-mcp-tools.md](docs/adding-mcp-tools.md)
- **Todos MCP server** (host CRUD for clients): [docs/mcp-todos.md](docs/mcp-todos.md)
- **Scheduled jobs**: [docs/adding-scheduled-jobs.md](docs/adding-scheduled-jobs.md)
- **User roles**: stored in PostgreSQL (`admin`, `client`, `guest`); tool access is configured in `lib/ai/roles/tools-by-role.ts`

### Scheduled jobs

Users with role `client` or `admin` can create recurring or one-time AI jobs via chat. The **scheduler** worker executes them with `node-schedule` and saves results to the user's **Kanal utama** (main channel). See [Background workers](#background-workers) for every worker and how to run them.

Chat examples:

```
Ingatkan saya setiap pagi jam 9 untuk merangkum inbox
Besok jam 15:00 kirim pengingat untuk review PR
Tampilkan jadwal aktif saya
```

Active schedules appear under **Jadwal aktif** in the chat sidebar.

### Main channel & WhatsApp

Each user has one pinned **Kanal utama** at `/chat` (cron output and default chat land here). WhatsApp has two modes:

1. **Global channel** (admin) — one shared bot number for AI chat via WhatsApp.
2. **Personal inbox** (read-only) — each user scans QR to connect their own WhatsApp; AgentX ingests DMs and groups for executive summaries (Dashboard → Ringkasan WhatsApp or via chat tools).

**Global channel setup:**

1. **Admin** — open [Dashboard → Pengaturan → Channel WhatsApp](http://localhost:3000/dashboard/settings/whatsapp-channel), scan QR (Evolution API).
2. **Users** — open [Pengaturan → Integrasi](http://localhost:3000/dashboard/settings), register their phone number, then message the global channel number from that phone.
3. Keep `npm run whatsapp-bot:worker` running. The webhook acknowledges Evolution instantly and enqueues a durable job; this worker generates and delivers the reply. Without it, inbound messages queue but never get answered.

**Personal inbox setup:**

1. **Users** — open [Pengaturan → Integrasi](http://localhost:3000/dashboard/settings), connect **WhatsApp pribadi** (scan QR).
2. Browse summaries at [Dashboard → Ringkasan WhatsApp](http://localhost:3000/dashboard/whatsapp-inbox) or ask in chat: *"Rangkum grup Marketing hari ini"*.
3. Apply database migrations, then keep `npm run whatsapp-inbox:worker` running. The webhook only appends durable events; the worker promotes text events into the inbox tables.

**Full setup guide:** [docs/evolution-api-setup.md](docs/evolution-api-setup.md)

```bash
cp infra/evolution/.env.example infra/evolution/.env   # edit keys & URLs
npm run evolution:up
```

### File storage (SeaweedFS)

Private per-user storage (folders, upload/download, 20 GB quota) backed by SeaweedFS S3. UI: [Dashboard → File](http://localhost:3000/dashboard/files).

**Setup guide:** [docs/seaweedfs-setup.md](docs/seaweedfs-setup.md)

```bash
# Start master + volume + filer + S3 gateway
npm run seaweedfs:up

# Set SEAWEEDFS_S3_* in .env.local (keys must match infra/seaweedfs/s3.json)
# Create bucket once — see docs/seaweedfs-setup.md
```

Chat tools (distinct from Google Drive): `list_files`, `upload_file`, `read_file`.

### Todos MCP server

Create a personal API key under [Pengaturan → Integrasi](http://localhost:3000/dashboard/settings), then connect Cursor/Claude to `{ORIGIN}/api/mcp/mcp` with `Authorization: Bearer <key>`. See [docs/mcp-todos.md](docs/mcp-todos.md).

### Web search (Exa)

With `EXA_API_KEY` set, sign in as `client@agentx.local` (or admin) and try:

```
Cari berita AI terbaru
```

The agent uses provider-neutral `web_search` and `web_fetch` tools, routed through the web search provider selected by an admin.
