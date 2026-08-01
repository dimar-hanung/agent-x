CREATE TABLE IF NOT EXISTS "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text_model_id" varchar(128) NOT NULL,
	"vision_model_id" varchar(128) DEFAULT 'disabled' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
