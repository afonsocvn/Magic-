import { pickBestCard } from "@/lib/cards/pick";
import { normalizeName } from "@/lib/cards/normalize";
import type { DeckCard } from "@/lib/cards/types";
import type { CardSource } from "@/lib/deck/load";
import { unpackCard, type PackedCard, type StaticMeta } from "./format";

type StaticCard = DeckCard & { overrides: { category: string; include: boolean }[] };

export type CardDb = { cards: StaticCard[]; byName: Map<string, number[]>; meta: StaticMeta };

let cached: Promise<CardDb> | null = null;

/** Descarrega as cartas uma vez (o browser guarda o ficheiro em cache). */
export function loadCardDb(base = "data"): Promise<CardDb> {
  cached ??= (async () => {
    const [packed, meta] = await Promise.all([
      fetch(`${base}/cards.json`).then((r) => {
        if (!r.ok) throw new Error(`Não foi possível carregar as cartas (${r.status}).`);
        return r.json() as Promise<PackedCard[]>;
      }),
      fetch(`${base}/meta.json`).then((r) => r.json() as Promise<StaticMeta>),
    ]);
    return buildDb(packed, meta);
  })();
  cached.catch(() => (cached = null));
  return cached;
}

export function buildDb(packed: PackedCard[], meta: StaticMeta): CardDb {
  const cards = packed.map(unpackCard);
  const byName = new Map<string, number[]>();
  const add = (name: string, i: number) => {
    const k = normalizeName(name);
    const list = byName.get(k);
    if (!list) byName.set(k, [i]);
    else if (!list.includes(i)) list.push(i);
  };
  cards.forEach((c, i) => {
    add(c.name, i);
    c.faces?.forEach((f) => add(f.name, i));
  });
  return { cards, byName, meta };
}

export function staticSource(db: CardDb): CardSource {
  return {
    async resolve(entries) {
      const resolved = [];
      const notFound = [];
      for (const entry of entries) {
        const key = normalizeName(entry.name);
        const card = pickBestCard((db.byName.get(key) ?? []).map((i) => db.cards[i]), key);
        if (card) resolved.push({ entry, card });
        else notFound.push(entry);
      }
      return { resolved, notFound };
    },
    async overrides(ids) {
      return ids.flatMap((id) => db.cards[Number(id)]?.overrides.map((o) => ({ cardId: id, ...o })) ?? []);
    },
  };
}
