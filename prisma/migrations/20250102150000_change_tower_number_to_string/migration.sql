-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "MapTower_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mapName" TEXT NOT NULL,
    "towerNumber" TEXT NOT NULL,
    "name" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 5,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL DEFAULT 150,
    "height" REAL NOT NULL DEFAULT 100,
    "defenseIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL
);
INSERT INTO "MapTower_new" ("id", "mapName", "towerNumber", "name", "stars", "color", "x", "y", "width", "height", "defenseIds", "createdAt", "updatedAt", "createdBy") SELECT "id", "mapName", CAST("towerNumber" AS TEXT), "name", "stars", "color", "x", "y", "width", "height", "defenseIds", "createdAt", "updatedAt", "createdBy" FROM "MapTower";
DROP TABLE "MapTower";
ALTER TABLE "MapTower_new" RENAME TO "MapTower";
CREATE UNIQUE INDEX "MapTower_mapName_towerNumber_key" ON "MapTower"("mapName", "towerNumber");
CREATE INDEX "MapTower_mapName_idx" ON "MapTower"("mapName");
PRAGMA foreign_keys=ON;

