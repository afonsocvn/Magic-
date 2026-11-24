import { WUBRG, type Color } from "@/lib/cards/normalize";
import { cardGroup, GROUP_LABELS, type GroupKey } from "@/lib/deck/groups";
import type { Category } from "@/lib/categories/types";
import { num } from "@/lib/format";
import type { ColorRequirement, EvalCard } from "./mana";
import type { Score } from "./score";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Quantidades de referência para os eixos que contam cartas (10 = chegar lá). */
export const RADAR_REFERENCE: Record<string, { label: string; categories: Category[]; target: number }> = {
  ramp: { label: "Rampa", categories: ["ramp"], target: 10 },
  draw: { label: "Card draw", categories: ["draw"], target: 12 },
  interaction: { label: "Interação", categories: ["removal", "counter"], target: 12 },
  wipe: { label: "Board wipes", categories: ["wipe"], target: 6 },
  protection: { label: "Proteção", categories: ["protection"], target: 5 },
  tutor: { label: "Tutors", categories: ["tutor"], target: 5 },
  recursion: { label: "Recursão", categories: ["recursion"], target: 5 },
  wincon: { label: "Fecho", categories: ["wincon"], target: 4 },
};

export type RadarAxis = { key: string; label: string; value: number; detail: string };

export type SpeedInput = { avgCmc: number; expectedManaT4: number };

/**
 * Velocidade 0–10: metade pela curva (CMC médio 2,5 → 10, 4,5 → 0),
 * metade pela mana esperada no teu turno 4 (3 → 0, 5 → 10).
 */
export function speedScore({ avgCmc, expectedManaT4 }: SpeedInput): number {
  return r1(5 * clamp01((4.5 - avgCmc) / 2) + 5 * clamp01((expectedManaT4 - 3) / 2));
}

/** Mana 0–10: as parcelas de mana e de mão inicial da nota (60 pontos), em escala 0–10. */
export function manaScore(score: Score): number {
  const keys = ["karsten", "colors", "curve", "tapped", "hand"];
  const parts = score.parts.filter((p) => keys.includes(p.key));
  const max = parts.reduce((s, p) => s + p.max, 0);
  return max ? r1((10 * parts.reduce((s, p) => s + p.points, 0)) / max) : 0;
}

const count = (deck: EvalCard[], cats: Category[]) =>
  deck.filter((c) => cats.some((k) => c.categories.includes(k))).reduce((s, c) => s + c.quantity, 0);

export function radarAxes(deck: EvalCard[], score: Score, speed: SpeedInput): RadarAxis[] {
  const axes: RadarAxis[] = Object.entries(RADAR_REFERENCE).map(([key, ref]) => {
    const have = count(deck, ref.categories);
    return {
      key,
      label: ref.label,
      value: r1(10 * clamp01(have / ref.target)),
      detail: `${have} cartas; 10 = ${ref.target} ou mais`,
    };
  });
  axes.push({
    key: "mana",
    label: "Mana",
    value: manaScore(score),
    detail: "parcelas de mana e mão inicial da nota (60 pts) em escala 0–10",
  });
  axes.push({
    key: "speed",
    label: "Velocidade",
    value: speedScore(speed),
    detail: `CMC médio ${num(speed.avgCmc)} e ${num(speed.expectedManaT4)} de mana esperada no turno 4`,
  });
  return axes;
}

/** Valores do template de referência no radar (polígono cinzento). */
export function referenceRadar(): Record<string, number> {
  return { ...Object.fromEntries(Object.keys(RADAR_REFERENCE).map((k) => [k, 10])), mana: 10, speed: 10 };
}

export type QuadrantPoint = { x: number; y: number; xDetail: string; yDetail: string };

export const INTERACTION_CENTER = 0.25;
export const INTERACTION_SPREAD = 0.15;
export const CREATURE_CENTER = 0.4;
export const CREATURE_SPREAD = 0.3;

const nonland = (deck: EvalCard[]) => deck.filter((c) => !c.categories.includes("land"));
const qty = (cs: EvalCard[]) => cs.reduce((s, c) => s + c.quantity, 0);

/**
 * Estilo de jogo: x = velocidade (−1 lento … +1 rápido), y = interação
 * (−1 proativo … +1 reativo). y vem da fração de cartas (sem terrenos) com
 * remoção, wipe, counter ou proteção: 25 % = centro, ±15 % = extremos.
 */
export function playstylePoint(deck: EvalCard[], speed: number): QuadrantPoint {
  const spells = nonland(deck);
  const n = qty(spells);
  const reactive = qty(spells.filter((c) => ["removal", "wipe", "counter", "protection"].some((k) => c.categories.includes(k))));
  const share = n ? reactive / n : 0;
  return {
    x: r2(clamp(speed / 5 - 1, -1, 1)),
    y: r2(clamp((share - INTERACTION_CENTER) / INTERACTION_SPREAD, -1, 1)),
    xDetail: `velocidade ${num(speed, 1)}/10`,
    yDetail: `${Math.round(share * 100)} % das cartas (sem terrenos) são interação ou proteção`,
  };
}

/**
 * Composição: x = criaturas (−1 quase só feitiços/artefactos … +1 quase só
 * criaturas; 40 % = centro, ±30 % = extremos), y = velocidade.
 */
export function compositionPoint(deck: EvalCard[], speed: number): QuadrantPoint {
  const spells = nonland(deck);
  const n = qty(spells);
  const creatures = qty(spells.filter((c) => cardGroup(c) === "creature"));
  const share = n ? creatures / n : 0;
  return {
    x: r2(clamp((share - CREATURE_CENTER) / CREATURE_SPREAD, -1, 1)),
    y: r2(clamp(speed / 5 - 1, -1, 1)),
    xDetail: `${Math.round(share * 100)} % das cartas (sem terrenos) são criaturas`,
    yDetail: `velocidade ${num(speed, 1)}/10`,
  };
}

function r2(x: number) {
  return Math.round(x * 100) / 100;
}

export type CompositionSlice = { key: GroupKey; label: string; count: number };

export function composition(deck: EvalCard[]): CompositionSlice[] {
  const order: GroupKey[] = ["creature", "instant", "sorcery", "artifact", "enchantment", "planeswalker", "battle", "land", "other"];
  const counts = new Map<GroupKey, number>();
  for (const c of deck) {
    // MDFC com face de terreno conta como terreno (como na avaliação).
    const g = c.categories.includes("land") ? "land" : cardGroup(c);
    counts.set(g, (counts.get(g) ?? 0) + c.quantity);
  }
  return order.filter((k) => counts.get(k)).map((k) => ({ key: k, label: GROUP_LABELS[k], count: counts.get(k)! }));
}

export type ColorBalance = { color: Color; pips: number; sources: number; pipShare: number; sourceShare: number };

/** Símbolos exigidos vs. fontes, por cor (percentagens dentro do deck). */
export function colorBalance(colors: ColorRequirement[]): ColorBalance[] {
  const pips = colors.reduce((s, c) => s + c.totalPips, 0);
  const sources = colors.reduce((s, c) => s + c.sources, 0);
  return WUBRG.flatMap((col) => {
    const c = colors.find((x) => x.color === col);
    if (!c) return [];
    return [{ color: col, pips: c.totalPips, sources: c.sources, pipShare: pips ? c.totalPips / pips : 0, sourceShare: sources ? c.sources / sources : 0 }];
  });
}
