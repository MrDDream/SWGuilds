-- Add createdBy and updatedBy to Counter table
ALTER TABLE "Counter" ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Counter" ADD COLUMN "updatedBy" TEXT NOT NULL DEFAULT '';
