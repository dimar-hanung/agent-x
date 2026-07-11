ALTER TABLE "todos" ADD COLUMN "project" varchar(128);--> statement-breakpoint
CREATE INDEX "todos_user_id_project_idx" ON "todos" USING btree ("user_id","project");