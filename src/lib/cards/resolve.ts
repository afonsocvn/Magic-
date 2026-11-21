import type { Card, PrismaClient } from "@prisma/client";
import { normalizeName } from "./normalize";
import { upsertCards } from "./store";
import { toDeckCard, type DeckCard } from "./types";
import { fetchCollection } from "@/lib/scryfall/client";
import { isGameCard, lookupNames, mapScryfallCard } from "@/lib/scryfall/map";
import type { CollectionIdentifier } from "@/lib/scryfall/types";
import type { DeckEntry } from "@/lib/deck/types";

export type Resolved = { entry: DeckEntry; card: DeckCard };

/**
 * Quando um nome corresponde a várias cartas, preferir: nome completo exato
 * (e não o nome de uma face de outra carta), depois a legal, depois a do bulk.
 * Ex.: "Swords to Plowshares" também é a 2.ª face de "Emeritus of Truce".
 */
function rank(card: Card, query: string): number {
  return (
    (normalizeName(card.name) === query ? 0 : 4) +
    (card.commanderLegality === "legal" ? 0 : 2) +
    (card.source === "bulk" ? 0 : 1)
  );
}

/** A melhor carta para um nome pesquisado (ver `rank`). */
export function pickBestCard<C extends Card>(cards: C[], query: string): C | undefined {
  let best: C | undefined;
  for (const card of cards) {
    const r = rank(card, query);
    if (!best || r < rank(best, query) || (r === rank(best, query) && card.name < best.name)) best = card;
  }
  return best;
}

async function findByNames(db: PrismaClient, names: string[]): Promise<Map<string, Card>> {
  const rows = await db.cardName.findMany({
    where: { name: { in: [...new Set(names)] } },
    include: { card: true },
  });
  const byName = new Map<string, Card[]>();
  for (const { name, card } of rows) byName.set(name, [...(byName.get(name) ?? []), card]);
  return new Map([...byName].map(([name, cards]) => [name, pickBestCard(cards, name)!]));
}

function identifierFor(e: DeckEntry): CollectionIdentifier {
  return e.set && e.collectorNumber ? { set: e.set, collector_number: e.collectorNumber } : { name: e.name };
}

/**
 * Encontra cada entrada na base de dados. As que faltam são pedidas ao
 * Scryfall (/cards/collection) e guardadas para a próxima vez.
 */
export async function resolveEntries(
  db: PrismaClient,
  entries: DeckEntry[],
  opts: { fetchMissing?: boolean } = {},
): Promise<{ resolved: Resolved[]; notFound: DeckEntry[]; lookupError?: string }> {
  const byName = await findByNames(db, entries.map((e) => normalizeName(e.name)));
  const resolved: Resolved[] = [];
  let missing: DeckEntry[] = [];
  for (const entry of entries) {
    const card = byName.get(normalizeName(entry.name));
    if (card) resolved.push({ entry, card: toDeckCard(card) });
    else missing.push(entry);
  }

  let lookupError: string | undefined;
  if (missing.length && opts.fetchMissing !== false) {
    try {
      const { cards } = await fetchCollection(missing.map(identifierFor));
      const data = cards.filter(isGameCard).map((c) => mapScryfallCard(c, "collection"));
      await upsertCards(db, data);

      const fetched = new Map(cards.filter(isGameCard).map((c) => [c.oracle_id!, c]));
      const stored = new Map(
        (await db.card.findMany({ where: { id: { in: [...fetched.keys()] } } })).map((c) => [c.id, c]),
      );
      const stillMissing: DeckEntry[] = [];
      for (const entry of missing) {
        const n = normalizeName(entry.name);
        const hit = [...fetched.values()].find(
          (c) =>
            (entry.set && entry.collectorNumber && c.set === entry.set && c.collector_number === entry.collectorNumber) ||
            lookupNames(mapScryfallCard(c)).includes(n),
        );
        const card = hit && stored.get(hit.oracle_id!);
        if (card) resolved.push({ entry, card: toDeckCard(card) });
        else stillMissing.push(entry);
      }
      missing = stillMissing;
    } catch (err) {
      lookupError = err instanceof Error ? err.message : String(err);
    }
  }

  resolved.sort((a, b) => a.entry.line - b.entry.line);
  return { resolved, notFound: missing, lookupError };
}
