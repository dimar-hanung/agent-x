UPDATE "users" SET "role" = 'pejabat' WHERE "role" = 'student';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'pejabat';
