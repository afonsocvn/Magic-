import { describe, expect, it } from "vitest";
import { cardGroup, deckTotal, formatPrice, groupDeck, mergeLines } from "@/lib/deck/groups";
import { parseManaSymbols, splitSymbols, symbolFile } from "@/lib/cards/mana";

type C = { id: string; name: string; cmc: number; typeLine: string; faces: null | { typeLine: string | null }[]; priceEurCents: number | null; priceUsdCents: number | null };
const c = (name: string, typeLine: string, over: Partial<C> = {}): C => ({
  id: name, name, cmc: 0, typeLine, faces: null, priceEurCents: 100, priceUsdCents: 120, ...over,
});

describe("cardGroup", () => {
  it.each([
    ["Legendary Creature — Angel", "creature"],
    ["Artifact Creature — Golem", "creature"],
    ["Artifact Land", "land"],
    ["Basic Land — Forest", "land"],
    ["Legendary Planeswalker — Jace", "planeswalker"],
    ["Instant", "instant"],
    ["Tribal Sorcery — Elf", "sorcery"],
    ["Legendary Artifact", "artifact"],
    ["Enchantment — Aura", "enchantment"],
    ["Battle — Siege", "battle"],
    ["Kindred Enchantment — Elf", "enchantment"],
  ])("%s → %s", (type, group) => {
    expect(cardGroup(c("x", type))).toBe(group);
  });

  it("usa a face da frente (MDFC feitiço // terreno → sorcery)", () => {
    expect(cardGroup(c("Emeria's Call", "Sorcery // Land", { faces: [{ typeLine: "Sorcery" }, { typeLine: "Land" }] }))).toBe("sorcery");
    expect(cardGroup(c("Delver", "Creature — Human // Creature — Insect"))).toBe("creature");
  });
});

describe("groupDeck", () => {
  const lines = [
    { card: c("Forest", "Basic Land — Forest", { priceEurCents: 10 }), quantity: 10 },
    { card: c("Sol Ring", "Artifact", { cmc: 1, priceEurCents: 84 }), quantity: 1 },
    { card: c("Arcane Signet", "Artifact", { cmc: 2, priceEurCents: null }), quantity: 1 },
    { card: c("Llanowar Elves", "Creature — Elf", { cmc: 1 }), quantity: 1 },
  ];

  it("ordem dos grupos, contagens e subtotais", () => {
    const g = groupDeck(lines, "eur");
    expect(g.map((x) => [x.label, x.count, x.totalCents])).toEqual([
      ["Criaturas", 1, 100],
      ["Artefactos", 2, 84],
      ["Terrenos", 10, 100],
    ]);
    expect(g[1].lines.map((l) => l.card.name)).toEqual(["Sol Ring", "Arcane Signet"]);
  });

  it("total e cartas sem preço", () => {
    expect(deckTotal(lines, "eur")).toEqual({ totalCents: 284, missing: 1 });
    expect(deckTotal(lines, "usd")).toEqual({ totalCents: 120 * 10 + 120 * 3, missing: 0 });
  });

  it("junta linhas repetidas", () => {
    const sol = c("Sol Ring", "Artifact");
    expect(mergeLines([{ card: sol, quantity: 1 }, { card: sol, quantity: 1 }])).toEqual([{ card: sol, quantity: 2 }]);
  });
});

describe("formatação", () => {
  it("preço em pt-PT", () => {
    expect(formatPrice(123456, "eur").replace(/\s/g, " ")).toBe("1234,56 €");
    expect(formatPrice(84, "usd")).toContain("0,84");
    expect(formatPrice(null, "eur")).toBe("—");
  });
  it("símbolos de mana", () => {
    expect(parseManaSymbols("{2}{W}{U/P}")).toEqual(["2", "W", "U/P"]);
    expect(symbolFile("W/U")).toBe("WU");
    expect(splitSymbols("{T}: Add {C}{C}.")).toEqual([{ symbol: "T" }, { text: ": Add " }, { symbol: "C" }, { symbol: "C" }, { text: "." }]);
  });
});
