import type { DeckCard } from "@/lib/cards/types";

export type Currency = "eur" | "usd";

export type GroupKey =
  | "creature"
  | "planeswalker"
  | "battle"
  | "instant"
  | "sorcery"
  | "artifact"
  | "enchantment"
  | "land"
  | "other";

export const GROUP_LABELS: Record<GroupKey, string> = {
  creature: "Criaturas",
  planeswalker: "Planeswalkers",
  battle: "Batalhas",
  instant: "Instants",
  sorcery: "Sorceries",
  artifact: "Artefactos",
  enchantment: "Encantamentos",
  land: "Terrenos",
  other: "Outros",
};

const GROUP_ORDER: GroupKey[] = [
  "creature",
  "planeswalker",
  "battle",
  "instant",
  "sorcery",
  "artifact",
  "enchantment",
  "land",
  "other",
];

type TypedCard = { typeLine: string; faces?: { typeLine: string | null }[] | null };

/** Tipo da face da frente (é a que conta para arrumar a carta). */
export function frontType(card: TypedCard): string {
  return card.faces?.[0]?.typeLine ?? card.typeLine.split(" // ")[0];
}

/**
 * Grupo de uma carta, pela face da frente. Criatura ganha a tudo
 * (Artifact Creature → criaturas); terreno ganha ao resto
 * (Artifact Land → terrenos). Um MDFC feitiço/terreno fica nas sorceries
 * aqui; na avaliação matemática conta como terreno.
 */
export function cardGroup(card: TypedCard): GroupKey {
  const t = frontType(card);
  if (/\bCreature\b/.test(t)) return "creature";
  if (/\bLand\b/.test(t)) return "land";
  if (/\bPlaneswalker\b/.test(t)) return "planeswalker";
  if (/\bBattle\b/.test(t)) return "battle";
  if (/\bInstant\b/.test(t)) return "instant";
  if (/\bSorcery\b/.test(t)) return "sorcery";
  if (/\bArtifact\b/.test(t)) return "artifact";
  if (/\bEnchantment\b/.test(t)) return "enchantment";
  return "other";
}

export function priceCents(card: Pick<DeckCard, "priceEurCents" | "priceUsdCents">, currency: Currency): number | null {
  return currency === "eur" ? card.priceEurCents : card.priceUsdCents;
}

export type DeckLine<C> = { card: C; quantity: number };

export type CardGroup<C> = {
  key: GroupKey;
  label: string;
  lines: DeckLine<C>[];
  count: number;
  totalCents: number;
};

type GroupableCard = TypedCard & Pick<DeckCard, "id" | "name" | "cmc" | "priceEurCents" | "priceUsdCents">;

/** Junta linhas repetidas da mesma carta e soma as quantidades. */
export function mergeLines<C extends { id: string }>(lines: DeckLine<C>[]): DeckLine<C>[] {
  const byId = new Map<string, DeckLine<C>>();
  for (const l of lines) {
    const cur = byId.get(l.card.id);
    byId.set(l.card.id, { card: l.card, quantity: (cur?.quantity ?? 0) + l.quantity });
  }
  return [...byId.values()];
}

/** Agrupa por tipo, com contagem e subtotal; dentro do grupo, por CMC e nome. */
export function groupDeck<C extends GroupableCard>(lines: DeckLine<C>[], currency: Currency): CardGroup<C>[] {
  const groups = new Map<GroupKey, DeckLine<C>[]>();
  for (const l of mergeLines(lines)) {
    const k = cardGroup(l.card);
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  return GROUP_ORDER.filter((k) => groups.has(k)).map((key) => {
    const ls = groups.get(key)!.sort((a, b) => a.card.cmc - b.card.cmc || a.card.name.localeCompare(b.card.name));
    return {
      key,
      label: GROUP_LABELS[key],
      lines: ls,
      count: ls.reduce((s, l) => s + l.quantity, 0),
      totalCents: ls.reduce((s, l) => s + l.quantity * (priceCents(l.card, currency) ?? 0), 0),
    };
  });
}

/** Total do deck e quantas cartas não têm preço nessa moeda. */
export function deckTotal<C extends GroupableCard>(lines: DeckLine<C>[], currency: Currency) {
  let totalCents = 0;
  let missing = 0;
  for (const l of lines) {
    const p = priceCents(l.card, currency);
    if (p == null) missing += l.quantity;
    else totalCents += p * l.quantity;
  }
  return { totalCents, missing };
}

export function formatPrice(cents: number | null, currency: Currency): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: currency.toUpperCase(),
    currencyDisplay: "narrowSymbol",
  }).format(cents / 100);
}
