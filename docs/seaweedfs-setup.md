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

## 5. Verify

1. `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8333/` — any non-`000` code means the gateway is listening.
2. Open AgentX → **Dashboard → File**, upload a small file, download it.
3. In chat: ask to list files / upload a note via `list_files` / `upload_file`.

## Object key layout

```
users/{userId}/{fileId}/{sanitizedFileName}
```

Metadata (name, parent folder, size, status) is in PostgreSQL; SeaweedFS only stores bytes.

## Notes

- Bind addresses are localhost-only (`127.0.0.1`) — do not expose `:8333` publicly without TLS and tighter IAM.
- Volume port is mapped to host `18080` to avoid clashing with Evolution API on `8080`/`8081`.
- Practical single-PUT upload size depends on browser/proxy limits; AI tool uploads are capped at 5 MiB.
