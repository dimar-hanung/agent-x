# SeaweedFS Setup

AgentX uses [SeaweedFS](https://github.com/seaweedfs/seaweedfs) as private per-user object storage (Drive-like files under **Dashboard → File**). Blobs live in SeaweedFS; folder/file metadata and quota live in PostgreSQL (`user_files`).

This guide covers running SeaweedFS on the **same server** as AgentX via Docker Compose.

## Architecture

```
Browser / AI tools
        │
        ▼
   AgentX (Next.js) ── auth + quota ──► PostgreSQL (user_files)
        │
        │  S3 API (path-style)
        ▼
   SeaweedFS S3 gateway :8333
        │
        ▼
   Filer → Master → Volume
```

| Component | Role | Host port |
|-----------|------|-----------|
| **master** | Cluster coordination | `127.0.0.1:9333` |
| **volume** | Blob storage | `127.0.0.1:18080` (internal 8080) |
| **filer** | Metadata / paths | `127.0.0.1:8888` |
| **s3** | S3-compatible API | `127.0.0.1:8333` |

Per-user quota is **20 GB** (enforced in AgentX, not in SeaweedFS). There are **no public share links** — downloads require a logged-in session.

## Prerequisites

- Docker Engine + Docker Compose v2
- AgentX with schema pushed (`npm run db:push`) after `user_files` exists
- Disk space for volume data

## 1. Configure S3 credentials

Edit [`infra/seaweedfs/s3.json`](../infra/seaweedfs/s3.json) before first start (or regenerate secrets):

```json
{
  "identities": [
    {
      "name": "agentx",
      "credentials": [
        {
          "accessKey": "YOUR_ACCESS_KEY",
          "secretKey": "YOUR_SECRET_KEY"
        }
      ],
      "actions": ["Admin", "Read", "Write", "List", "Tagging"]
    }
  ]
}
```

Generate secrets:

```bash
openssl rand -hex 16   # access key
openssl rand -hex 32   # secret key
```

Restart the `s3` service after changing `s3.json`.

## 2. Start the stack

```bash
npm run seaweedfs:up
# or: bash scripts/setup-seaweedfs.sh
```

Logs:

```bash
npm run seaweedfs:logs
```

Stop:

```bash
npm run seaweedfs:down
```

## 3. Create the bucket (once)

AgentX expects a bucket named `agentx-files` by default. Use path-style addressing:

```bash
# Requires AWS CLI v2
export AWS_ACCESS_KEY_ID=agentx_s3_access
export AWS_SECRET_ACCESS_KEY=agentx_s3_secret_change_me

aws --endpoint-url http://127.0.0.1:8333 s3 mb s3://agentx-files
aws --endpoint-url http://127.0.0.1:8333 s3 ls
```

Without AWS CLI, AgentX will attempt to create the bucket on first use if credentials have `Admin`.

## 4. Wire AgentX env

In `.env.local` (see `.env.example`):

```bash
SEAWEEDFS_S3_ENDPOINT=http://127.0.0.1:8333
SEAWEEDFS_S3_ACCESS_KEY=agentx_s3_access
SEAWEEDFS_S3_SECRET_KEY=agentx_s3_secret_change_me
SEAWEEDFS_S3_BUCKET=agentx-files
SEAWEEDFS_S3_REGION=us-east-1
```

Keys **must match** `infra/seaweedfs/s3.json`. The S3 client uses **force path style** (`http://host:8333/bucket/key`).

If these vars are unset, File APIs and AI tools soft-fail with an Indonesian message that storage is not configured.

### Public browser endpoint (production)

When users access AgentX from remote browsers, presigned upload/download/preview URLs must use a **public HTTPS host**, not `127.0.0.1`. AgentX uses two endpoints:

| Env var | Used for | Example |
|---------|----------|---------|
| `SEAWEEDFS_S3_ENDPOINT` | Server-side Put/Get/Head/Delete, indexing worker | `http://127.0.0.1:8333` |
| `SEAWEEDFS_S3_PUBLIC_ENDPOINT` | Browser presigned PUT/GET only | `https://files.agent.serverlab.my.id` |

SigV4 signatures bind the `Host` header — **never rewrite a signed URL's host after signing**. Set `SEAWEEDFS_S3_PUBLIC_ENDPOINT` to the same hostname nginx presents to browsers.

See [Public gateway (DNS + TLS)](#public-gateway-dns--tls) below for nginx/Cloudflare setup.

## 5. Verify

1. `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8333/` — any non-`000` code means the gateway is listening.
2. Open AgentX → **Dashboard → File**, upload a small file, download it.
3. In chat: ask to list files / upload a note via `list_files` / `upload_file`.

## Object key layout

```
users/{userId}/{fileId}/{sanitizedFileName}
```

Metadata (name, parent folder, size, status) is in PostgreSQL; SeaweedFS only stores bytes.

## Public gateway (DNS + TLS)

Expose SeaweedFS S3 to browsers at `https://files.agent.serverlab.my.id` while keeping the Docker port bound to `127.0.0.1:8333`. Nginx (CloudPanel) terminates origin TLS and reverse-proxies to the local gateway.

### TLS layers

1. **Visitor → Cloudflare** — Cloudflare presents the public certificate (orange-cloud DNS).
2. **Cloudflare → origin nginx** — CloudPanel issues the origin certificate (Let's Encrypt or panel self-signed). Use the same SSL mode as `agent.serverlab.my.id` (Full or Full strict).
3. **nginx → SeaweedFS** — plain HTTP to `127.0.0.1:8333`; SeaweedFS itself does not terminate TLS.

### 1. Cloudflare DNS

Create a proxied record:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A or CNAME | `files.agent` | same origin IP as `agent.serverlab.my.id` | Proxied (orange cloud) |

### 2. CloudPanel / nginx site

Add a site (reverse proxy) for `files.agent.serverlab.my.id` in CloudPanel:

1. CloudPanel → **Sites** → **Add Site** → choose **Reverse Proxy** (or create a PHP/static site and switch to custom nginx).
2. Domain: `files.agent.serverlab.my.id`
3. Reverse proxy target: `http://127.0.0.1:8333`
4. **SSL/TLS** → issue Let's Encrypt (or panel certificate) for `files.agent.serverlab.my.id`
5. **Vhost** → paste/adapt from [`infra/seaweedfs/nginx-files.agent.serverlab.my.id.conf.example`](../infra/seaweedfs/nginx-files.agent.serverlab.my.id.conf.example) — especially `proxy_set_header Host $host`, `client_max_body_size 0`, and CORS for `https://agent.serverlab.my.id`
6. Reload nginx from CloudPanel

Use the reference config in [`infra/seaweedfs/nginx-files.agent.serverlab.my.id.conf.example`](../infra/seaweedfs/nginx-files.agent.serverlab.my.id.conf.example):

- `proxy_pass http://127.0.0.1:8333`
- `proxy_set_header Host $host` (preserve public hostname for SigV4)
- `client_max_body_size 0` and `proxy_request_buffering off` for large uploads
- CORS headers for `https://agent.serverlab.my.id` (browser PUT/GET from the dashboard)

Issue an origin TLS certificate for `files.agent.serverlab.my.id` in CloudPanel before enabling Full (strict) on Cloudflare.

### 3. AgentX env + restart

```bash
SEAWEEDFS_S3_ENDPOINT=http://127.0.0.1:8333
SEAWEEDFS_S3_PUBLIC_ENDPOINT=https://files.agent.serverlab.my.id
# ... access key, secret, bucket, region unchanged
```

Restart AgentX (e.g. `pm2 restart agentx`) after changing env.

### 4. Verify public gateway

```bash
npm run seaweedfs:verify-public
```

Or manually:
# Origin reachable through TLS (403 from S3 without auth is OK)
curl -sI https://files.agent.serverlab.my.id/

# CORS preflight (should include Access-Control-Allow-Origin)
curl -sI -X OPTIONS https://files.agent.serverlab.my.id/ \
  -H "Origin: https://agent.serverlab.my.id" \
  -H "Access-Control-Request-Method: PUT"

# Presigned URL host (logged-in session required)
# GET /api/files/{id}/download-url → url starts with https://files.agent.serverlab.my.id/
```

## Notes

- Bind addresses are localhost-only (`127.0.0.1`) — do not expose `:8333` publicly without TLS and tighter IAM.
- Volume port is mapped to host `18080` to avoid clashing with Evolution API on `8080`/`8081`.
- Practical single-PUT upload size depends on browser/proxy limits; AI tool uploads are capped at 5 MiB.
