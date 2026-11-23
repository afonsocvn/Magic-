/** C(n, k) — exato até ~10^15, mais do que chega para baralhos de 99. */
export function binom(n: number, k: number): number {
  if (k < 0 || n < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/**
 * Hipergeométrica multivariada: probabilidade de tirar exatamente
 * `draws[i]` cartas de cada grupo `sizes[i]` numa mão de Σdraws cartas
 * de um baralho com Σsizes cartas.
 */
export function multivariatePmf(sizes: number[], draws: number[]): number {
  const N = sizes.reduce((a, b) => a + b, 0);
  const n = draws.reduce((a, b) => a + b, 0);
  const num = sizes.reduce((acc, s, i) => acc * binom(s, draws[i]), 1);
  return num / binom(N, n);
}

/** P(X ≥ k) para a hipergeométrica simples: k+ sucessos em n cartas de N com K sucessos. */
export function atLeast(N: number, K: number, n: number, k: number): number {
  if (k <= 0) return 1;
  let p = 0;
  for (let x = k; x <= Math.min(n, K); x++) p += (binom(K, x) * binom(N - K, n - x)) / binom(N, n);
  return Math.min(1, p);
}

/** (terrenos, rampa) de uma mão boa — método MustaKotka. Mãos com 4+ terrenos não contam. */
export const GOOD_HANDS: readonly (readonly [number, number])[] = [
  [2, 1],
  [2, 2],
  [3, 0],
  [3, 1],
];

export const LIBRARY_SIZE = 99;
export const HAND_SIZE = 7;
export const DEFAULT_HANDS = 4;

/**
 * p = Σ C(L,l)·C(R,r)·C(O,7−l−r) / C(N,7) sobre as mãos boas,
 * com O = N − L − R (cálculo exato, hipergeométrica multivariada).
 */
export function goodHandProbability(lands: number, ramp: number, N = LIBRARY_SIZE, hand = HAND_SIZE): number {
  const other = N - lands - ramp;
  if (other < 0) return 0;
  return GOOD_HANDS.reduce((p, [l, r]) => p + multivariatePmf([lands, ramp, other], [l, r, hand - l - r]), 0);
}

/** London mulligan: P(ter uma mão boa em até n mãos) = 1 − (1 − p)^n. */
export function withinHands(p: number, hands = DEFAULT_HANDS): number {
  return 1 - Math.pow(1 - p, hands);
}

export type Heatmap = {
  lands: number[];
  ramp: number[];
  /** values[i][j] = P(mão boa em até n mãos) com lands[i] terrenos e ramp[j] rampa */
  values: number[][];
  max: { lands: number; ramp: number; p: number };
};

export function heatmap(
  { landsFrom = 28, landsTo = 45, rampFrom = 0, rampTo = 20, hands = DEFAULT_HANDS, N = LIBRARY_SIZE } = {},
): Heatmap {
  const lands = range(landsFrom, landsTo);
  const ramp = range(rampFrom, rampTo);
  const values = lands.map((L) => ramp.map((R) => withinHands(goodHandProbability(L, R, N), hands)));
  let max = { lands: lands[0], ramp: ramp[0], p: -1 };
  lands.forEach((L, i) => ramp.forEach((R, j) => values[i][j] > max.p && (max = { lands: L, ramp: R, p: values[i][j] })));
  return { lands, ramp, values, max };
}

/** Quantidade de rampa (MV 0–2) que maximiza a probabilidade para L terrenos. */
export function bestRampFor(lands: number, { rampFrom = 0, rampTo = 20, hands = DEFAULT_HANDS, N = LIBRARY_SIZE } = {}) {
  let best = { ramp: rampFrom, p: -1 };
  for (const R of range(rampFrom, rampTo)) {
    const p = withinHands(goodHandProbability(lands, R, N), hands);
    if (p > best.p) best = { ramp: R, p };
  }
  return best;
}

function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}
