CREATE TABLE "whatsapp_user_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"instance_name" varchar(128) NOT NULL,
	"status" varchar(32) DEFAULT 'disconnected' NOT NULL,
	"phone_e164" varchar(20),
	"connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"remote_jid" varchar(128) NOT NULL,
	"chat_type" varchar(16) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"last_message_at" timestamp with time zone,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"wa_message_id" varchar(128) NOT NULL,
	"sender_jid" varchar(128),
	"sender_name" varchar(255),
	"direction" varchar(16) NOT NULL,
	"text" text NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_chat_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"summary_text" text NOT NULL,
	"highlights" jsonb NOT NULL,
	"covers_from" timestamp with time zone NOT NULL,
	"covers_to" timestamp with time zone NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_user_instances" ADD CONSTRAINT "whatsapp_user_instances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "whatsapp_chats" ADD CONSTRAINT "whatsapp_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_chat_id_whatsapp_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."whatsapp_chats"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "whatsapp_chat_summaries" ADD CONSTRAINT "whatsapp_chat_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "whatsapp_chat_summaries" ADD CONSTRAINT "whatsapp_chat_summaries_chat_id_whatsapp_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."whatsapp_chats"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_user_instances_user_id_idx" ON "whatsapp_user_instances" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_user_instances_instance_name_idx" ON "whatsapp_user_instances" USING btree ("instance_name");
--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_user_instances_phone_e164_idx" ON "whatsapp_user_instances" USING btree ("phone_e164");
--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_chats_user_remote_jid_idx" ON "whatsapp_chats" USING btree ("user_id","remote_jid");
--> statement-breakpoint
CREATE INDEX "whatsapp_chats_user_last_message_at_idx" ON "whatsapp_chats" USING btree ("user_id","last_message_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_messages_user_wa_message_id_idx" ON "whatsapp_messages" USING btree ("user_id","wa_message_id");
--> statement-breakpoint
CREATE INDEX "whatsapp_messages_chat_sent_at_idx" ON "whatsapp_messages" USING btree ("chat_id","sent_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_chat_summaries_chat_id_idx" ON "whatsapp_chat_summaries" USING btree ("chat_id");
--> statement-breakpoint
CREATE INDEX "whatsapp_chat_summaries_user_generated_at_idx" ON "whatsapp_chat_summaries" USING btree ("user_id","generated_at");
