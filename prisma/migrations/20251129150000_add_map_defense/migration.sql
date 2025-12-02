-- CreateTable
CREATE TABLE "MapDefense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "towerNumber" INTEGER NOT NULL,
    "defenseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("defenseId") REFERENCES "Defense"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MapDefense_towerNumber_key" ON "MapDefense"("towerNumber");

