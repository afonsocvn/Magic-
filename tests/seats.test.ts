import { describe, expect, it } from "vitest";
import { atLeast } from "@/lib/math/hypergeometric";
import { sourcesNeeded, swapsForCmc } from "@/lib/math/improvements";
import { analyseAllSeats, globalStep, interactionNeeded, type DeckProfile } from "@/lib/math/seats";
import { seatAdvice } from "@/lib/math/seatAdvice";
import { defaultContext } from "@/lib/math/table";

const profile: DeckProfile = { N: 99, lands: 36, cheapRamp: 10, rampCost: 2, interaction: 8, commanderMv: 4 };

describe("lugares na mesa", () => {
  it("momento global de cada turno", () => {
    expect(globalStep(4, 1, 1)).toBe(1);
    expect(globalStep(4, 4, 1)).toBe(4);
    expect(globalStep(4, 2, 3)).toBe(10);
  });

  it("4 jogadores: o 4.º lugar enfrenta a 1.ª ameaça com menos turnos jogados que o 1.º", () => {
    const seats = analyseAllSeats(profile, defaultContext(4));
    // ameaça = turno 3 do adversário. Lugar 1: a do lugar 2 (momento 10) chega após 3 turnos teus.
    expect(seats[0].firstThreat).toMatchObject({ opponentSeat: 2, yourTurnsBefore: 3 });
    // Lugar 4: a do lugar 1 (momento 9) chega após 2 turnos teus.
    expect(seats[3].firstThreat).toMatchObject({ opponentSeat: 1, yourTurnsBefore: 2 });
    expect(seats[3].firstThreat!.interactionProbability).toBeLessThan(seats[0].firstThreat!.interactionProbability);
    // em multiplayer todos compram no T1: o desenvolvimento é igual em todos os lugares
    expect(seats[0].development[3].expected).toBeCloseTo(seats[3].development[3].expected, 12);
  });

  it("1 vs 1: quem começa não compra e desenvolve-se (um pouco) pior", () => {
    const [first, second] = analyseAllSeats(profile, defaultContext(2));
    expect(first.drawsFirstTurn).toBe(false);
    expect(second.development[2].allLandDrops).toBeGreaterThan(first.development[2].allLandDrops);
  });

  it("interação necessária para 70 %", () => {
    const extra = interactionNeeded(99, 8, 9, 0.7)!;
    expect(atLeast(99, 8 + extra, 9, 1)).toBeGreaterThanOrEqual(0.7);
    expect(atLeast(99, 8 + extra - 1, 9, 1)).toBeLessThan(0.7);
  });
});

describe("texto do lugar", () => {
  it("1.º de 4 vs último de 4", () => {
    const ctx1 = defaultContext(4, 1);
    const ctx4 = defaultContext(4, 4);
    const a1 = seatAdvice(profile, ctx1, analyseAllSeats(profile, ctx1), 0.42);
    const a4 = seatAdvice(profile, ctx4, analyseAllSeats(profile, ctx4), 0.42);
    expect(a1.facts[0]).toContain("jogam 0 turnos");
    expect(a4.facts[0]).toContain("jogam 3 turnos; até ao teu turno 3, 9");
    expect(a1.howToPlay[0]).toContain("Jogas primeiro");
    expect(a4.howToPlay[0]).toContain("Jogas por último");
    expect(a4.howToPlay.some((t) => t.includes("mulligan é grátis"))).toBe(true);
  });
  it("1 vs 1 sem compra no T1 explica o custo da carta a menos", () => {
    const ctx = defaultContext(2, 1);
    const a = seatAdvice(profile, ctx, analyseAllSeats(profile, ctx), 0.42);
    expect(a.howToPlay.join(" ")).toContain("carta a menos");
    expect(a.howToPlay.join(" ")).toContain("cada mulligan custa uma carta");
  });
});

describe("onde melhorar: contas auxiliares", () => {
  it("fontes de cor necessárias para 90 %", () => {
    const c = { color: "R" as const, landSources: 12, rampSources: 1, sources: 13, totalPips: 3, hardest: { name: "X", pips: 3, turn: 3, cardsSeen: 10, probability: atLeast(99, 13, 10, 3) } };
    const k = sourcesNeeded(99, c)!;
    expect(atLeast(99, 13 + k, 10, 3)).toBeGreaterThanOrEqual(0.9);
    expect(atLeast(99, 13 + k - 1, 10, 3)).toBeLessThan(0.9);
  });
  it("trocas para baixar o CMC médio a 3,0", () => {
    expect(swapsForCmc([1, 2, 3, 8, 8, 8])).toBe(3); // 30/6=5 → 25/6 → 20/6=3,33 → 15/6=2,5
    expect(swapsForCmc([2, 3, 3])).toBe(0);
  });
});
