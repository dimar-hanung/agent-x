ALTER TABLE "user_integrations" ADD COLUMN "scopes" text;
ALTER TABLE "user_integrations" ADD COLUMN "token_expires_at" timestamp with time zone;
