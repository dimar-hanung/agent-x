UPDATE "users" SET "role" = 'client' WHERE "role" = 'pejabat';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'client';
