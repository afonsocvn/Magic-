import type { Card } from "@prisma/client";
import type { CardFaceData, CardImages } from "@/lib/scryfall/map";

/** Carta da BD com os campos JSON já tipados. */
export type DeckCard = Omit<Card, "faces" | "imageUris" | "legalities"> & {
  faces: CardFaceData[] | null;
  imageUris: CardImages | null;
  legalities: Record<string, string>;
};

export function toDeckCard(card: Card): DeckCard {
  return {
    ...card,
    faces: (card.faces as CardFaceData[] | null) ?? null,
    imageUris: (card.imageUris as CardImages | null) ?? null,
    legalities: (card.legalities as Record<string, string>) ?? {},
  };
}
