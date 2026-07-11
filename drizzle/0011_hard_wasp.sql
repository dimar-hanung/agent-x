CREATE TABLE "apify_social_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_id" uuid,
	"platform" varchar(32) NOT NULL,
	"actor_id" varchar(128) NOT NULL,
	"query_hash" varchar(64) NOT NULL,
	"normalized_input" jsonb NOT NULL,
	"actor_input" jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'queued' NOT NULL,
	"apify_run_id" varchar(128),
	"apify_dataset_id" varchar(128),
	"items" jsonb,
	"item_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apify_social_snapshots" ADD CONSTRAINT "apify_social_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apify_social_snapshots" ADD CONSTRAINT "apify_social_snapshots_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apify_social_snapshots_user_hash_idx" ON "apify_social_snapshots" USING btree ("user_id","platform","query_hash");--> statement-breakpoint
CREATE INDEX "apify_social_snapshots_status_updated_at_idx" ON "apify_social_snapshots" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "apify_social_snapshots_user_status_idx" ON "apify_social_snapshots" USING btree ("user_id","status");