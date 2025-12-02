-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "MapDefense_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "towerNumber" INTEGER NOT NULL,
    "slotIndex" INTEGER NOT NULL DEFAULT 0,
    "defenseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapDefense_defenseId_fkey" FOREIGN KEY ("defenseId") REFERENCES "Defense" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "MapDefense_new" ("id", "towerNumber", "defenseId", "createdAt", "updatedAt") SELECT "id", "towerNumber", "defenseId", "createdAt", "updatedAt" FROM "MapDefense";
DROP TABLE "MapDefense";
ALTER TABLE "MapDefense_new" RENAME TO "MapDefense";
CREATE UNIQUE INDEX "MapDefense_towerNumber_slotIndex_key" ON "MapDefense"("towerNumber", "slotIndex");
PRAGMA foreign_keys=ON;

