import { colorsToString, manaSymbolsToString, normalizeName } from "@/lib/cards/normalize";
import type { ScryfallCard, ScryfallImageUris } from "./types";

/** Layouts que não são cartas de jogo (tokens, art cards, planos…). */
const NON_GAME_LAYOUTS = new Set([
  "art_series",
  "token",
  "double_faced_token",
  "emblem",
  "planar",
  "scheme",
  "vanguard",
  "front_card",
]);

export function isGameCard(card: ScryfallCard): boolean {
  return !!card.oracle_id && !NON_GAME_LAYOUTS.has(card.layout);
}

export type CardImages = { small?: string; normal?: string; large?: string };

export type CardFaceData = {
  name: string;
  manaCost: string | null;
  typeLine: string | null;
  oracleText: string | null;
  colors: string;
  imageUris: CardImages | null;
};

/** Formato pronto a gravar na tabela Card (sem os campos automáticos). */
export type CardData = {
  id: string;
  scryfallId: string;
  name: string;
  layout: string;
  manaCost: string | null;
  cmc: number;
  typeLine: string;
  oracleText: string | null;
  colors: string;
  colorIdentity: string;
  producedMana: string;
  legalities: Record<string, string>;
  commanderLegality: string;
  gameChanger: boolean;
  priceEurCents: number | null;
  priceUsdCents: number | null;
  imageUris: CardImages | null;
  faces: CardFaceData[] | null;
  source: "bulk" | "collection";
};

/** Só guardamos links do servidor de imagens do Scryfall. */
function pickImages(uris: ScryfallImageUris | undefined): CardImages | null {
  if (!uris) return null;
  const out: CardImages = {};
  for (const size of ["small", "normal", "large"] as const) {
    const url = uris[size];
    if (url && isScryfallImageUrl(url)) out[size] = url;
  }
  return Object.keys(out).length ? out : null;
}

export function isScryfallImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "scryfall.io" || u.hostname.endsWith(".scryfall.io"));
  } catch {
    return false;
  }
}

/** "12.34" → 1234. Usa o preço normal; se não houver, foil; depois etched. */
function pickPriceCents(prices: Record<string, string | null> | undefined, keys: string[]): number | null {
  if (!prices) return null;
  for (const k of keys) {
    const v = prices[k];
    if (v != null && v !== "") {
      const n = Math.round(parseFloat(v) * 100);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** Junta oracle text e mana cost das faces quando a carta não os tem no topo. */
function joinFaces(card: ScryfallCard, key: "oracle_text" | "mana_cost"): string | null {
  if (card[key] != null) return card[key] ?? null;
  if (!card.card_faces?.length) return null;
  const parts = card.card_faces.map((f) => f[key] ?? "").filter(Boolean);
  return parts.length ? parts.join(key === "oracle_text" ? "\n//\n" : " // ") : null;
}

export function mapScryfallCard(card: ScryfallCard, source: CardData["source"] = "bulk"): CardData {
  if (!card.oracle_id) throw new Error(`Carta sem oracle_id: ${card.name}`);

  const faces: CardFaceData[] | null = card.card_faces?.length
    ? card.card_faces.map((f) => ({
        name: f.name,
        manaCost: f.mana_cost || null,
        typeLine: f.type_line ?? null,
        oracleText: f.oracle_text ?? null,
        colors: colorsToString(f.colors),
        imageUris: pickImages(f.image_uris),
      }))
    : null;

  const colors =
    card.colors != null
      ? colorsToString(card.colors)
      : colorsToString(card.card_faces?.flatMap((f) => f.colors ?? []));

  return {
    id: card.oracle_id,
    scryfallId: card.id,
    name: card.name,
    layout: card.layout,
    manaCost: joinFaces(card, "mana_cost") || null,
    cmc: card.cmc ?? 0,
    typeLine: card.type_line ?? card.card_faces?.map((f) => f.type_line).join(" // ") ?? "",
    oracleText: joinFaces(card, "oracle_text"),
    colors,
    colorIdentity: colorsToString(card.color_identity),
    producedMana: manaSymbolsToString(card.produced_mana),
    legalities: card.legalities,
    commanderLegality: card.legalities?.commander ?? "not_legal",
    gameChanger: card.game_changer === true,
    priceEurCents: pickPriceCents(card.prices, ["eur", "eur_foil", "eur_etched"]),
    priceUsdCents: pickPriceCents(card.prices, ["usd", "usd_foil", "usd_etched"]),
    imageUris: pickImages(card.image_uris),
    faces,
    source,
  };
}

/** Nomes normalizados pelos quais a carta pode ser encontrada. */
export function lookupNames(card: Pick<CardData, "name" | "faces">): string[] {
  const names = new Set<string>([normalizeName(card.name)]);
  for (const f of card.faces ?? []) names.add(normalizeName(f.name));
  return [...names];
}
