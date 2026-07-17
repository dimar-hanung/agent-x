CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_file_indexes" (
	"file_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"preview_markdown" text,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"embedding_model" varchar(128),
	"indexed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_file_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"raw_text" text,
	"headings" jsonb,
	"page_numbers" jsonb,
	"embedding" vector(3072) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_file_indexes" ADD CONSTRAINT "user_file_indexes_file_id_user_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."user_files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_file_indexes" ADD CONSTRAINT "user_file_indexes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_file_chunks" ADD CONSTRAINT "user_file_chunks_file_id_user_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."user_files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_file_chunks" ADD CONSTRAINT "user_file_chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_file_indexes_user_status_idx" ON "user_file_indexes" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_file_indexes_status_created_idx" ON "user_file_indexes" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_file_chunks_user_file_idx" ON "user_file_chunks" USING btree ("user_id","file_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_file_chunks_file_chunk_idx" ON "user_file_chunks" USING btree ("file_id","chunk_index");
