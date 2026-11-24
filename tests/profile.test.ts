import { describe, expect, it } from "vitest";
import type { EvalCard } from "@/lib/math/mana";
import { colorBalance, composition, compositionPoint, manaScore, playstylePoint, radarAxes, speedScore } from "@/lib/math/profile";
import { computeScore } from "@/lib/math/score";

const c = (name: string, quantity: number, categories: string[], typeLine = "Instant", cmc = 2): EvalCard => ({
  name, quantity, cmc, manaCost: null, typeLine, oracleText: "", producedMana: "", categories,
});

const deck: EvalCard[] = [
  c("Forest", 36, ["land"], "Basic Land — Forest", 0),
  c("Rock", 10, ["ramp"], "Artifact"),
  c("Draw", 6, ["draw"], "Sorcery"),
  c("Kill", 12, ["removal"], "Instant"),
  c("Wrath", 3, ["wipe"], "Sorcery", 4),
  c("Beast", 32, [], "Creature — Beast", 4),
];

const score = computeScore({
  template: [{ key: "land", label: "Terrenos", have: 36, target: 36, score: 1 }],
  lands: 36, karsten: 36, worstColorProbability: 0.9, avgCmc: 3, tappedAlways: 0, handProbability: 0.891, bestHandProbability: 0.891,
});

describe("radar 0–10", () => {
  const axes = Object.fromEntries(radarAxes(deck, score, { avgCmc: 3, expectedManaT4: 4 }).map((a) => [a.key, a.value]));
  it("contagens vs. referência", () => {
    expect(axes.ramp).toBe(10);
    expect(axes.draw).toBe(5); // 6 de 12
    expect(axes.interaction).toBe(10);
    expect(axes.wipe).toBe(5); // 3 de 6
    expect(axes.protection).toBe(0);
  });
  it("mana = parcelas de mana + mão inicial", () => {
    expect(axes.mana).toBe(10);
    expect(manaScore(score)).toBe(10);
  });
  it("velocidade", () => {
    expect(speedScore({ avgCmc: 2.5, expectedManaT4: 5 })).toBe(10);
    expect(speedScore({ avgCmc: 4.5, expectedManaT4: 3 })).toBe(0);
    expect(speedScore({ avgCmc: 3.5, expectedManaT4: 4 })).toBe(5);
  });
});

describe("quadrantes", () => {
  it("estilo: interação 15/63 ≈ 24 % fica perto do centro; velocidade 5 = centro", () => {
    const p = playstylePoint(deck, 5);
    expect(p.x).toBe(0);
    expect(p.y).toBeCloseTo((15 / 63 - 0.25) / 0.15, 2);
  });
  it("composição: 32/63 criaturas ≈ 51 % → à direita do centro", () => {
    const p = compositionPoint(deck, 10);
    expect(p.x).toBeCloseTo((32 / 63 - 0.4) / 0.3, 2);
    expect(p.y).toBe(1);
  });
  it("limites em ±1", () => {
    const allCreatures = [c("Beast", 60, [], "Creature"), c("Forest", 39, ["land"], "Basic Land")];
    expect(compositionPoint(allCreatures, 0)).toMatchObject({ x: 1, y: -1 });
    expect(playstylePoint(allCreatures, 0).y).toBe(-1);
  });
});

describe("composição e cores", () => {
  it("conta por tipo, terrenos à parte", () => {
    expect(composition(deck)).toEqual([
      { key: "creature", label: "Criaturas", count: 32 },
      { key: "instant", label: "Instants", count: 12 },
      { key: "sorcery", label: "Sorceries", count: 9 },
      { key: "artifact", label: "Artefactos", count: 10 },
      { key: "land", label: "Terrenos", count: 36 },
    ]);
  });
  it("percentagens de símbolos vs. fontes", () => {
    const b = colorBalance([
      { color: "U", landSources: 15, rampSources: 0, sources: 15, totalPips: 10, hardest: null },
      { color: "W", landSources: 15, rampSources: 0, sources: 15, totalPips: 30, hardest: null },
    ]);
    expect(b.map((x) => [x.color, x.pipShare, x.sourceShare])).toEqual([
      ["W", 0.75, 0.5],
      ["U", 0.25, 0.5],
    ]);
  });
});
