ALTER TABLE "chats" ADD COLUMN IF NOT EXISTS "source_file_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "chats" ADD CONSTRAINT "chats_source_file_id_user_files_id_fk" FOREIGN KEY ("source_file_id") REFERENCES "public"."user_files"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chats_user_source_file_idx" ON "chats" USING btree ("user_id","source_file_id");
