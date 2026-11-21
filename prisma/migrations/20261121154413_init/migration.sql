-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scryfallId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" TEXT NOT NULL,
    "manaCost" TEXT,
    "cmc" REAL NOT NULL,
    "typeLine" TEXT NOT NULL,
    "oracleText" TEXT,
    "colors" TEXT NOT NULL,
    "colorIdentity" TEXT NOT NULL,
    "producedMana" TEXT NOT NULL,
    "legalities" JSONB NOT NULL,
    "commanderLegality" TEXT NOT NULL,
    "gameChanger" BOOLEAN NOT NULL DEFAULT false,
    "priceEurCents" INTEGER,
    "priceUsdCents" INTEGER,
    "imageUris" JSONB,
    "faces" JSONB,
    "source" TEXT NOT NULL DEFAULT 'bulk',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CardName" (
    "name" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,

    PRIMARY KEY ("name", "cardId"),
    CONSTRAINT "CardName_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "bulkUpdatedAt" DATETIME,
    "cardCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "message" TEXT
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Card_name_idx" ON "Card"("name");

-- CreateIndex
CREATE INDEX "CardName_name_idx" ON "CardName"("name");
