import { COLOR_NAMES_PT, type Color } from "@/lib/cards/normalize";
import { pct, num } from "@/lib/format";
import { atLeast, goodHandProbability, withinHands } from "./hypergeometric";
import type { ColorRequirement } from "./mana";
import type { Score } from "./score";
import { interactionNeeded, type SeatAnalysis } from "./seats";
import { cardsSeen, type TableContext } from "./table";

export type Improvement = {
  key: string;
  /** Pontos da nota que se recuperam ao resolver (null = não entra na nota) */
  gain: number | null;
  /** Etiqueta quando não há pontos: "mesa" (depende do lugar) ou "cor" (cor que não é a pior) */
  tag?: "mesa" | "cor";
  title: string;
  detail: string;
};

export type ImprovementInput = {
  score: Score;
  template: { key: string; label: string; have: number; target: number }[];
  lands: number;
  cheapRamp: number;
  karsten: number;
  colors: ColorRequirement[];
  nonlandCmcs: number[];
  avgCmc: number;
  tappedAlways: string[];
  hands: number;
  N: number;
  bestRamp: { ramp: number; p: number };
  maxHand: number;
  interaction: number;
  seat: SeatAnalysis;
  context: TableContext;
};

const COLOR_TARGET = 0.9;
const INTERACTION_TARGET = 0.7;
const CMC_TARGET = 3.0;
/** Mais do que isto já não é "acrescentar fontes", é refazer a base de mana. */
const MAX_REALISTIC_SOURCES = 6;
/** +3 / −3 (sinal de menos tipográfico) */
const signed = (d: number) => (d > 0 ? `+${d}` : `−${Math.abs(d)}`);

/** Fontes a mais para a carta mais exigente de uma cor chegar a 90 %. */
export function sourcesNeeded(N: number, c: ColorRequirement, target = COLOR_TARGET): number | null {
  if (!c.hardest) return null;
  for (let extra = 0; c.sources + extra <= N; extra++) {
    if (atLeast(N, c.sources + extra, c.hardest.cardsSeen, c.hardest.pips) >= target) return extra;
  }
  return null;
}

/** Quantas das cartas mais caras trocar por cartas de MV 3 para o CMC médio chegar a 3,0. */
export function swapsForCmc(cmcs: number[], target = CMC_TARGET, replacement = 3): number {
  const sorted = [...cmcs].sort((a, b) => b - a);
  let total = sorted.reduce((a, b) => a + b, 0);
  let swaps = 0;
  while (sorted.length && total / sorted.length > target && swaps < sorted.length && sorted[swaps] > replacement) {
    total -= sorted[swaps] - replacement;
    swaps++;
  }
  return swaps;
}

