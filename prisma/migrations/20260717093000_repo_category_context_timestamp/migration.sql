-- CreateEnum
CREATE TYPE "RepoCategory" AS ENUM ('WORK', 'PERSONAL');

-- AlterTable
ALTER TABLE "repos" ADD COLUMN "category" "RepoCategory" NOT NULL DEFAULT 'WORK';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "last_context_updated_at" TIMESTAMPTZ;

-- Backfill existing context timestamps to the current task update time.
UPDATE "tasks"
SET "last_context_updated_at" = "updated_at"
WHERE "last_context" IS NOT NULL AND btrim("last_context") <> '';

-- CreateIndex
CREATE INDEX "repos_user_id_category_idx" ON "repos"("user_id", "category");

-- CreateIndex
CREATE INDEX "tasks_user_id_last_context_updated_at_idx" ON "tasks"("user_id", "last_context_updated_at");
