ALTER TABLE "app_settings" ADD COLUMN IF NOT EXISTS "web_search_provider" varchar(32) DEFAULT 'exa' NOT NULL;
