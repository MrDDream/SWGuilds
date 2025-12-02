-- CreateTable
CREATE TABLE "UserMonster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "monsterName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserMonster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMonster_userId_monsterName_key" ON "UserMonster"("userId", "monsterName");

-- CreateIndex
CREATE INDEX "UserMonster_userId_idx" ON "UserMonster"("userId");

