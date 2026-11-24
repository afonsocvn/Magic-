import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { resolveEntries } from "@/lib/cards/resolve";
import type { CardSource } from "./load";
import { canonicalDeckText } from "./parser";

/** Id do deck = hash do texto normalizado (só no servidor). */
export function deckId(text: string): string {
  return createHash("sha256").update(canonicalDeckText(text)).digest("hex").slice(0, 16);
}

/** Cartas da base de dados (e do Scryfall, para as que faltarem). */
export function prismaSource(db: PrismaClient): CardSource {
  return {
    resolve: (entries) => resolveEntries(db, entries),
    overrides: (ids) => db.cardCategory.findMany({ where: { cardId: { in: ids } } }),
  };
}
