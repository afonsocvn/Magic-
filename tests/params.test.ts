import { describe, expect, it } from "vitest";
import { parseEvalParams } from "@/lib/deck/params";

describe("parseEvalParams", () => {
  it("valores por omissão", () => {
    expect(parseEvalParams({})).toEqual({
      currency: "eur", template: "cz", hands: 4,
      context: { players: 4, seat: 1, firstPlayerDraws: true, freeMulligan: true },
    });
  });
  it("1vs1 segue as regras, mas as regras da casa ganham", () => {
    expect(parseEvalParams({ j: "2", l: "2" }).context).toEqual({ players: 2, seat: 2, firstPlayerDraws: false, freeMulligan: false });
    expect(parseEvalParams({ j: "2", mg: "1" }).context.freeMulligan).toBe(true);
  });
  it("ignora valores inválidos", () => {
    const p = parseEvalParams({ j: "9", l: "7", n: "0", t: "x", moeda: "gbp" });
    expect(p.context.players).toBe(4);
    expect(p.context.seat).toBe(4);
    expect([p.hands, p.template, p.currency]).toEqual([4, "cz", "eur"]);
  });
});
