-- Run as postgres superuser on svr-riset-ai:
--   sudo -u postgres psql -v ON_ERROR_STOP=1 -f scripts/provision-agentx-db.sql
-- Replace the password placeholder before running, or set via:
--   sudo -u postgres psql -v dbpass='your-password' -f scripts/provision-agentx-db.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agentx_app') THEN
    EXECUTE format(
      'CREATE ROLE agentx_app WITH LOGIN PASSWORD %L',
      coalesce(current_setting('app.dbpass', true), 'changeme-agentx-app')
    );
  END IF;
END
$$;

SELECT format('CREATE DATABASE agentx OWNER agentx_app')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'agentx')\gexec

GRANT CONNECT ON DATABASE agentx TO agentx_app;

\c agentx

GRANT USAGE, CREATE ON SCHEMA public TO agentx_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agentx_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO agentx_app;
