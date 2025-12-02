-- Remove preferredTheme column from User table
CREATE TABLE "User_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isApproved" INTEGER NOT NULL DEFAULT 0,
    "lastLogin" DATETIME,
    "avatarUrl" TEXT,
    "preferredLocale" TEXT,
    "lastJsonUpload" DATETIME,
    "canEditAllDefenses" INTEGER NOT NULL DEFAULT 0,
    "canEditMap" INTEGER NOT NULL DEFAULT 0,
    "canEditAssignments" INTEGER NOT NULL DEFAULT 0,
    "canEditNews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "User_new" SELECT "id", "identifier", "name", "password", "role", "isApproved", "lastLogin", "avatarUrl", "preferredLocale", "lastJsonUpload", "canEditAllDefenses", "canEditMap", "canEditAssignments", "canEditNews", "createdAt", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "User_new" RENAME TO "User";
