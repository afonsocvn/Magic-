import { describe, expect, it } from "vitest";
import { cardsKept, cardsSeen, defaultContext, drawsOnFirstTurn, landDropProbability, opponentTurnsBefore } from "@/lib/math/table";
import { atLeast } from "@/lib/math/hypergeometric";

describe("contexto de mesa", () => {
  it("regras por omissão: 1vs1 vs multiplayer", () => {
    expect(defaultContext(2)).toMatchObject({ firstPlayerDraws: false, freeMulligan: false });
    expect(defaultContext(4)).toMatchObject({ firstPlayerDraws: true, freeMulligan: true });
    expect(defaultContext(3, 9).seat).toBe(3);
  });

  it("cartas vistas até ao turno t, por lugar", () => {
    expect(cardsSeen(defaultContext(2, 1), 1)).toBe(7); // quem começa em 1vs1 não compra
    expect(cardsSeen(defaultContext(2, 2), 1)).toBe(8);
    expect(cardsSeen(defaultContext(4, 1), 1)).toBe(8); // multiplayer: todos compram
    expect(cardsSeen(defaultContext(4, 3), 4)).toBe(11);
    expect(drawsOnFirstTurn({ ...defaultContext(4, 1), firstPlayerDraws: false })).toBe(false);
  });

  it("mulligan grátis muda o nº de cartas com que se fica", () => {
    expect([1, 2, 3, 4].map((h) => cardsKept(defaultContext(4), h))).toEqual([7, 7, 6, 5]);
    expect([1, 2, 3, 4].map((h) => cardsKept(defaultContext(2), h))).toEqual([7, 6, 5, 4]);
  });

  it("turnos dos adversários antes do meu turno t", () => {
    expect(opponentTurnsBefore(defaultContext(4, 1), 1)).toBe(0);
    expect(opponentTurnsBefore(defaultContext(4, 4), 1)).toBe(3);
    expect(opponentTurnsBefore(defaultContext(4, 1), 2)).toBe(3);
    expect(opponentTurnsBefore(defaultContext(2, 2), 3)).toBe(3);
  });

  it("jogadas de terreno: quem compra no 1º turno tem vantagem", () => {
    const first = landDropProbability(defaultContext(2, 1), 36, 3);
    const second = landDropProbability(defaultContext(2, 2), 36, 3);
    expect(first).toBeCloseTo(atLeast(99, 36, 9, 3), 12);
    expect(second).toBeGreaterThan(first);
  });
});
