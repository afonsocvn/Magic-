import type { DeckCard } from "@/lib/cards/types";
import { groupDeck, priceCents, type Currency, type DeckLine } from "./groups";

/** O que o browser precisa de cada carta (só dados simples). */
export type ViewFace = {
  name: string;
  manaCost: string | null;
  typeLine: string | null;
  oracleText: string | null;
  image: string | null;
  imageLarge: string | null;
};

export type ViewCard = {
  id: string;
  name: string;
  quantity: number;
  price: number | null;
  priceEur: number | null;
  priceUsd: number | null;
  gameChanger: boolean;
  faces: ViewFace[];
};

export type ViewGroup = { key: string; label: string; count: number; totalCents: number; cards: ViewCard[] };

export function toViewCard(card: DeckCard, quantity: number, currency: Currency): ViewCard {
  const top = card.imageUris;
  const faces: ViewFace[] =
    card.faces && card.faces.length
      ? card.faces.map((f) => ({
          name: f.name,
          manaCost: f.manaCost,
          typeLine: f.typeLine,
          oracleText: f.oracleText,
          // Split/adventure: as faces partilham a imagem do topo.
          image: f.imageUris?.normal ?? top?.normal ?? null,
          imageLarge: f.imageUris?.large ?? f.imageUris?.normal ?? top?.large ?? top?.normal ?? null,
        }))
      : [
          {
            name: card.name,
            manaCost: card.manaCost,
            typeLine: card.typeLine,
            oracleText: card.oracleText,
            image: top?.normal ?? null,
            imageLarge: top?.large ?? top?.normal ?? null,
          },
        ];
  return {
    id: card.id,
    name: card.name,
    quantity,
    price: priceCents(card, currency),
    priceEur: card.priceEurCents,
    priceUsd: card.priceUsdCents,
    gameChanger: card.gameChanger,
    faces,
  };
}

export function toViewGroups(lines: DeckLine<DeckCard>[], currency: Currency): ViewGroup[] {
  return groupDeck(lines, currency).map((g) => ({
    key: g.key,
    label: g.label,
    count: g.count,
    totalCents: g.totalCents,
    cards: g.lines.map((l) => toViewCard(l.card, l.quantity, currency)),
  }));
}
