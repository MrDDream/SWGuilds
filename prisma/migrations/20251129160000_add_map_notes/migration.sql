-- CreateTable
CREATE TABLE "MapNotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notes" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT NOT NULL
);

