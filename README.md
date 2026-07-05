# AgentX

AgentX — intelligent agent platform built with:

- **Next.js** - React framework with App Router
- **TailwindCSS** - Utility-first CSS framework
- **Dashboard** - Pre-built dashboard layout with sidebar navigation
- **Login Page** - Authentication-ready login interface
- **Dark Mode** - Built-in theme switching support

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Prerequisites

- **Node.js 24.x** (Active LTS) — use `nvm use` to read the version from `.nvmrc`
- npm, pnpm, yarn, or bun

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
| `INTEGRATIONS_ENCRYPTION_KEY` | 32-byte key (hex or base64) for encrypting Gmail app passwords at rest. Generate with `openssl rand -hex 32` |
| `EXA_API_KEY` | Exa API key for web search tools (`student`/`admin` roles). Get one at [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys) |

## Database setup

PostgreSQL 16 on the local research server (`127.0.0.1:5432`):

```bash
# 1. Create database + role (password must match DATABASE_URL in .env.local)
AGENTX_DB_PASSWORD=YOUR_PASSWORD npm run db:provision

# 2. Push schema and seed demo users
npm run db:push
npm run db:seed
```

## Demo login

After `npm run db:seed`, sign in at [http://localhost:3000/login](http://localhost:3000/login):

| Email | Password |
|-------|----------|
| `admin@agentx.local` | `admin12345` |
| `student@agentx.local` | `student12345` |

Chat is at [http://localhost:3000/chat](http://localhost:3000/chat) (requires login).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## AI Tools

AgentX uses [Vercel AI SDK v7](https://sdk.vercel.ai) with `ToolLoopAgent`, role-gated tools, and PostgreSQL-backed chat history.

- **Chat**: [http://localhost:3000/chat](http://localhost:3000/chat) (authenticated)
- **Add a native tool**: [docs/adding-ai-tools.md](docs/adding-ai-tools.md)
- **Add an MCP tool**: [docs/adding-mcp-tools.md](docs/adding-mcp-tools.md)
- **Scheduled jobs**: [docs/adding-scheduled-jobs.md](docs/adding-scheduled-jobs.md)
- **User roles**: stored in PostgreSQL (`admin`, `student`, `guest`); tool access is configured in `lib/ai/roles/tools-by-role.ts`

### Scheduled jobs

Users with role `student` or `admin` can create recurring or one-time AI jobs via chat. A background worker executes them with `node-schedule` and saves results to the user's **Kanal utama** (main channel).

Run the app and scheduler worker in **separate terminals**:

```bash
npm run dev
npm run scheduler:worker
```

Optional env: `SCHEDULER_POLL_INTERVAL_MS` (default `15000`) — how often the worker syncs jobs from PostgreSQL.

Chat examples (sign in at [http://localhost:3000/chat](http://localhost:3000/chat)):

```
Ingatkan saya setiap pagi jam 9 untuk merangkum inbox
Besok jam 15:00 kirim pengingat untuk review PR
Tampilkan jadwal aktif saya
```

Active schedules appear under **Jadwal aktif** in the chat sidebar. See [docs/adding-scheduled-jobs.md](docs/adding-scheduled-jobs.md) for architecture and tool details.

### Main channel & WhatsApp

Each user has one pinned **Kanal utama** at `/chat` (cron output and default chat land here). WhatsApp uses a **single global channel number**:

1. **Admin** — open [Dashboard → Channel WhatsApp](http://localhost:3000/dashboard/whatsapp-channel), scan QR (Evolution API).
2. **Users** — open [Settings → Integrations](http://localhost:3000/settings/integrations), register their phone number, then message the global channel number from that phone.

**Full setup guide (same server or remote Evolution):** [docs/evolution-api-setup.md](docs/evolution-api-setup.md)

Quick start on this machine:

```bash
cp infra/evolution/.env.example infra/evolution/.env   # edit keys & URLs
npm run evolution:up
```

AgentX env: see `.env.example` (`EVOLUTION_*`, `WHATSAPP_WEBHOOK_SECRET`, `AGENTX_PUBLIC_URL`).

### Web search (Exa)

With `EXA_API_KEY` set, sign in as `student@agentx.local` and try:

```
Cari berita AI terbaru
```

The agent uses native `exa_web_search` and `exa_web_fetch` tools via the Exa REST API.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
