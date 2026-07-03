#!/usr/bin/env bash
set -euo pipefail

DB_NAME="agentx"
DB_USER="agentx_app"
DB_PASS="${AGENTX_DB_PASSWORD:-changeme-agentx-app}"

echo "Provisioning PostgreSQL database '${DB_NAME}' for AgentX..."
echo "Using password from AGENTX_DB_PASSWORD or default placeholder."

sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

GRANT CONNECT ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

sudo -u postgres psql -d "${DB_NAME}" -v ON_ERROR_STOP=1 <<EOF
GRANT USAGE, CREATE ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${DB_USER};
EOF

echo "Done. Set DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"
