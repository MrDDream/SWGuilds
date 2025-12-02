-- CreateTable
CREATE TABLE "MapTowerPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "towerNumber" INTEGER NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL DEFAULT 6.5,
    "height" REAL NOT NULL DEFAULT 10,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "MapTowerPosition_towerNumber_key" ON "MapTowerPosition"("towerNumber");

