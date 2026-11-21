import type { Prisma, PrismaClient } from "@prisma/client";
import { lookupNames, type CardData } from "@/lib/scryfall/map";

function toRow(c: CardData) {
  return {
    ...c,
    legalities: c.legalities as Prisma.InputJsonValue,
    imageUris: (c.imageUris ?? undefined) as Prisma.InputJsonValue | undefined,
    faces: (c.faces ?? undefined) as Prisma.InputJsonValue | undefined,
  };
}

/** Grava (insere ou atualiza) cartas e os seus nomes de pesquisa. */
export async function upsertCards(db: PrismaClient, cards: CardData[]): Promise<void> {
  if (!cards.length) return;
  const ids = cards.map((c) => c.id);
  await db.$transaction([
    ...cards.map((c) => {
      const row = toRow(c);
      return db.card.upsert({ where: { id: c.id }, create: row, update: row });
    }),
    db.cardName.deleteMany({ where: { cardId: { in: ids } } }),
    db.cardName.createMany({
      data: cards.flatMap((c) => lookupNames(c).map((name) => ({ name, cardId: c.id }))),
    }),
  ]);
}
