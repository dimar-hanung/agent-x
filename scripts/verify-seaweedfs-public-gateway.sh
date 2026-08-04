#!/usr/bin/env bash
# Verify SeaweedFS public gateway (DNS + TLS + CORS) for files.agent.serverlab.my.id
# Run after CloudPanel nginx vhost is configured — see docs/seaweedfs-setup.md
set -euo pipefail

PUBLIC_HOST="${SEAWEEDFS_PUBLIC_HOST:-files.agent.serverlab.my.id}"
APP_ORIGIN="${AGENTX_APP_ORIGIN:-https://agent.serverlab.my.id}"
PUBLIC_URL="https://${PUBLIC_HOST}"

echo "==> SeaweedFS public gateway check"
echo "    Host: $PUBLIC_HOST"
echo "    App origin (CORS): $APP_ORIGIN"
echo ""

echo "==> 1. Local S3 gateway (127.0.0.1:8333)"
code_local="$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8333/ || echo 000)"
if [[ "$code_local" == "000" ]]; then
  echo "FAIL: S3 not listening on 127.0.0.1:8333 (start with npm run seaweedfs:up)"
  exit 1
fi
echo "OK: local S3 responds (HTTP $code_local)"

echo ""
echo "==> 2. Public HTTPS ($PUBLIC_URL)"
if ! code_public="$(curl -sf -o /dev/null -w "%{http_code}" --max-time 15 "$PUBLIC_URL/" 2>/dev/null)"; then
  code_public="000"
fi
if [[ "$code_public" == "000" || -z "$code_public" ]]; then
  echo "FAIL: cannot reach $PUBLIC_URL (TLS or nginx vhost missing)"
  echo "     Configure CloudPanel reverse proxy + origin TLS:"
  echo "     infra/seaweedfs/nginx-files.agent.serverlab.my.id.conf.example"
  exit 1
fi
echo "OK: public host responds (HTTP $code_public)"

echo ""
echo "==> 3. CORS preflight (OPTIONS)"
cors_headers="$(curl -sI -X OPTIONS "$PUBLIC_URL/" \
  -H "Origin: $APP_ORIGIN" \
  -H "Access-Control-Request-Method: PUT" 2>/dev/null || true)"
if echo "$cors_headers" | grep -qi "access-control-allow-origin"; then
  echo "OK: CORS headers present"
else
  echo "WARN: Access-Control-Allow-Origin not found — browser uploads may fail"
  echo "$cors_headers" | head -15
fi

echo ""
echo "==> 4. AgentX env"
env_file=".env.local"
if [[ ! -f "$env_file" ]]; then
  env_file=".env"
fi
if grep -q '^SEAWEEDFS_S3_PUBLIC_ENDPOINT=' "$env_file" 2>/dev/null; then
  echo "OK: SEAWEEDFS_S3_PUBLIC_ENDPOINT set in $env_file"
  grep '^SEAWEEDFS_S3_PUBLIC_ENDPOINT=' "$env_file"
else
  echo "WARN: add to $env_file:"
  echo "  SEAWEEDFS_S3_PUBLIC_ENDPOINT=$PUBLIC_URL"
fi

echo ""
echo "Done. After env change: pm2 restart agentx"