export function improvements(i: ImprovementInput): Improvement[] {
  const part = (key: string) => i.score.parts.find((p) => p.key === key)!;
  const lost = (key: string) => {
    const p = part(key);
    return Math.round((p.max - p.points) * 10) / 10;
  };
  const out: Improvement[] = [];

  for (const t of i.template) {
    const g = lost(`template-${t.key}`);
    if (g < 0.5) continue;
    if (t.key === "land") {
      const d = t.target - t.have;
      out.push({
        key: "template-land",
        gain: g,
        title: `Terrenos: ${signed(d)}`,
        detail: `Tens ${t.have}; o template pede ${t.target}.`,
      });
    } else {
      out.push({
        key: `template-${t.key}`,
        gain: g,
        title: `${t.label}: faltam ${t.target - t.have}`,
        detail: `Tens ${t.have} de ${t.target}.`,
      });
    }
  }

  const kGain = lost("karsten");
  const kDiff = Math.round(i.karsten - i.lands);
  if (kGain >= 0.5 && kDiff !== 0) {
    const d = kDiff;
    out.push({
      key: "karsten",
      gain: kGain,
      title: `Karsten: ${signed(d)} terrenos`,
      detail: `Com CMC médio ${num(i.avgCmc)} e ${i.cheapRamp} rampas baratas, a fórmula pede ${num(i.karsten, 1)} terrenos; tens ${i.lands}.${
        d > 0 ? " Baixar a curva também baixa este número." : ""
      }`,
    });
  }

  if (i.bestRamp.ramp !== i.cheapRamp) {
    const now = withinHands(goodHandProbability(i.lands, i.cheapRamp, i.N), i.hands);
    const g = Math.round(((30 * (i.bestRamp.p - now)) / i.maxHand) * 10) / 10;
    if (g >= 0.5) {
      const d = i.bestRamp.ramp - i.cheapRamp;
      out.push({
        key: "hand",
        gain: g,
        title: `Rampa barata (MV ≤ 2): ${signed(d)}`,
        detail: `Para ${i.lands} terrenos, o ótimo é ${i.bestRamp.ramp}; tens ${i.cheapRamp}. A mão boa em até ${i.hands} mãos passa de ${pct(now)} para ${pct(i.bestRamp.p)}.`,
      });
    }
  }

  const cGain = lost("colors");
  for (const c of i.colors) {
    if (!c.hardest || c.hardest.probability >= COLOR_TARGET) continue;
    const extra = sourcesNeeded(i.N, c);
    const worst = Math.min(...i.colors.map((x) => x.hardest?.probability ?? 1));
    const color = COLOR_NAMES_PT[c.color as Color];
    // Só se podem acrescentar fontes trocando terrenos que não dão esta cor (ou juntando rampa).
    const realistic = extra != null && extra <= Math.min(MAX_REALISTIC_SOURCES, Math.max(2, i.lands - c.landSources));
    const h = c.hardest;
    const isWorst = h.probability === worst && cGain >= 0.5;
    out.push({
      key: `color-${c.color}`,
      gain: isWorst ? cGain : null,
      ...(isWorst ? {} : { tag: "cor" as const }),
      title: realistic ? `Fontes de ${color}: +${extra}` : `${h.name}: difícil de lançar a tempo`,
      detail: realistic
        ? `${h.name} (${h.pips}× no turno ${h.turn}) tem ${pct(h.probability)} de ter as cores a tempo com ${c.sources} fontes; com ${c.sources + extra!} chega a 90 %. Alternativa: trocar essa carta por uma com menos símbolos.`
        : `Pede ${h.pips} fontes de ${color} no turno ${h.turn} e só tem ${pct(h.probability)} com ${c.sources} fontes${
            extra != null ? `; chegar a 90 % pedia ${c.sources + extra}, mais do que o deck consegue ter` : ""
          }. Aceita lançá-la mais tarde ou troca-a por uma carta com menos símbolos.`,
    });
  }

  const curveGain = lost("curve");
  if (curveGain >= 0.5) {
    const swaps = swapsForCmc(i.nonlandCmcs);
    out.push({
      key: "curve",
      gain: curveGain,
      title: `Curva: CMC médio ${num(i.avgCmc)}`,
      detail: `Trocar as ${swaps} cartas mais caras por cartas de MV 3 punha o CMC médio em 3,0.`,
    });
  }

  const tGain = lost("tapped");
  if (tGain >= 0.5) {
    out.push({
      key: "tapped",
      gain: tGain,
      title: `Terrenos tapped: −${i.tappedAlways.length - 3}`,
      detail: `${i.tappedAlways.length} entram sempre tapped (${i.tappedAlways.join(", ")}); a partir de 3 custam tempo.`,
    });
  }

  // Contexto de mesa (não entra na nota)
  const threat = i.seat.firstThreat;
  if (threat && threat.interactionProbability < INTERACTION_TARGET) {
    const seen = threat.yourTurnsBefore === 0 ? 7 : cardsSeen({ ...i.context, seat: i.seat.seat }, threat.yourTurnsBefore);
    const extra = interactionNeeded(i.N, i.interaction, seen, INTERACTION_TARGET);
    out.push({
      key: "seat-interaction",
      gain: null,
      tag: "mesa",
      title: `Interação para o ${i.seat.seat}.º lugar${extra != null ? `: +${extra}` : ""}`,
      detail: `A primeira ameaça esperada chega quando ${
        threat.yourTurnsBefore === 0 ? "ainda não jogaste" : `jogaste ${threat.yourTurnsBefore} ${threat.yourTurnsBefore === 1 ? "turno" : "turnos"}`
      }; com ${i.interaction} peças tens ${pct(threat.interactionProbability)} de ter uma na mão${
        extra != null ? `, com ${i.interaction + extra} chegas a 70 %` : ""
      }.`,
    });
  }

  return out.sort((a, b) => (b.gain ?? -1) - (a.gain ?? -1));
}
