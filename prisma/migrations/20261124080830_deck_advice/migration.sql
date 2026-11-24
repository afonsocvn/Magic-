-- CreateTable
CREATE TABLE "DeckAdvice" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DeckAdvice_deckId_idx" ON "DeckAdvice"("deckId");
