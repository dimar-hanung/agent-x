ALTER TABLE "whatsapp_messages" ADD COLUMN "source_event_sequence" bigint;
--> statement-breakpoint
CREATE INDEX "whatsapp_messages_chat_event_sequence_idx" ON "whatsapp_messages" USING btree ("chat_id", "source_event_sequence", "sent_at");
--> statement-breakpoint
CREATE TABLE "whatsapp_inbox_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sequence" bigserial NOT NULL,
  "user_id" uuid NOT NULL,
  "instance_name" varchar(128) NOT NULL,
  "wa_message_id" varchar(128) NOT NULL,
  "remote_jid" varchar(128) NOT NULL,
  "chat_type" varchar(16) NOT NULL,
  "sender_jid" varchar(128),
  "sender_name" varchar(255),
  "direction" varchar(16) NOT NULL,
  "message_type" varchar(32) NOT NULL,
  "text" text DEFAULT '' NOT NULL,
  "media_metadata" jsonb,
  "sent_at" timestamp with time zone NOT NULL,
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
ALTER TABLE "whatsapp_inbox_events" ADD CONSTRAINT "whatsapp_inbox_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_inbox_events_user_message_idx" ON "whatsapp_inbox_events" USING btree ("user_id", "wa_message_id");
--> statement-breakpoint
CREATE INDEX "whatsapp_inbox_events_queue_idx" ON "whatsapp_inbox_events" USING btree ("status", "available_at", "sequence");
--> statement-breakpoint
CREATE INDEX "whatsapp_inbox_events_partition_idx" ON "whatsapp_inbox_events" USING btree ("user_id", "remote_jid", "status", "sequence");