-- AlterTable
ALTER TABLE "MapTowerPosition" ADD COLUMN "name" TEXT;
ALTER TABLE "MapTowerPosition" ADD COLUMN "stars" INTEGER NOT NULL DEFAULT 5;
UPDATE "MapTowerPosition" SET "stars" = 5 WHERE "stars" IS NULL;

