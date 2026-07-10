#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVO_DIR="$ROOT/infra/evolution"

echo "==> AgentX Evolution API setup"

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

cd "$EVO_DIR"

if [[ ! -f .env ]]; then
  echo "Missing $EVO_DIR/.env"
  echo "Copy infra/evolution/.env.example to infra/evolution/.env and edit it."
  echo "See docs/evolution-api-setup.md"
  exit 1
fi

echo "==> Pulling images..."
docker compose pull

echo "==> Starting Evolution API stack..."
docker compose up -d

echo "==> Waiting for Evolution API on :8081..."
for i in $(seq 1 30); do
  if curl -sf -o /dev/null -H "apikey: $(grep '^AUTHENTICATION_API_KEY=' .env | cut -d= -f2-)" http://127.0.0.1:8081/ 2>/dev/null; then
    echo "Evolution API is up on :8081."
    exit 0
  fi
  sleep 2
done

echo "Stack started, but :8081 not ready yet. Check logs:"
echo "  cd infra/evolution && docker compose logs -f evolution-api"
exit 1
