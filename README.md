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
| `OPENROUTER_MODEL` | Model id (default: `deepseek/deepseek-v4-pro`) |
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

## Features

- **Chat** — streaming agent with role-gated native tools and PostgreSQL history
- **Todos** — dashboard kanban + MCP server for external clients
- **Memory** — persistent user memories via chat tools
- **Scheduled jobs** — recurring / one-time AI jobs via `node-schedule` worker
- **Social media (Apify)** — async TikTok / Twitter/X / Threads snapshots via worker
- **WhatsApp** — global channel via Evolution API (admin QR, user phone pairing)
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

Users with role `client` or `admin` can create recurring or one-time AI jobs via chat. A background worker executes them with `node-schedule` and saves results to the user's **Kanal utama** (main channel).

Run the app and scheduler worker in **separate terminals**:

```bash
npm run dev
npm run scheduler:worker
npm run apify:worker
```

Optional env: `SCHEDULER_POLL_INTERVAL_MS` (default `15000`) — how often the worker syncs jobs from PostgreSQL.

For Apify social media jobs, keep `npm run apify:worker` running too. Optional env: `APIFY_WORKER_POLL_INTERVAL_MS` (default `15000`).

Chat examples:

```
Ingatkan saya setiap pagi jam 9 untuk merangkum inbox
Besok jam 15:00 kirim pengingat untuk review PR
Tampilkan jadwal aktif saya
```

Active schedules appear under **Jadwal aktif** in the chat sidebar.

### Main channel & WhatsApp

Each user has one pinned **Kanal utama** at `/chat` (cron output and default chat land here). WhatsApp uses a **single global channel number**:

1. **Admin** — open [Dashboard → Channel WhatsApp](http://localhost:3000/dashboard/whatsapp-channel), scan QR (Evolution API).
2. **Users** — open [Settings → Integrations](http://localhost:3000/dashboard/settings), register their phone number, then message the global channel number from that phone.

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

Create a personal API key under [Settings → Integrations](http://localhost:3000/dashboard/settings), then connect Cursor/Claude to `{ORIGIN}/api/mcp/mcp` with `Authorization: Bearer <key>`. See [docs/mcp-todos.md](docs/mcp-todos.md).

### Web search (Exa)

With `EXA_API_KEY` set, sign in as `client@agentx.local` (or admin) and try:

```
Cari berita AI terbaru
```

The agent uses native `exa_web_search` and `exa_web_fetch` tools via the Exa REST API.
