import { HAND_SIZE, multivariatePmf } from "./hypergeometric";

/**
 * Desenvolvimento de mana turno a turno, cálculo exato (programação dinâmica).
 *
 * Modelo (simplificado, e dito na página):
 * - o baralho tem L terrenos, R rampas baratas (MV ≤ 2) e o resto;
 * - fica-se com a mão de 7 (sem mulligans);
 * - compra-se 1 carta por turno (no 1.º turno só se `drawFirstTurn`);
 * - joga-se 1 terreno por turno se houver na mão;
 * - mana disponível no turno t = terrenos em jogo + rampas em jogo;
 * - cada rampa custa `rampCost` e só dá mana a partir do turno seguinte;
 *   lança-se toda a rampa que a mana permitir.
 */
export type DevelopmentInput = {
  N: number;
  lands: number;
  ramp: number;
  rampCost: number;
  drawFirstTurn: boolean;
  turns: number;
};

export type TurnDevelopment = {
  turn: number;
  /** dist[m] = P(ter exatamente m de mana disponível neste turno) */
  dist: number[];
  expected: number;
  /** P(ter jogado um terreno em todos os turnos até este, inclusive) */
  allLandDrops: number;
};

type State = { lp: number; dl: number; rp: number; dr: number; ok: boolean };
const key = (s: State) => `${s.lp},${s.dl},${s.rp},${s.dr},${s.ok ? 1 : 0}`;

function add(map: Map<string, [State, number]>, s: State, p: number) {
  if (p === 0) return;
  const k = key(s);
  const cur = map.get(k);
  map.set(k, [s, (cur?.[1] ?? 0) + p]);
}

export function manaDevelopment(i: DevelopmentInput): TurnDevelopment[] {
  const { N, lands: L, ramp: R } = i;
  const O = N - L - R;
  let states = new Map<string, [State, number]>();

  // Mão inicial: distribuição multivariada de (terrenos, rampa) nas 7 cartas.
  for (let l = 0; l <= Math.min(L, HAND_SIZE); l++) {
    for (let r = 0; r <= Math.min(R, HAND_SIZE - l); r++) {
      if (HAND_SIZE - l - r > O) continue;
      add(states, { lp: 0, dl: l, rp: 0, dr: r, ok: true }, multivariatePmf([L, R, O], [l, r, HAND_SIZE - l - r]));
    }
  }
  let drawn = HAND_SIZE;
  const out: TurnDevelopment[] = [];

  for (let turn = 1; turn <= i.turns; turn++) {
    // Compra
    if (turn > 1 || i.drawFirstTurn) {
      const next = new Map<string, [State, number]>();
      const left = N - drawn;
      for (const [s, p] of states.values()) {
        const pl = (L - s.dl) / left;
        const pr = (R - s.dr) / left;
        add(next, { ...s, dl: s.dl + 1 }, p * pl);
        add(next, { ...s, dr: s.dr + 1 }, p * pr);
        add(next, s, p * (1 - pl - pr));
      }
      states = next;
      drawn++;
    }

    // Terreno, mana disponível, rampa
    const dist: number[] = [];
    let allLandDrops = 0;
    const next = new Map<string, [State, number]>();
    for (const [s, p] of states.values()) {
      const canPlay = s.dl - s.lp > 0;
      const lp = canPlay ? s.lp + 1 : s.lp;
      const ok = s.ok && canPlay;
      const mana = lp + s.rp;
      dist[mana] = (dist[mana] ?? 0) + p;
      if (ok) allLandDrops += p;
      const castable = Math.min(s.dr - s.rp, Math.floor(mana / i.rampCost));
      add(next, { lp, dl: s.dl, rp: s.rp + castable, dr: s.dr, ok }, p);
    }
    states = next;
    const filled = Array.from({ length: dist.length }, (_, m) => dist[m] ?? 0);
    out.push({
      turn,
      dist: filled,
      expected: filled.reduce((e, p, m) => e + p * m, 0),
      allLandDrops,
    });
  }
  return out;
}

/** P(mana disponível ≥ m) num turno. */
export function atLeastMana(t: TurnDevelopment, m: number): number {
  return t.dist.slice(Math.max(0, m)).reduce((a, b) => a + b, 0);
}
