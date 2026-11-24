import { num, pct } from "@/lib/format";
import type { Evaluation } from "@/lib/math/evaluate";

type Line<C> = { card: C; quantity: number };

/** Cartas que saíram (estão em A e não em B) e entraram (em B e não em A), por quantidade. */
export function diffDecks<C extends { id: string; name: string }>(a: Line<C>[], b: Line<C>[]) {
  const qa = new Map<string, Line<C>>();
  const qb = new Map<string, Line<C>>();
  for (const l of a) qa.set(l.card.id, { card: l.card, quantity: (qa.get(l.card.id)?.quantity ?? 0) + l.quantity });
  for (const l of b) qb.set(l.card.id, { card: l.card, quantity: (qb.get(l.card.id)?.quantity ?? 0) + l.quantity });
  const removed: Line<C>[] = [];
  const added: Line<C>[] = [];
  for (const [id, l] of qa) {
    const d = l.quantity - (qb.get(id)?.quantity ?? 0);
    if (d > 0) removed.push({ card: l.card, quantity: d });
  }
  for (const [id, l] of qb) {
    const d = l.quantity - (qa.get(id)?.quantity ?? 0);
    if (d > 0) added.push({ card: l.card, quantity: d });
  }
  const byName = (x: Line<C>, y: Line<C>) => x.card.name.localeCompare(y.card.name);
  return { removed: removed.sort(byName), added: added.sort(byName) };
}

export type MetricRow = {
  key: string;
  label: string;
  a: string;
  b: string;
  delta: string;
  /** true = B melhor, false = B pior, null = sem direção clara ou igual */
  better: boolean | null;
};

type Metric = {
  key: string;
  label: string;
  get: (e: Evaluation) => number;
  fmt: (x: number) => string;
  fmtDelta: (d: number) => string;
  /** "up" = mais é melhor, "down" = menos é melhor, "closer" = mais perto do alvo é melhor */
  direction: "up" | "down" | "none" | { closerTo: (e: Evaluation) => number };
};

const signed = (s: string, d: number) => (d > 0 ? `+${s}` : d < 0 ? `−${s.replace("-", "")}` : "0");
const EPS = 1e-9;

const METRICS: Metric[] = [
  { key: "score", label: "Nota", get: (e) => e.score.total, fmt: (x) => `${x}`, fmtDelta: (d) => signed(`${Math.abs(d)}`, d), direction: "up" },
  {
    key: "lands",
    label: "Terrenos",
    get: (e) => e.lands,
    fmt: (x) => `${x}`,
    fmtDelta: (d) => signed(`${Math.abs(d)}`, d),
    direction: { closerTo: (e) => e.karsten },
  },
  { key: "cheapRamp", label: "Rampa MV ≤ 2", get: (e) => e.cheapRamp.count, fmt: (x) => `${x}`, fmtDelta: (d) => signed(`${Math.abs(d)}`, d), direction: "none" },
  { key: "interaction", label: "Interação (remoção, wipes, counters)", get: (e) => e.profile.interaction, fmt: (x) => `${x}`, fmtDelta: (d) => signed(`${Math.abs(d)}`, d), direction: "up" },
  { key: "avgCmc", label: "CMC médio", get: (e) => e.avgCmc, fmt: (x) => num(x), fmtDelta: (d) => signed(num(Math.abs(d)), d), direction: "down" },
  { key: "karsten", label: "Terrenos (Karsten)", get: (e) => e.karsten, fmt: (x) => num(x, 1), fmtDelta: (d) => signed(num(Math.abs(d), 1), d), direction: "none" },
  { key: "hand", label: "Mão boa (até n mãos)", get: (e) => e.hand.withinN, fmt: pct, fmtDelta: (d) => signed(`${num(Math.abs(d) * 100, 1)} pp`, d), direction: "up" },
  {
    key: "colors",
    label: "Cores a tempo (pior carta)",
    get: (e) => Math.min(1, ...e.colors.map((c) => c.hardest?.probability ?? 1)),
    fmt: pct,
    fmtDelta: (d) => signed(`${num(Math.abs(d) * 100, 1)} pp`, d),
    direction: "up",
  },
  {
    key: "mana4",
    label: "Mana esperada no teu turno 4",
    get: (e) => e.seats[e.context.seat - 1].development[3].expected,
    fmt: (x) => num(x),
    fmtDelta: (d) => signed(num(Math.abs(d)), d),
    direction: "up",
  },
  {
    key: "threat",
    label: "Interação na 1.ª ameaça",
    get: (e) => e.seats[e.context.seat - 1].firstThreat?.interactionProbability ?? 0,
    fmt: pct,
    fmtDelta: (d) => signed(`${num(Math.abs(d) * 100, 1)} pp`, d),
    direction: "up",
  },
  { key: "speed", label: "Velocidade (0–10)", get: (e) => e.style.speed, fmt: (x) => num(x, 1), fmtDelta: (d) => signed(num(Math.abs(d), 1), d), direction: "up" },
];

export function compareMetrics(a: Evaluation, b: Evaluation): MetricRow[] {
  return METRICS.map((m) => {
    const va = m.get(a);
    const vb = m.get(b);
    const d = vb - va;
    let better: boolean | null = null;
    if (Math.abs(d) > EPS) {
      if (m.direction === "up") better = d > 0;
      else if (m.direction === "down") better = d < 0;
      else if (typeof m.direction === "object") {
        const da = Math.abs(va - m.direction.closerTo(a));
        const db = Math.abs(vb - m.direction.closerTo(b));
        better = Math.abs(da - db) < EPS ? null : db < da;
      }
    }
    return { key: m.key, label: m.label, a: m.fmt(va), b: m.fmt(vb), delta: Math.abs(d) > EPS ? m.fmtDelta(d) : "=", better };
  });
}

/** Parcelas da nota lado a lado. */
export function compareScoreParts(a: Evaluation, b: Evaluation) {
  return a.score.parts.map((p) => {
    const q = b.score.parts.find((x) => x.key === p.key);
    const d = Math.round(((q?.points ?? 0) - p.points) * 10) / 10;
    return { key: p.key, label: p.label, max: p.max, a: p.points, b: q?.points ?? 0, delta: d };
  });
}
