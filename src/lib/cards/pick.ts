import type { Card } from "@prisma/client";
import { normalizeName } from "./normalize";

/**
 * Quando um nome corresponde a várias cartas, preferir: nome completo exato
 * (e não o nome de uma face de outra carta), depois a legal, depois a do bulk.
 * Ex.: "Swords to Plowshares" também é a 2.ª face de "Emeritus of Truce".
 */
type RankCard = Pick<Card, "name" | "commanderLegality" | "source">;

function rank(card: RankCard, query: string): number {
  return (
    (normalizeName(card.name) === query ? 0 : 4) +
    (card.commanderLegality === "legal" ? 0 : 2) +
    (card.source === "bulk" ? 0 : 1)
  );
}

/** A melhor carta para um nome pesquisado (ver `rank`). */
export function pickBestCard<C extends RankCard>(cards: C[], query: string): C | undefined {
  let best: C | undefined;
  for (const card of cards) {
    const r = rank(card, query);
    if (!best || r < rank(best, query) || (r === rank(best, query) && card.name < best.name)) best = card;
  }
  return best;
}

