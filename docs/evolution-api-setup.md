# Evolution API Setup

AgentX uses [Evolution API](https://github.com/EvolutionAPI/evolution-api) as the **unofficial** WhatsApp provider. Evolution runs as a **self-hosted service** (Docker) — it is not a SaaS you sign up for.

This guide covers:

- Running Evolution on the **same server** as AgentX
- Running Evolution on a **separate server** (recommended for production)
- Wiring webhooks and env vars on the AgentX side

## Architecture

```
User phone ──► WhatsApp channel number ──► Evolution API
                                              │
                    webhook (inbound)         │ sendText (outbound)
                                              ▼
                                         AgentX (Next.js)
                                              │
                                              ▼
                                    Per-user Kanal utama (PostgreSQL)
```

| Component | Role |
|-----------|------|
| **Evolution API** | Holds the single global WhatsApp session (admin scans QR once) |
| **AgentX webhook** | `POST /api/integrations/whatsapp/webhook` — receives inbound messages |
| **Phone pairing** | Users register their phone in Settings; AgentX routes by `users.whatsapp_phone_e164` |

Only **admin** scans QR. Other users register their phone number in **Settings → Integrations**.

## Prerequisites

### Evolution server

- Linux VPS or VM (Ubuntu 22.04+ recommended)
- Docker Engine + Docker Compose v2
- Outbound internet (WhatsApp Web protocol)
- Ports open as needed (see [Network](#network--firewall))

### AgentX server

- AgentX already running with schema pushed (`npm run db:push`)
- `.env.local` with `WHATSAPP_PROVIDER=unofficial`

## Generate secrets

Run on any machine:

```bash
# Evolution API key (shared with AgentX EVOLUTION_API_KEY)
openssl rand -hex 32

# Webhook secret (shared with AgentX WHATSAPP_WEBHOOK_SECRET)
openssl rand -hex 16
```

Use **different** values for each. Never commit them to git.

---

## Option A — Evolution on the same server as AgentX

Use the stack in `infra/evolution/` (image: `evoapicloud/evolution-api` on Docker Hub).

### 1. Install Docker

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2
sudo usermod -aG docker "$USER"
newgrp docker   # or log out and back in
```

### 2. Configure Evolution

```bash
cd /path/to/fullstack-agent/infra/evolution
cp .env.example .env
```

Edit `.env`:

| Variable | Example | Notes |
|----------|---------|-------|
| `AUTHENTICATION_API_KEY` | `(openssl rand -hex 32)` | You create this — not from a website |
| `SERVER_URL` | `http://203.0.113.10:8080` | Public IP or domain of this server |
| `POSTGRES_PASSWORD` | strong password | Change from example |
| `WEBHOOK_GLOBAL_URL` | `http://host.docker.internal:3000/api/integrations/whatsapp/webhook` | Same-server Docker — do **not** use public IP (hairpin NAT timeout) |

`docker-compose.yml` binds Evolution to `127.0.0.1:8080` by default. AgentX on the same host uses `EVOLUTION_API_URL=http://127.0.0.1:8080`.

If you need Evolution reachable from outside (debugging, remote AgentX), change the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "8080:8080"   # instead of 127.0.0.1:8080:8080
```

### 3. Start Evolution

From the AgentX repo root:

```bash
npm run evolution:up
# or: ./scripts/setup-evolution.sh
```

Check logs:

```bash
npm run evolution:logs
```

Health check:

```bash
source infra/evolution/.env
curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $AUTHENTICATION_API_KEY" \
  http://127.0.0.1:8080/
```

### 4. Configure AgentX `.env.local`

```bash
WHATSAPP_PROVIDER=unofficial
EVOLUTION_API_URL=http://127.0.0.1:8080
EVOLUTION_API_KEY=<same as AUTHENTICATION_API_KEY in infra/evolution/.env>
EVOLUTION_INSTANCE_NAME=agentx-channel
WHATSAPP_WEBHOOK_SECRET=<your webhook secret>
AGENTX_PUBLIC_URL=http://<server-public-ip>:3000
```

Restart AgentX after changing env (`npm run dev` or your process manager).

### 5. Connect WhatsApp (admin)

1. Sign in as **admin**
2. Open **Dashboard → Channel WhatsApp** (`/dashboard/whatsapp-channel`)
3. Click **Hubungkan channel** → scan QR with the phone that will be the **global channel number**
4. Users can then register phones under **Settings → Integrations**

---

## Option B — Evolution on a separate server

Use this when AgentX and Evolution run on different machines (common in production).

### Topology

```
┌─────────────────────┐         ┌─────────────────────┐
│  AgentX server      │         │  Evolution server   │
│  :3000 (Next.js)    │◄────────│  :8080 (Docker)     │
│                     │ webhook │                     │
│  EVOLUTION_API_URL ─┼────────►│  WHATSAPP session  │
└─────────────────────┘  HTTP   └─────────────────────┘
```

### 1. Copy stack to Evolution server

Copy the `infra/evolution/` folder to the remote server (or clone the AgentX repo there):

```bash
scp -r infra/evolution user@evolution-host:/opt/agentx-evolution/
```

On the Evolution server:

```bash
cd /opt/agentx-evolution
cp .env.example .env
```

### 2. Edit `infra/evolution/.env` on Evolution server

| Variable | Value |
|----------|-------|
| `AUTHENTICATION_API_KEY` | Your generated key |
| `SERVER_URL` | `http://EVOLUTION_PUBLIC_IP:8080` or `https://evolution.example.com` |
| `WEBHOOK_GLOBAL_URL` | `https://agentx.example.com/api/integrations/whatsapp/webhook` |
| `POSTGRES_PASSWORD` | Strong password |

Expose port **8080** (or put Evolution behind nginx/Caddy with TLS).

```bash
docker compose up -d
docker compose logs -f evolution-api
```

### 3. Configure AgentX `.env.local` (AgentX server)

```bash
WHATSAPP_PROVIDER=unofficial
EVOLUTION_API_URL=http://EVOLUTION_PUBLIC_IP:8080
# or https://evolution.example.com if TLS terminates at proxy
EVOLUTION_API_KEY=<same AUTHENTICATION_API_KEY as Evolution server>
EVOLUTION_INSTANCE_NAME=agentx-channel
WHATSAPP_WEBHOOK_SECRET=<shared secret>
AGENTX_PUBLIC_URL=https://agentx.example.com
```

`EVOLUTION_API_URL` is where **AgentX calls** Evolution (outbound API).  
`AGENTX_PUBLIC_URL` is where **Evolution calls back** AgentX (webhook). Both must be reachable over the network.

### 4. Webhook reachability

From the **Evolution server**, verify AgentX webhook is reachable:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://agentx.example.com/api/integrations/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_WHATSAPP_WEBHOOK_SECRET" \
  -d '{"event":"test"}'
```

A `401` without the secret or `200`/`ok` with valid setup is expected; connection refused means firewall or wrong URL.

Evolution also sets per-instance webhooks when AgentX creates the instance (`lib/integrations/whatsapp/providers/unofficial-evolution.ts`), using `AGENTX_PUBLIC_URL` and `WHATSAPP_WEBHOOK_SECRET`.

---

## Network & firewall

| Direction | From | To | Port | Purpose |
|-----------|------|-----|------|---------|
| AgentX → Evolution | AgentX server | Evolution server | 8080 | API calls (QR, sendText) |
| Evolution → AgentX | Evolution server | AgentX server | 3000 (or 443) | Webhook inbound messages |
| Users → WhatsApp | Internet | Meta | — | Normal WhatsApp (no open port on your side) |

If Evolution uses Docker on the **same host** as AgentX, set `WEBHOOK_GLOBAL_URL` and `AGENTX_WEBHOOK_URL` to `http://host.docker.internal:3000/api/integrations/whatsapp/webhook`. Do not use the server's public IP — Docker cannot reach it (curl timeout / exit 28).

---

## Environment reference

### AgentX (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `WHATSAPP_PROVIDER` | Yes | `unofficial` (Evolution) or `official` (stub) |
| `EVOLUTION_API_URL` | Yes | Base URL of Evolution API (no trailing slash) |
| `EVOLUTION_API_KEY` | Yes | Same as Evolution `AUTHENTICATION_API_KEY` |
| `EVOLUTION_INSTANCE_NAME` | Yes | Instance name, default `agentx-channel` |
| `WHATSAPP_WEBHOOK_SECRET` | Recommended | Validates `x-webhook-secret` on webhook |
| `AGENTX_PUBLIC_URL` | Yes | Public base URL of AgentX (for webhook registration) |

### Evolution (`infra/evolution/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTHENTICATION_TYPE` | Yes | `apikey` |
| `AUTHENTICATION_API_KEY` | Yes | Global API key — **you generate this** |
| `SERVER_URL` | Yes | Public URL of Evolution (for WhatsApp session) |
| `WEBHOOK_GLOBAL_URL` | Yes | Full URL to AgentX webhook endpoint |
| `DATABASE_*` / `CACHE_*` | Yes | See `.env.example` |

---

## npm scripts

| Script | Action |
|--------|--------|
| `npm run evolution:up` | Pull images and start `infra/evolution` stack |
| `npm run evolution:down` | Stop stack |
| `npm run evolution:logs` | Follow Evolution API logs |

---

## User flow after setup

1. **Admin** — `/dashboard/whatsapp-channel` → connect → scan QR
2. **User** — `/settings/integrations` → enter phone → **Simpan**
3. User sends WhatsApp message **to the channel number** from that phone
4. Message appears in their **Kanal utama**; AI reply is mirrored back to WhatsApp

---

## Troubleshooting

### `Evolution API belum dikonfigurasi`

AgentX missing `EVOLUTION_API_URL` or `EVOLUTION_API_KEY` in `.env.local`. Restart the app after editing.

### `pull access denied for atendai/evolution-api`

The old image `atendai/evolution-api` is deprecated. Use `evoapicloud/evolution-api` (already set in `infra/evolution/docker-compose.yml`). Run `npm run evolution:up` again.

### QR tidak muncul / Hubungkan channel gagal

- Evolution not running: `docker compose -f infra/evolution/docker-compose.yml ps`
- Wrong API key: keys must match on both sides
- Check logs: `npm run evolution:logs`

### Pesan masuk tidak sampai ke AgentX

- `WEBHOOK_GLOBAL_URL` / `AGENTX_PUBLIC_URL` wrong or blocked by firewall
- `WHATSAPP_WEBHOOK_SECRET` mismatch
- Channel not `connected` — re-check admin dashboard
- User phone not registered in Settings

### `Nomor belum terdaftar` di WhatsApp

User must save their phone in **Settings → Integrations** before messaging the channel number.

### Evolution container cannot reach AgentX on localhost

Do not use `http://127.0.0.1:3000` or the server's **public IP** in `WEBHOOK_GLOBAL_URL` from inside Docker. Use `http://host.docker.internal:3000/...` on the same machine, or the AgentX LAN/public URL only when Evolution runs on a **different** server.

---

## Security notes

- Evolution API is **unofficial** — not Meta-approved; risk of number ban if abused
- Restrict Evolution port 8080 to AgentX server IP (firewall / private network)
- Rotate `AUTHENTICATION_API_KEY` and `WHATSAPP_WEBHOOK_SECRET` if leaked
- `infra/evolution/.env` is gitignored — never commit real keys
- For production at scale, plan migration to official WhatsApp Cloud API (`WHATSAPP_PROVIDER=official`)

---

## Related files

| Path | Purpose |
|------|---------|
| `infra/evolution/docker-compose.yml` | Postgres + Redis + Evolution API |
| `infra/evolution/.env.example` | Template for Evolution server env |
| `scripts/setup-evolution.sh` | Start script |
| `lib/integrations/whatsapp/` | Provider abstraction |
| `app/api/integrations/whatsapp/webhook/route.ts` | Inbound webhook |
| `app/dashboard/whatsapp-channel/` | Admin QR UI |
