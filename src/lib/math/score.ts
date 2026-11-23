import { num, pct } from "@/lib/format";

export type ScorePart = {
  key: string;
  label: string;
  points: number;
  max: number;
  /** Como foi calculado, em texto */
  detail: string;
};

export type Score = { total: number; parts: ScorePart[] };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const r1 = (x: number) => Math.round(x * 10) / 10;

export type ScoreInput = {
  template: { label: string; key: string; have: number; target: number; score: number }[];
  lands: number;
  karsten: number;
  /** Pior probabilidade de fontes de cor (null = deck incolor) */
  worstColorProbability: number | null;
  avgCmc: number;
  tappedAlways: number;
  handProbability: number;
  bestHandProbability: number;
};

/**
 * Nota de 0 a 100, sem caixa negra:
 * - Contagens vs. template: 40 pontos, divididos igualmente pelas linhas.
 * - Mana: 30 pontos = terrenos vs. Karsten (10) + fontes de cor (10)
 *   + CMC médio (5) + terrenos tapped (5).
 * - Mão inicial: 30 pontos × P(mão boa em n mãos) / melhor P possível.
 */
export function computeScore(i: ScoreInput): Score {
  const per = 40 / Math.max(1, i.template.length);
  const parts: ScorePart[] = i.template.map((t) => ({
    key: `template-${t.key}`,
    label: t.label,
    points: per * t.score,
    max: per,
    detail:
      t.key === "land"
        ? `${t.have} vs. ${t.target}: perde 1/6 por cada terreno de diferença`
        : `${t.have} de ${t.target} (${Math.round(clamp01(t.have / t.target) * 100)} %)`,
  }));

  const kDiff = Math.abs(i.lands - i.karsten);
  parts.push({
    key: "karsten",
    label: "Terrenos vs. Karsten",
    points: 10 * clamp01(1 - kDiff / 5),
    max: 10,
    detail: `${i.lands} terrenos vs. ${num(i.karsten, 1)} recomendados: perde 2 pontos por terreno de diferença`,
  });

  const colorP = i.worstColorProbability;
  parts.push({
    key: "colors",
    label: "Fontes de cor",
    points: colorP == null ? 10 : 10 * clamp01(colorP / 0.9),
    max: 10,
    detail:
      colorP == null
        ? "deck incolor: pontuação máxima"
        : `carta mais exigente com ${Math.round(colorP * 100)} % de ter as cores a tempo (90 % ou mais = pontuação máxima)`,
  });

  parts.push({
    key: "curve",
    label: "CMC médio",
    points: 5 * clamp01((4.5 - i.avgCmc) / 1.5),
    max: 5,
    detail: `${num(i.avgCmc)}: 3,0 ou menos = máximo, 4,5 ou mais = zero`,
  });

  parts.push({
    key: "tapped",
    label: "Terrenos tapped",
    points: 5 * clamp01(1 - Math.max(0, i.tappedAlways - 3) / 5),
    max: 5,
    detail: `${i.tappedAlways} sempre tapped: até 3 não penaliza, depois perde 1 ponto por terreno`,
  });

  parts.push({
    key: "hand",
    label: "Mão inicial boa",
    points: 30 * clamp01(i.handProbability / i.bestHandProbability),
    max: 30,
    detail: `${pct(i.handProbability)} vs. o máximo possível de ${pct(i.bestHandProbability)}`,
  });

  const total = Math.round(parts.reduce((s, p) => s + p.points, 0));
  return { total, parts: parts.map((p) => ({ ...p, points: r1(p.points) })) };
}
