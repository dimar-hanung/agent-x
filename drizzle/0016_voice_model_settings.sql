ALTER TABLE "app_settings" ADD COLUMN "voice_input_model_id" varchar(128) DEFAULT 'openai/whisper-large-v3' NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "voice_reply_model_id" varchar(128) DEFAULT 'openai/gpt-4o-mini-tts-2025-12-15' NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "voice_reply_voice" varchar(64) DEFAULT 'nova' NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "voice_reply_percent" integer DEFAULT 35 NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "voice_input_max_seconds" integer DEFAULT 120 NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "voice_input_max_bytes" integer DEFAULT 10485760 NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "voice_reply_max_chars" integer DEFAULT 600 NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "voice_reply_max_words" integer DEFAULT 80 NOT NULL;
