CREATE TABLE "whatsapp_bot_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sequence" bigserial NOT NULL,
  "user_id" uuid NOT NULL,
  "wa_message_id" varchar(128) NOT NULL,
  "text" text DEFAULT '' NOT NULL,
  "attachments" jsonb,
  "input_mode" varchar(16) DEFAULT 'text' NOT NULL,
  "status" varchar(32) DEFAULT 'queued' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "locked_at" timestamp with time zone,
  "processed_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_bot_jobs" ADD CONSTRAINT "whatsapp_bot_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_bot_jobs_user_message_idx" ON "whatsapp_bot_jobs" USING btree ("user_id", "wa_message_id");
--> statement-breakpoint
CREATE INDEX "whatsapp_bot_jobs_queue_idx" ON "whatsapp_bot_jobs" USING btree ("status", "available_at", "sequence");
--> statement-breakpoint
CREATE INDEX "whatsapp_bot_jobs_partition_idx" ON "whatsapp_bot_jobs" USING btree ("user_id", "status", "sequence");
