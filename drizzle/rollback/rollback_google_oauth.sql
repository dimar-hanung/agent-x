-- Rollback Google OAuth: data first, then DDL.
-- Run AFTER git revert / redeploy of pre-Google app code.
-- Does not touch provider = 'gmail' rows.
--
-- Revert order:
-- 1. git revert the Google OAuth PR / restore pre-Google code
-- 2. Redeploy the reverted app
-- 3. Run this script against the target database
-- 4. Align Drizzle journal if needed:
--      DELETE FROM "__drizzle_migrations" WHERE hash IN (
--        -- hash of 0005_google_oauth migration as recorded in your DB
--      );
--    Or remove the 0005_google_oauth entry from drizzle/meta/_journal.json
--    when restoring code that does not include that migration.
-- 5. Optionally remove GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI
-- 6. Users with provider='gmail' rows work immediately; others reconnect via app password

BEGIN;

DELETE FROM user_integrations
WHERE provider = 'google';

ALTER TABLE "user_integrations" DROP COLUMN IF EXISTS "token_expires_at";
ALTER TABLE "user_integrations" DROP COLUMN IF EXISTS "scopes";

COMMIT;

-- Verification (run separately):
-- SELECT provider, count(*) FROM user_integrations GROUP BY provider;
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'user_integrations' ORDER BY column_name;
