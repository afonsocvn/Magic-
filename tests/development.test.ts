import { describe, expect, it } from "vitest";
import { atLeastMana, manaDevelopment } from "@/lib/math/development";
import { atLeast } from "@/lib/math/hypergeometric";

/**
 * Força bruta: percorre todas as ordens distintas de um baralho pequeno
 * (multiconjunto L/R/O) e aplica as mesmas regras à mão. Prova que a
 * programação dinâmica é exata.
 */
function bruteForce(L: number, R: number, O: number, turns: number, rampCost: number, drawFirst: boolean) {
  const N = L + R + O;
  const results: { mana: number[]; drops: boolean[]; weight: number }[] = [];
  const deck: string[] = [];
  const rec = (l: number, r: number, o: number) => {
    if (deck.length === N) {
      let lp = 0, rp = 0, ok = true, drawn = 7;
      const mana: number[] = [], drops: boolean[] = [];
      for (let t = 1; t <= turns; t++) {
        if (t > 1 || drawFirst) drawn++;
        const seen = deck.slice(0, drawn);
        const dl = seen.filter((c) => c === "L").length;
        const dr = seen.filter((c) => c === "R").length;
        if (dl > lp) lp++;
        else ok = false;
        const m = lp + rp;
        mana.push(m);
        drops.push(ok);
        rp += Math.min(dr - rp, Math.floor(m / rampCost));
      }
      results.push({ mana, drops, weight: 1 });
      return;
    }
    if (l) { deck.push("L"); rec(l - 1, r, o); deck.pop(); }
    if (r) { deck.push("R"); rec(l, r - 1, o); deck.pop(); }
    if (o) { deck.push("O"); rec(l, r, o - 1); deck.pop(); }
  };
  rec(L, R, O);
  const total = results.length;
  return Array.from({ length: turns }, (_, t) => ({
    expected: results.reduce((s, x) => s + x.mana[t], 0) / total,
    allLandDrops: results.filter((x) => x.drops[t]).length / total,
    atLeast: (m: number) => results.filter((x) => x.mana[t] >= m).length / total,
  }));
}

describe("desenvolvimento de mana (programação dinâmica)", () => {
  for (const [L, R, O, cost, drawFirst] of [
    [5, 3, 6, 2, true],
    [4, 4, 5, 1, false],
    [6, 0, 7, 2, true],
  ] as const) {
    it(`igual à força bruta: ${L} terrenos, ${R} rampa, ${O} resto, custo ${cost}, ${drawFirst ? "compra" : "não compra"} no T1`, () => {
      const turns = Math.min(5, L + R + O - 7);
      const dp = manaDevelopment({ N: L + R + O, lands: L, ramp: R, rampCost: cost, drawFirstTurn: drawFirst, turns });
      const bf = bruteForce(L, R, O, turns, cost, drawFirst);
      dp.forEach((d, t) => {
        expect(d.expected).toBeCloseTo(bf[t].expected, 12);
        expect(d.allLandDrops).toBeCloseTo(bf[t].allLandDrops, 12);
        for (let m = 0; m <= 6; m++) expect(atLeastMana(d, m)).toBeCloseTo(bf[t].atLeast(m), 12);
        expect(d.dist.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      });
    });
  }

  it("sem rampa, turno 1: P(1 de mana) = P(≥ 1 terreno nas cartas vistas)", () => {
    const [t1] = manaDevelopment({ N: 99, lands: 36, ramp: 0, rampCost: 2, drawFirstTurn: false, turns: 1 });
    expect(atLeastMana(t1, 1)).toBeCloseTo(atLeast(99, 36, 7, 1), 12);
  });

  it("rampa acelera: mais mana esperada no turno 4 com 12 rampas do que com 0", () => {
    const base = { N: 99, lands: 36, rampCost: 2, drawFirstTurn: true, turns: 4 };
    const noRamp = manaDevelopment({ ...base, ramp: 0 })[3].expected;
    const withRamp = manaDevelopment({ ...base, ramp: 12 })[3].expected;
    expect(withRamp).toBeGreaterThan(noRamp + 0.3);
  });

  it("comprar no 1.º turno ajuda", () => {
    const base = { N: 99, lands: 36, ramp: 10, rampCost: 2, turns: 3 };
    const a = manaDevelopment({ ...base, drawFirstTurn: false })[2];
    const b = manaDevelopment({ ...base, drawFirstTurn: true })[2];
    expect(b.allLandDrops).toBeGreaterThan(a.allLandDrops);
  });
});
