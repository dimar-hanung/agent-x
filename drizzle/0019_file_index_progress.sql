ALTER TABLE "user_file_indexes" ADD COLUMN IF NOT EXISTS "progress_phase" varchar(32);
--> statement-breakpoint
ALTER TABLE "user_file_indexes" ADD COLUMN IF NOT EXISTS "progress_current" integer;
--> statement-breakpoint
ALTER TABLE "user_file_indexes" ADD COLUMN IF NOT EXISTS "progress_total" integer;
