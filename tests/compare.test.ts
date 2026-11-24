import { describe, expect, it } from "vitest";
import { compareMetrics, compareScoreParts, diffDecks } from "@/lib/deck/compare";
import { evaluateDeck } from "@/lib/math/evaluate";
import type { EvalCard } from "@/lib/math/mana";
import { defaultContext } from "@/lib/math/table";

const card = (id: string) => ({ id, name: id });

describe("diffDecks", () => {
  it("saíram e entraram, por quantidade", () => {
    const a = [{ card: card("Forest"), quantity: 30 }, { card: card("Sol Ring"), quantity: 1 }, { card: card("Vigor"), quantity: 1 }];
    const b = [{ card: card("Forest"), quantity: 29 }, { card: card("Sol Ring"), quantity: 1 }, { card: card("Hurricane"), quantity: 1 }, { card: card("Island"), quantity: 1 }];
    const d = diffDecks(a, b);
    expect(d.removed.map((l) => [l.card.name, l.quantity])).toEqual([["Forest", 1], ["Vigor", 1]]);
    expect(d.added.map((l) => [l.card.name, l.quantity])).toEqual([["Hurricane", 1], ["Island", 1]]);
  });
});

describe("compareMetrics", () => {
  const c = (name: string, quantity: number, categories: string[], cmc = 3): EvalCard => ({
    name, quantity, cmc, manaCost: "{2}{G}", typeLine: categories.includes("land") ? "Basic Land" : "Creature", oracleText: "", producedMana: categories.includes("land") ? "G" : "", categories,
  });
  const ev = (deck: EvalCard[]) => evaluateDeck({ deck, commander: null, identity: "G", context: defaultContext(4) });
  const A = ev([c("Forest", 34, ["land"], 0), c("Rock", 8, ["ramp"], 2), c("Kill", 5, ["removal"]), c("Big", 52, [], 6)]);
  const B = ev([c("Forest", 36, ["land"], 0), c("Rock", 10, ["ramp"], 2), c("Kill", 8, ["removal"]), c("Big", 45, [], 6)]);
  const rows = Object.fromEntries(compareMetrics(A, B).map((r) => [r.key, r]));

  it("B (mais rampa, terrenos e remoção, curva mais baixa) melhora", () => {
    expect(rows.interaction).toMatchObject({ a: "5", b: "8", delta: "+3", better: true });
    expect(rows.avgCmc.better).toBe(true);
    expect(rows.hand.better).toBe(true);
    expect(rows.score.better).toBe(true);
    expect(rows.cheapRamp.better).toBeNull();
  });
  it("terrenos: melhor = mais perto de Karsten", () => {
    expect(rows.lands.delta).toBe("+2");
    expect(typeof rows.lands.better).toBe("boolean");
  });
  it("comparar consigo mesmo dá tudo igual", () => {
    expect(compareMetrics(A, A).every((r) => r.delta === "=" && r.better === null)).toBe(true);
    expect(compareScoreParts(A, A).every((p) => p.delta === 0)).toBe(true);
  });
});
