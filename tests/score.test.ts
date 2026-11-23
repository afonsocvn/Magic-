import { describe, expect, it } from "vitest";
import { computeScore } from "@/lib/math/score";
import { templateRowScore, templateStatus } from "@/lib/math/templates";
import { evaluateDeck } from "@/lib/math/evaluate";
import { defaultContext } from "@/lib/math/table";
import type { EvalCard } from "@/lib/math/mana";

describe("semáforo", () => {
  it("terrenos por diferença absoluta", () => {
    expect([38, 37, 35, 33].map((h) => templateStatus("land", h, 38))).toEqual(["ok", "ok", "warn", "bad"]);
  });
  it("restantes por percentagem do alvo", () => {
    expect([12, 9, 8].map((h) => templateStatus("draw", h, 12))).toEqual(["ok", "warn", "bad"]);
  });
});

describe("nota", () => {
  const perfect = {
    template: [{ key: "land", label: "Terrenos", have: 38, target: 38, score: templateRowScore("land", 38, 38) }],
    lands: 38, karsten: 38, worstColorProbability: 0.95, avgCmc: 2.8, tappedAlways: 2,
    handProbability: 0.891, bestHandProbability: 0.891,
  };
  it("deck perfeito = 100, partes somam o total", () => {
    const s = computeScore(perfect);
    expect(s.total).toBe(100);
    expect(s.parts.reduce((a, p) => a + p.max, 0)).toBe(100);
  });
  it("cada parcela penaliza como descrito", () => {
    const s = computeScore({ ...perfect, lands: 33, avgCmc: 3.75, tappedAlways: 6, worstColorProbability: 0.45 });
    const pts = Object.fromEntries(s.parts.map((p) => [p.key, p.points]));
    expect(pts.karsten).toBe(0);
    expect(pts.curve).toBe(2.5);
    expect(pts.tapped).toBe(2);
    expect(pts.colors).toBe(5);
  });
});

describe("evaluateDeck", () => {
  const c = (name: string, over: Partial<EvalCard>): EvalCard => ({
    name, quantity: 1, cmc: 2, manaCost: "{1}{G}", typeLine: "Creature", oracleText: "", producedMana: "", categories: [], ...over,
  });
  const deck: EvalCard[] = [
    c("Forest", { quantity: 36, cmc: 0, manaCost: null, typeLine: "Basic Land — Forest", producedMana: "G", categories: ["land"] }),
    ...Array.from({ length: 12 }, (_, i) => c(`Rock ${i}`, { cmc: 2, producedMana: "G", categories: ["ramp"] })),
    c("Cultivate", { cmc: 3, categories: ["ramp"] }),
    ...Array.from({ length: 50 }, (_, i) => c(`Spell ${i}`, { cmc: 3 })),
  ];
  it("36 terrenos + 12 rampa barata = 89,1 % e melhor rampa 12", () => {
    const e = evaluateDeck({ deck, commander: null, identity: "G", context: defaultContext(4) });
    expect(e.lands).toBe(36);
    expect(e.cheapRamp.count).toBe(12);
    expect(e.byCategory.ramp.count).toBe(13);
    expect(Math.round(e.hand.withinN * 1000) / 10).toBe(89.1);
    expect(e.hand.bestRamp.ramp).toBe(12);
    expect(e.hand.byHands.map((h) => h.cardsKept)).toEqual([7, 7, 6, 5]);
    expect(e.curve.reduce((a, b) => a + b, 0)).toBe(63);
  });
});
