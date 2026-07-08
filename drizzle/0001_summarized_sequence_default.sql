ALTER TABLE "chats" ALTER COLUMN "summarized_up_to_sequence" SET DEFAULT -1;--> statement-breakpoint
UPDATE "chats"
SET "summarized_up_to_sequence" = -1
WHERE "context_summary" IS NULL
  AND "summarized_up_to_sequence" = 0;
