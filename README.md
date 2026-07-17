# AgentX

Chat agent platform — todos, memory, WhatsApp, scheduled jobs, file storage.

**Stack:** Next.js 16 · React 19 · TypeScript · PostgreSQL + Drizzle · Vercel AI SDK + OpenRouter · Tailwind + shadcn/ui

## First setup

**Prerequisites:** Node.js 24 (`nvm use`), PostgreSQL 16, Docker, npm, AWS CLI (untuk bucket SeaweedFS).

```bash
# 1. Install
nvm use
npm install

# 2. Env
cp .env.example .env.local
# Generate secrets (pakai nilai berbeda untuk tiap key):
openssl rand -hex 32   # SESSION_SECRET
openssl rand -hex 32   # INTEGRATIONS_ENCRYPTION_KEY
openssl rand -hex 32   # EVOLUTION_API_KEY (+ AUTHENTICATION_API_KEY di infra/evolution)
openssl rand -hex 16   # WHATSAPP_WEBHOOK_SECRET
```

Isi **semua** variabel di `.env.local` (lihat `.env.example`). Minimal yang harus diisi:

| Variable | Keterangan |
|----------|------------|
| `OPENROUTER_API_KEY` | API key OpenRouter |
| `OPENROUTER_MODEL` | Model id |
| `DATABASE_URL` | `postgresql://agentx:PASSWORD@127.0.0.1:5432/agentx` |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `INTEGRATIONS_ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `EXA_API_KEY` | [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys) |
| `APIFY_API_TOKEN` | Token Apify |
| `EVOLUTION_API_URL` | `http://127.0.0.1:8080` |
| `EVOLUTION_API_KEY` | Sama dengan `AUTHENTICATION_API_KEY` Evolution |
| `EVOLUTION_INSTANCE_NAME` | `agentx-channel` |
| `WHATSAPP_WEBHOOK_SECRET` | `openssl rand -hex 16` |
| `AGENTX_PUBLIC_URL` | `http://localhost:3001` (dev) |
| `SEAWEEDFS_S3_*` | Harus cocok dengan `infra/seaweedfs/s3.json` |
| `DOCLING_SERVE_URL` | URL Docling Serve untuk indexing file |

```bash
# 3. Database (password = yang di DATABASE_URL)
AGENTX_DB_PASSWORD=YOUR_PASSWORD npm run db:provision
npm run db:push
npm run db:seed          # lokal/dev saja — jangan di production

# 4. WhatsApp (Evolution API)
cp infra/evolution/.env.example infra/evolution/.env
# Isi AUTHENTICATION_API_KEY = EVOLUTION_API_KEY di .env.local
npm run evolution:up
# Detail: docs/evolution-api-setup.md

# 5. File storage (SeaweedFS)
npm run seaweedfs:up
aws --endpoint-url http://127.0.0.1:8333 s3 mb s3://agentx-files
# Detail: docs/seaweedfs-setup.md

# 6. Sync env untuk worker
cp .env.local .env

# 7. Jalankan app + workers (3 terminal)
npm run dev                 # http://localhost:3001
npm run scheduler:worker
npm run apify:worker
```

Login setelah seed:

| Email | Password | Role |
|-------|----------|------|
| `admin@agentx.local` | `admin12345` | admin |
| `client@agentx.local` | `client12345` | client |

Jangan seed di production.

## Production (PM2)

```bash
nvm use
npm i -g pm2
npm run build
cp .env.local .env

pm2 start npm --name agentx -- start
pm2 start npm --name agentx-scheduler -- run scheduler:worker
pm2 start npm --name agentx-apify -- run apify:worker
pm2 save
pm2 startup
```

Setelah update kode: `npm run build && pm2 restart all`.

## Docs

| Topik | Link |
|-------|------|
| Native AI tools | [docs/adding-ai-tools.md](docs/adding-ai-tools.md) |
| MCP tools | [docs/adding-mcp-tools.md](docs/adding-mcp-tools.md) |
| Todos MCP | [docs/mcp-todos.md](docs/mcp-todos.md) |
| Scheduled jobs | [docs/adding-scheduled-jobs.md](docs/adding-scheduled-jobs.md) |
| Evolution / WhatsApp | [docs/evolution-api-setup.md](docs/evolution-api-setup.md) |
| SeaweedFS | [docs/seaweedfs-setup.md](docs/seaweedfs-setup.md) |

Tool access per role: `lib/ai/roles/tools-by-role.ts`.
