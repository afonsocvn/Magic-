-- AlterTable
ALTER TABLE "Card" ADD COLUMN "tagCategories" TEXT;

-- CreateTable
CREATE TABLE "CardCategory" (
    "cardId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "include" BOOLEAN NOT NULL,
    "note" TEXT,

    PRIMARY KEY ("cardId", "category"),
    CONSTRAINT "CardCategory_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
