-- Supprimer toutes les tours et défenses existantes
DELETE FROM MapDefense;
DELETE FROM MapTowerPosition;

-- AlterTable pour MapTowerPosition
PRAGMA foreign_keys=OFF;
CREATE TABLE "MapTowerPosition_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "towerNumber" INTEGER NOT NULL,
    "mapType" TEXT NOT NULL DEFAULT 'siege',
    "name" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 5,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL DEFAULT 8,
    "height" REAL NOT NULL DEFAULT 10,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "MapTowerPosition_new" ("id", "towerNumber", "name", "stars", "x", "y", "width", "height", "color", "updatedAt") 
SELECT "id", "towerNumber", "name", "stars", "x", "y", "width", "height", "color", "updatedAt" FROM "MapTowerPosition";
DROP TABLE "MapTowerPosition";
ALTER TABLE "MapTowerPosition_new" RENAME TO "MapTowerPosition";
CREATE UNIQUE INDEX "MapTowerPosition_towerNumber_mapType_key" ON "MapTowerPosition"("towerNumber", "mapType");
DROP INDEX IF EXISTS "MapTowerPosition_towerNumber_key";
PRAGMA foreign_keys=ON;

-- AlterTable pour MapDefense
PRAGMA foreign_keys=OFF;
CREATE TABLE "MapDefense_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "towerNumber" INTEGER NOT NULL,
    "slotIndex" INTEGER NOT NULL DEFAULT 0,
    "mapType" TEXT NOT NULL DEFAULT 'siege',
    "defenseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapDefense_defenseId_fkey" FOREIGN KEY ("defenseId") REFERENCES "Defense" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "MapDefense_new" ("id", "towerNumber", "slotIndex", "defenseId", "createdAt", "updatedAt") 
SELECT "id", "towerNumber", "slotIndex", "defenseId", "createdAt", "updatedAt" FROM "MapDefense";
DROP TABLE "MapDefense";
ALTER TABLE "MapDefense_new" RENAME TO "MapDefense";
CREATE UNIQUE INDEX "MapDefense_towerNumber_slotIndex_mapType_key" ON "MapDefense"("towerNumber", "slotIndex", "mapType");
DROP INDEX IF EXISTS "MapDefense_towerNumber_slotIndex_key";
PRAGMA foreign_keys=ON;

