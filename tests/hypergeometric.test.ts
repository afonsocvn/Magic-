import { describe, expect, it } from "vitest";
import {
  atLeast,
  bestRampFor,
  binom,
  goodHandProbability,
  heatmap,
  multivariatePmf,
  withinHands,
} from "@/lib/math/hypergeometric";

const pct = (x: number) => Math.round(x * 1000) / 10;
const p4 = (L: number, R: number) => pct(withinHands(goodHandProbability(L, R), 4));

describe("combinatória", () => {
  it("binom", () => {
    expect(binom(99, 7)).toBe(14887031544);
    expect(binom(5, 0)).toBe(1);
    expect(binom(3, 5)).toBe(0);
  });
  it("a multivariada soma 1 sobre todas as mãos", () => {
    let s = 0;
    for (let l = 0; l <= 7; l++) for (let r = 0; r <= 7 - l; r++) s += multivariatePmf([36, 12, 51], [l, r, 7 - l - r]);
    expect(s).toBeCloseTo(1, 12);
  });
  it("NÃO é o produto de duas hipergeométricas simples (36/12: 89,1 % vs 86,9 %)", () => {
    const h = (K: number, k: number) => (binom(K, k) * binom(99 - K, 7 - k)) / binom(99, 7);
    const naive = [[2, 1], [2, 2], [3, 0], [3, 1]].reduce((s, [l, r]) => s + h(36, l) * h(12, r), 0);
    expect(pct(withinHands(naive, 4))).toBe(86.9);
    expect(p4(36, 12)).toBe(89.1);
  });
  it("atLeast", () => {
    expect(atLeast(99, 36, 7, 0)).toBe(1);
    expect(atLeast(10, 10, 3, 3)).toBeCloseTo(1, 12);
    expect(atLeast(99, 36, 7, 1)).toBeCloseTo(1 - binom(63, 7) / binom(99, 7), 12);
  });
});

describe("mão inicial boa (MustaKotka) — testes obrigatórios, n = 4", () => {
  it("36/12 → 89,1 % (máximo)", () => {
    expect(p4(36, 12)).toBe(89.1);
    const h = heatmap();
    expect([h.max.lands, h.max.ramp, pct(h.max.p)]).toEqual([36, 12, 89.1]);
  });
  it("35/9 → 88,2 %", () => expect(p4(35, 9)).toBe(88.2));
  it("38/11 → 88,9 %", () => expect(p4(38, 11)).toBe(88.9));
  it("38/12 → 88,9 %", () => expect(p4(38, 12)).toBe(88.9));
  it("31/16 → 87,6 %", () => expect(p4(31, 16)).toBe(87.6));
  it("36/12 com 1, 2, 3 mãos → 42,5 %, 66,9 %, 81,0 %", () => {
    const p = goodHandProbability(36, 12);
    expect([1, 2, 3].map((n) => pct(withinHands(p, n)))).toEqual([42.5, 66.9, 81.0]);
  });
});

describe("heatmap e melhor rampa", () => {
  it("dimensões 28–45 × 0–20", () => {
    const h = heatmap();
    expect(h.lands).toHaveLength(18);
    expect(h.ramp).toHaveLength(21);
    expect(h.values[0]).toHaveLength(21);
  });
  it("melhor rampa para 36 terrenos é 12", () => {
    expect(bestRampFor(36).ramp).toBe(12);
  });
  it("mais terrenos → menos rampa ideal", () => {
    expect(bestRampFor(42).ramp).toBeLessThan(bestRampFor(32).ramp);
  });
});
