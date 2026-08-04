#!/usr/bin/env bash
# Create CloudPanel reverse-proxy site + Let's Encrypt for files.agent.serverlab.my.id
# Requires root (sudo). Run after SeaweedFS is up on 127.0.0.1:8333.
set -euo pipefail

DOMAIN="${SEAWEEDFS_PUBLIC_HOST:-files.agent.serverlab.my.id}"
UPSTREAM="${SEAWEEDFS_S3_UPSTREAM:-http://127.0.0.1:8333}"
SITE_USER="${SEAWEEDFS_SITE_USER:-agent}"
SITE_PASS="${SEAWEEDFS_SITE_PASSWORD:-}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/setup-seaweedfs-cloudpanel-site.sh"
  exit 1
fi

if [[ -z "$SITE_PASS" ]]; then
  SITE_PASS="$(openssl rand -base64 24)"
  echo "Generated site user password (save if needed for SFTP): $SITE_PASS"
fi

if ! curl -sf -o /dev/null --max-time 5 "$UPSTREAM/" 2>/dev/null; then
  code="$(curl -s -o /dev/null -w "%{http_code}" "$UPSTREAM/" 2>/dev/null || echo 000)"
  if [[ "$code" == "000" ]]; then
    echo "FAIL: SeaweedFS S3 not reachable at $UPSTREAM"
    echo "Start with: npm run seaweedfs:up"
    exit 1
  fi
fi

echo "==> Creating reverse proxy site: $DOMAIN -> $UPSTREAM"
if clpctl site:add:reverse-proxy \
  --domainName="$DOMAIN" \
  --reverseProxyUrl="$UPSTREAM" \
  --siteUser="$SITE_USER" \
  --siteUserPassword="$SITE_PASS" 2>&1; then
  echo "OK: site created"
else
  echo "Site may already exist — continuing with certificate install"
fi

echo "==> Installing Let's Encrypt certificate for $DOMAIN"
clpctl lets-encrypt:install:certificate --domainName="$DOMAIN"

echo "==> Reloading nginx"
nginx -t && systemctl reload nginx

echo ""
echo "Next steps:"
echo "  1. Add CORS to vhost (CloudPanel → Sites → $DOMAIN → Vhost):"
echo "     see infra/seaweedfs/nginx-files.agent.serverlab.my.id.conf.example"
echo "  2. Ensure AgentX .env has:"
echo "     SEAWEEDFS_S3_PUBLIC_ENDPOINT=https://$DOMAIN"
echo "  3. pm2 restart agentx --update-env"
echo "  4. npm run seaweedfs:verify-public"
