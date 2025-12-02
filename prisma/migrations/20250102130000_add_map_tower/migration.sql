-- CreateTable
CREATE TABLE "MapTower" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mapName" TEXT NOT NULL,
    "towerNumber" INTEGER NOT NULL,
    "name" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 5,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL DEFAULT 150,
    "height" REAL NOT NULL DEFAULT 100,
    "defenseIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MapTower_mapName_towerNumber_key" ON "MapTower"("mapName", "towerNumber");

-- CreateIndex
CREATE INDEX "MapTower_mapName_idx" ON "MapTower"("mapName");

