import { parseManaSymbols } from "@/lib/cards/mana";
import { WUBRG, type Color } from "@/lib/cards/normalize";
import { atLeast, LIBRARY_SIZE } from "./hypergeometric";
import { cardsSeen, type TableContext } from "./table";

/** Carta já classificada, como a avaliação a vê. */
export type EvalCard = {
  name: string;
  quantity: number;
  cmc: number;
  manaCost: string | null;
  typeLine: string;
  oracleText: string | null;
  producedMana: string;
  faces?: { manaCost: string | null; oracleText: string | null; typeLine: string | null }[] | null;
  categories: string[];
};

const isLand = (c: EvalCard) => c.categories.includes("land");
const sumQty = (cs: EvalCard[]) => cs.reduce((s, c) => s + c.quantity, 0);

export const CURVE_MAX = 7; // 7 = "7+"

/** Curva de mana das cartas que não são terreno: índice = MV (7 = 7+). */
export function manaCurve(cards: EvalCard[]): number[] {
  const curve = Array(CURVE_MAX + 1).fill(0);
  for (const c of cards) if (!isLand(c)) curve[Math.min(CURVE_MAX, Math.floor(c.cmc))] += c.quantity;
  return curve;
}

/** CMC médio sem terrenos (média ponderada pela quantidade). */
export function averageCmc(cards: EvalCard[]): number {
  const spells = cards.filter((c) => !isLand(c));
  const n = sumQty(spells);
  return n ? spells.reduce((s, c) => s + c.cmc * c.quantity, 0) / n : 0;
}

/** Karsten: terrenos ≈ 31,42 + 3,13 × CMC médio − 0,28 × rampa. */
export function karstenLands(avgCmc: number, ramp: number): number {
  return 31.42 + 3.13 * avgCmc - 0.28 * ramp;
}

const BASIC_COLOR: Record<string, Color> = { plains: "W", island: "U", swamp: "B", mountain: "R", forest: "G" };

/** Cores que um terreno pode dar, incluindo fetches ("search … Forest or Island card"). */
export function landColors(card: EvalCard, identity: string): string {
  const colors = new Set([...card.producedMana].filter((c) => c !== "C"));
  const text = card.faces?.length ? card.faces.map((f) => f.oracleText ?? "").join("\n") : (card.oracleText ?? "");
  const search = [...text.matchAll(/search your library for ([^.]*?)card/gi)].map((m) => m[1].toLowerCase());
  for (const s of search) {
    if (/\bbasic land\b/.test(s)) [...identity].forEach((c) => colors.add(c));
    for (const [type, c] of Object.entries(BASIC_COLOR)) if (s.includes(type)) colors.add(c);
  }
  return WUBRG.filter((c) => colors.has(c) && identity.includes(c)).join("");
}

export type TappedLands = { always: string[]; conditional: string[] };

/** Terrenos que entram tapped: sempre, ou só às vezes ("unless…", "pay 2 life…"). */
export function tappedLands(cards: EvalCard[]): TappedLands {
  const out: TappedLands = { always: [], conditional: [] };
  for (const c of cards.filter(isLand)) {
    const faces = c.faces?.length ? c.faces : [{ oracleText: c.oracleText, typeLine: c.typeLine, manaCost: c.manaCost }];
    const landFace = faces.find((f) => /\bLand\b/.test(f.typeLine ?? "")) ?? faces[0];
    const t = landFace.oracleText ?? "";
    if (!/enters(?: the battlefield)? tapped/i.test(t)) continue;
    const conditional =
      /enters(?: the battlefield)? tapped unless|tapped if|you may pay|if you don't,? (?:it|this land) enters/i.test(t);
    for (let i = 0; i < c.quantity; i++) (conditional ? out.conditional : out.always).push(c.name);
  }
  return out;
}

/** Símbolos de uma cor num custo (híbridos e phyrexianos não contam: têm alternativa). */
function pips(cost: string | null, color: Color): number {
  return parseManaSymbols(cost).filter((s) => s.toUpperCase() === color).length;
}

export type ColorRequirement = {
  color: Color;
  /** Terrenos que dão esta cor */
  landSources: number;
  /** Rampa MV ≤ 2 que dá esta cor */
  rampSources: number;
  sources: number;
  totalPips: number;
  /** Carta mais exigente: P(ter as fontes necessárias até ao turno = MV) */
  hardest: { name: string; pips: number; turn: number; cardsSeen: number; probability: number } | null;
};

/**
 * Fontes de cada cor vs. símbolos exigidos. Para cada carta, a probabilidade
 * de ter ≥ k fontes da cor entre as cartas vistas até ao turno = MV
 * (hipergeométrica simples sobre as 99). A pior carta de cada cor é a que conta.
 */
export function colorRequirements(cards: EvalCard[], commander: EvalCard | null, identity: string, ctx: TableContext): ColorRequirement[] {
  const deck = cards;
  return WUBRG.filter((c) => identity.includes(c)).map((color) => {
    const landSources = sumQty(deck.filter((c) => isLand(c) && landColors(c, identity).includes(color)));
    const rampSources = sumQty(
      deck.filter(
        (c) => !isLand(c) && c.categories.includes("ramp") && c.cmc <= 2 && c.producedMana.includes(color),
      ),
    );
    const sources = landSources + rampSources;
    let totalPips = 0;
    let hardest: ColorRequirement["hardest"] = null;
    for (const c of [...(commander ? [commander] : []), ...deck]) {
      if (isLand(c)) continue;
      const costs = c.faces?.length ? c.faces.map((f) => f.manaCost) : [c.manaCost];
      const k = Math.max(...costs.map((cost) => pips(cost, color)));
      if (k === 0) continue;
      totalPips += k * c.quantity;
      const turn = Math.max(1, Math.ceil(c.cmc), k);
      const seen = cardsSeen(ctx, turn);
      const probability = atLeast(LIBRARY_SIZE, sources, seen, k);
      if (!hardest || probability < hardest.probability) hardest = { name: c.name, pips: k, turn, cardsSeen: seen, probability };
    }
    return { color, landSources, rampSources, sources, totalPips, hardest };
  });
}
