import { describe, expect, it } from "vitest";
import { averageCmc, colorRequirements, karstenLands, landColors, manaCurve, tappedLands, type EvalCard } from "@/lib/math/mana";
import { atLeast } from "@/lib/math/hypergeometric";
import { defaultContext } from "@/lib/math/table";

const card = (name: string, over: Partial<EvalCard> = {}): EvalCard => ({
  name, quantity: 1, cmc: 0, manaCost: null, typeLine: "Instant", oracleText: "", producedMana: "", categories: [], ...over,
});
const land = (name: string, over: Partial<EvalCard> = {}) => card(name, { typeLine: "Land", categories: ["land"], ...over });

describe("curva e CMC", () => {
  const deck = [card("a", { cmc: 1 }), card("b", { cmc: 3, quantity: 2 }), card("c", { cmc: 9 }), land("Forest", { quantity: 10 })];
  it("curva sem terrenos, 7+ junto", () => {
    expect(manaCurve(deck)).toEqual([0, 1, 0, 2, 0, 0, 0, 1]);
  });
  it("CMC médio ponderado sem terrenos", () => {
    expect(averageCmc(deck)).toBeCloseTo((1 + 6 + 9) / 4, 12);
  });
  it("Karsten", () => {
    expect(karstenLands(3, 10)).toBeCloseTo(31.42 + 9.39 - 2.8, 10);
  });
});

describe("terrenos tapped", () => {
  it("sempre vs. condicional", () => {
    const r = tappedLands([
      land("Azorius Guildgate", { oracleText: "This land enters tapped.\n{T}: Add {W} or {U}." }),
      land("Hallowed Fountain", { oracleText: "As this land enters, you may pay 2 life. If you don't, it enters tapped." }),
      land("Glacial Fortress", { oracleText: "This land enters tapped unless you control a Plains or an Island." }),
      land("Command Tower", { oracleText: "{T}: Add one mana of any color in your commander's color identity." }),
      land("Emeria's Call // Emeria", {
        faces: [
          { typeLine: "Sorcery", oracleText: "Create two 4/4…", manaCost: "{4}{W}{W}{W}" },
          { typeLine: "Land", oracleText: "As this land enters, you may pay 3 life. If you don't, it enters tapped.", manaCost: null },
        ],
      }),
    ]);
    expect(r.always).toEqual(["Azorius Guildgate"]);
    expect(r.conditional).toEqual(["Hallowed Fountain", "Glacial Fortress", "Emeria's Call // Emeria"]);
  });
});

describe("fontes de cor", () => {
  it("fetches contam como fontes das cores que procuram", () => {
    expect(landColors(land("Evolving Wilds", { oracleText: "Search your library for a basic land card, put it onto the battlefield tapped" }), "WUG")).toBe("WUG");
    expect(landColors(land("Flooded Strand", { oracleText: "Search your library for a Plains or Island card" }), "WUBRG")).toBe("WU");
    expect(landColors(land("Command Tower", { producedMana: "WUBRG" }), "UR")).toBe("UR");
  });

  it("RRR no turno 3 com poucas fontes → probabilidade baixa", () => {
    const deck = [
      land("Mountain", { quantity: 12, producedMana: "R" }),
      land("Island", { quantity: 24, producedMana: "U" }),
      card("Fireball", { cmc: 1, manaCost: "{X}{R}", quantity: 1 }),
      card("Cinderhaze Wretch", { cmc: 3, manaCost: "{R}{R}{R}" }),
      card("Talisman of Creativity", { cmc: 2, producedMana: "UR", categories: ["ramp"] }),
    ];
    const ctx = defaultContext(4, 1);
    const [red] = colorRequirements(deck, null, "R", ctx);
    expect(red.landSources).toBe(12);
    expect(red.rampSources).toBe(1);
    expect(red.totalPips).toBe(4);
    expect(red.hardest?.name).toBe("Cinderhaze Wretch");
    expect(red.hardest?.cardsSeen).toBe(10);
    expect(red.hardest?.probability).toBeCloseTo(atLeast(99, 13, 10, 3), 12);
    expect(red.hardest!.probability).toBeLessThan(0.2);
  });
});

describe("cartas com X", () => {
  it("contam um turno mais tarde (X ≥ 1)", () => {
    const deck = [
      land("Forest", { quantity: 36, producedMana: "G" }),
      card("Chord of Calling", { cmc: 3, manaCost: "{X}{G}{G}{G}" }),
    ];
    const [g] = colorRequirements(deck, null, "G", defaultContext(4, 1));
    expect(g.hardest).toMatchObject({ name: "Chord of Calling", pips: 3, turn: 4, cardsSeen: 11 });
  });
});
