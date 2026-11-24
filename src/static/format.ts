import type { DeckCard } from "@/lib/cards/types";
import type { CardFaceData } from "@/lib/scryfall/map";

/**
 * Formato compacto do ficheiro de cartas da versão estática (data/cards.json):
 * uma lista por carta, para o ficheiro ficar pequeno.
 */
export type PackedFace = [name: string, manaCost: string | null, typeLine: string | null, oracleText: string | null, image: 0 | 1 | 2];
export type PackedCard = [
  scryfallId: string,
  name: string,
  layout: string,
  manaCost: string | null,
  cmc: number,
  typeLine: string,
  oracleText: string | null,
  colorIdentity: string,
  producedMana: string,
  legality: string,
  gameChanger: 0 | 1,
  eur: number | null,
  usd: number | null,
  faces: PackedFace[] | 0,
  tagCategories: string | null,
  overrides: [string, 0 | 1][] | 0,
  hasImage: 0 | 1,
];

export type StaticMeta = { exportedAt: string; bulkUpdatedAt: string | null; cards: number };

const LEGALITY: Record<string, string> = { l: "legal", b: "banned", n: "not_legal", r: "restricted" };
export const LEGALITY_CODE: Record<string, string> = { legal: "l", banned: "b", not_legal: "n", restricted: "r" };

/** Imagens do Scryfall reconstruídas a partir do id da impressão. */
export function imageUrl(scryfallId: string, side: "front" | "back", size: "normal" | "large" | "small") {
  return `https://cards.scryfall.io/${size}/${side}/${scryfallId[0]}/${scryfallId[1]}/${scryfallId}.jpg`;
}

function images(id: string, side: "front" | "back") {
  return { small: imageUrl(id, side, "small"), normal: imageUrl(id, side, "normal"), large: imageUrl(id, side, "large") };
}

export function unpackCard(p: PackedCard, index: number): DeckCard & { overrides: { category: string; include: boolean }[] } {
  const [scryfallId, name, layout, manaCost, cmc, typeLine, oracleText, colorIdentity, producedMana, legality, gc, eur, usd, faces, tags, overrides, hasImage] = p;
  const unpackedFaces: CardFaceData[] | null = faces
    ? faces.map(([fname, fcost, ftype, ftext, img]) => ({
        name: fname,
        manaCost: fcost,
        typeLine: ftype,
        oracleText: ftext,
        colors: "",
        imageUris: img ? images(scryfallId, img === 1 ? "front" : "back") : null,
      }))
    : null;
  return {
    id: String(index),
    scryfallId,
    name,
    layout,
    manaCost,
    cmc,
    typeLine,
    oracleText,
    colors: "",
    colorIdentity,
    producedMana,
    legalities: { commander: LEGALITY[legality] ?? "not_legal" },
    commanderLegality: LEGALITY[legality] ?? "not_legal",
    gameChanger: gc === 1,
    priceEurCents: eur,
    priceUsdCents: usd,
    imageUris: hasImage ? images(scryfallId, "front") : null,
    faces: unpackedFaces,
    tagCategories: tags,
    source: "bulk",
    updatedAt: new Date(0),
    overrides: overrides ? overrides.map(([category, inc]) => ({ category, include: inc === 1 })) : [],
  };
}
