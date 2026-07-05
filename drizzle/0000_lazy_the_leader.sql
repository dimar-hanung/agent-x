CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(16) DEFAULT 'conversation' NOT NULL,
	"title" varchar(255) DEFAULT 'New chat' NOT NULL,
	"context_summary" text,
	"summarized_up_to_sequence" integer DEFAULT 0 NOT NULL,
	"summary_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" varchar(32) NOT NULL,
	"parts" jsonb NOT NULL,
	"metadata" jsonb,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_id" uuid,
	"title" varchar(255) NOT NULL,
	"prompt" text NOT NULL,
	"schedule_kind" varchar(16) NOT NULL,
	"cron_expression" varchar(128),
	"timezone" varchar(64) DEFAULT 'Asia/Jakarta' NOT NULL,
	"run_at" timestamp with time zone,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"run_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"email" varchar(255) NOT NULL,
	"credentials_encrypted" text NOT NULL,
	"status" varchar(32) DEFAULT 'connected' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"role" varchar(32) DEFAULT 'student' NOT NULL,
	"whatsapp_phone_e164" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_channel_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_phone_e164" varchar(20),
	"status" varchar(32) DEFAULT 'disconnected' NOT NULL,
	"instance_name" varchar(128) NOT NULL,
	"connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chats_user_id_updated_at_idx" ON "chats" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chats_user_channel_idx" ON "chats" USING btree ("user_id") WHERE "chats"."kind" = 'channel';--> statement-breakpoint
CREATE INDEX "messages_chat_id_sequence_idx" ON "messages" USING btree ("chat_id","sequence");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_user_id_status_idx" ON "scheduled_jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "scheduled_jobs_status_updated_at_idx" ON "scheduled_jobs" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "user_integrations_user_provider_idx" ON "user_integrations" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "users_whatsapp_phone_e164_idx" ON "users" USING btree ("whatsapp_phone_e164");