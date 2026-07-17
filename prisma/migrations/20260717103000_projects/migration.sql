-- CreateEnum
CREATE TYPE "ProjectCategory" AS ENUM ('WORK', 'PERSONAL');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" "ProjectCategory" NOT NULL DEFAULT 'WORK',
    "color" VARCHAR(7),
    "order" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinned_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- Backfill one default project per user that currently owns repos.
INSERT INTO "projects" (
    "user_id",
    "name",
    "slug",
    "category",
    "created_at",
    "updated_at"
)
SELECT DISTINCT
    "user_id",
    'General',
    'general',
    'WORK'::"ProjectCategory",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "repos"
WHERE "deleted_at" IS NULL
ON CONFLICT DO NOTHING;

-- Add nullable first so existing rows can be backfilled.
ALTER TABLE "repos" ADD COLUMN "project_id" UUID;

UPDATE "repos"
SET "project_id" = "projects"."id"
FROM "projects"
WHERE "repos"."user_id" = "projects"."user_id"
  AND "projects"."slug" = 'general'
  AND "repos"."project_id" IS NULL;

ALTER TABLE "repos" ALTER COLUMN "project_id" SET NOT NULL;

-- Re-scope repo slug uniqueness from user to project.
DROP INDEX IF EXISTS "repos_user_id_slug_key";

-- Remove repo-level category introduced before Project existed.
DROP INDEX IF EXISTS "repos_user_id_category_idx";
ALTER TABLE "repos" DROP COLUMN IF EXISTS "category";
DROP TYPE IF EXISTS "RepoCategory";

-- CreateIndex
CREATE UNIQUE INDEX "projects_user_id_slug_key" ON "projects"("user_id", "slug");
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");
CREATE INDEX "projects_user_id_category_idx" ON "projects"("user_id", "category");
CREATE INDEX "projects_user_id_deleted_at_idx" ON "projects"("user_id", "deleted_at");
CREATE INDEX "projects_user_id_order_idx" ON "projects"("user_id", "order");
CREATE UNIQUE INDEX "repos_project_id_slug_key" ON "repos"("project_id", "slug");
CREATE INDEX "repos_project_id_idx" ON "repos"("project_id");
CREATE INDEX "repos_project_id_order_idx" ON "repos"("project_id", "order");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repos" ADD CONSTRAINT "repos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
