ALTER TABLE "todos" ADD COLUMN "code" varchar(32);--> statement-breakpoint
UPDATE "todos" AS t
SET "code" = 'TODO-' || s.rn::text
FROM (
  SELECT
    id,
    row_number() OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS rn
  FROM "todos"
) AS s
WHERE t.id = s.id AND t.code IS NULL;--> statement-breakpoint
ALTER TABLE "todos" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "todos_user_id_code_idx" ON "todos" USING btree ("user_id","code");
