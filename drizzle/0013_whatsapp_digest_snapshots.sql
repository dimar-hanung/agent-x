CREATE TABLE "whatsapp_digest_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"digest_text" text NOT NULL,
	"chat_count" integer DEFAULT 0 NOT NULL,
	"chunk_count" integer DEFAULT 1 NOT NULL,
	"covers_from" timestamp with time zone NOT NULL,
	"covers_to" timestamp with time zone NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_digest_snapshots" ADD CONSTRAINT "whatsapp_digest_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "whatsapp_digest_snapshots_user_generated_at_idx" ON "whatsapp_digest_snapshots" USING btree ("user_id","generated_at");
