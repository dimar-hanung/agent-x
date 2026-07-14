#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SW_DIR="$ROOT/infra/seaweedfs"

echo "==> AgentX SeaweedFS setup"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Install with:"
  echo "  sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2"
  echo "  sudo usermod -aG docker \"$USER\" && newgrp docker"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon not running or permission denied."
  echo "Try: sudo systemctl start docker"
  echo "Or add user to docker group: sudo usermod -aG docker \"$USER\""
  exit 1
fi

cd "$SW_DIR"

if [[ ! -f s3.json ]]; then
  echo "Missing $SW_DIR/s3.json"
  echo "See docs/seaweedfs-setup.md"
  exit 1
fi

echo "==> Pulling images..."
docker compose pull

echo "==> Starting SeaweedFS stack (master + volume + filer + S3)..."
docker compose up -d

echo "==> Waiting for S3 gateway on :8333..."
for i in $(seq 1 45); do
  if curl -sf -o /dev/null http://127.0.0.1:8333/ 2>/dev/null || \
     curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:8333/ 2>/dev/null | grep -qE '^[0-9]+$'; then
    # Any HTTP response from the gateway means it is listening
    code="$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8333/ || true)"
    if [[ -n "$code" && "$code" != "000" ]]; then
      echo "SeaweedFS S3 gateway is up on :8333 (HTTP $code)."
      echo ""
      echo "Next steps:"
      echo "  1. Create bucket (once): see docs/seaweedfs-setup.md"
      echo "  2. Set SEAWEEDFS_S3_* in AgentX .env.local (keys must match s3.json)"
      exit 0
    fi
  fi
  sleep 2
done

echo "Stack started, but :8333 not ready yet. Check logs:"
echo "  cd infra/seaweedfs && docker compose logs -f"
exit 1
