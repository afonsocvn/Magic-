import { describe, expect, it } from "vitest";
import { canBeCommander, maxCopies, validateDeck, type ResolvedEntry, type ValidationCard, type ValidationInput } from "@/lib/deck/validate";
import type { DeckEntry } from "@/lib/deck/types";

let line = 0;
function card(name: string, over: Partial<ValidationCard> = {}): ValidationCard {
  return { id: name, name, typeLine: "Instant", oracleText: "", colorIdentity: "", commanderLegality: "legal", ...over };
}
function entry(c: ValidationCard, quantity = 1, section: DeckEntry["section"] = "main"): ResolvedEntry {
  return { entry: { quantity, name: c.name, line: ++line, section }, card: c };
}

const atraxa = card("Atraxa, Praetors' Voice", { typeLine: "Legendary Creature — Phyrexian Angel Horror", colorIdentity: "WUBG" });
const forest = card("Forest", { typeLine: "Basic Land — Forest", colorIdentity: "G" });

/** Deck legal: Atraxa + 60 cartas diferentes + 39 Forest. */
function legalDeck(): ValidationInput {
  const main = Array.from({ length: 60 }, (_, i) => entry(card(`Spell ${i}`, { colorIdentity: i % 2 ? "U" : "" })));
  main.push(entry(forest, 39));
  return { hasCommanderSection: true, commander: [entry(atraxa, 1, "commander")], main, notFound: [], ignored: [], unparsed: [] };
}

const codes = (input: ValidationInput) => validateDeck(input).errors.map((e) => e.code);

describe("validateDeck", () => {
  it("deck legal passa", () => {
    const r = validateDeck(legalDeck());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.totalCards).toBe(100);
    expect(r.commanderIdentity).toBe("WUBG");
  });

  it("102 cartas → mensagem clara", () => {
    const d = legalDeck();
    d.main.push(entry(card("Extra A")), entry(card("Extra B")));
    const r = validateDeck(d);
    expect(r.errors.find((e) => e.code === "deck_size")?.message).toBe(
      "O deck tem 102 cartas (deve ter exatamente 100, contando o comandante): sobram 2.",
    );
  });

  it("99 cartas → faltam", () => {
    const d = legalDeck();
    d.main.pop();
    d.main.push(entry(forest, 38));
    expect(validateDeck(d).errors[0].message).toContain("faltam 1");
  });

  it("singleton: duplicados dão erro, básicos não", () => {
    const d = legalDeck();
    d.main.pop();
    d.main.push(entry(forest, 37), entry(card("Spell 0"), 1), entry(card("Spell 1", { colorIdentity: "U" }), 1));
    const r = validateDeck(d);
    expect(r.errors.find((e) => e.code === "singleton")?.cards).toEqual(["Spell 0 ×2", "Spell 1 ×2"]);
  });

  it("exceções: Relentless Rats e Seven Dwarves", () => {
    expect(maxCopies(card("Relentless Rats", { oracleText: "A deck can have any number of cards named Relentless Rats." }))).toBe(Infinity);
    expect(maxCopies(card("Seven Dwarves", { oracleText: "A deck can have up to seven cards named Seven Dwarves." }))).toBe(7);
    expect(maxCopies(card("Snow-Covered Island", { typeLine: "Basic Snow Land — Island" }))).toBe(Infinity);
  });

  it("identidade de cor", () => {
    const d = legalDeck();
    d.main.pop();
    d.main.push(entry(forest, 38), entry(card("Lightning Bolt", { colorIdentity: "R" })));
    const err = validateDeck(d).errors.find((e) => e.code === "color_identity")!;
    expect(err.message).toContain("Atraxa");
    expect(err.cards).toEqual(["Lightning Bolt (vermelho)"]);
  });

  it("banidas e não legais", () => {
    const d = legalDeck();
    d.main.pop();
    d.main.push(entry(forest, 37), entry(card("Mana Crypt", { commanderLegality: "banned" })), entry(card("Goblin Token Maker", { commanderLegality: "not_legal" })));
    expect(codes(d)).toEqual(["banned", "not_legal"]);
  });

  it("sem secção de comandante", () => {
    const d = legalDeck();
    d.hasCommanderSection = false;
    d.main.push(d.commander[0]);
    d.commander = [];
    expect(codes(d)).toContain("no_commander_section");
  });

  it("dois comandantes ainda não são suportados", () => {
    const d = legalDeck();
    d.commander.push(entry(card("Tymna the Weaver", { typeLine: "Legendary Creature — Human Cleric", colorIdentity: "WB" }), 1, "commander"));
    d.main.pop();
    d.main.push(entry(forest, 38));
    expect(codes(d)).toEqual(["multiple_commanders"]);
  });

  it("comandante tem de ser criatura lendária (ou dizê-lo no texto)", () => {
    expect(canBeCommander(card("Sol Ring", { typeLine: "Artifact" }))).toBe(false);
    expect(canBeCommander(card("Grist", { typeLine: "Legendary Planeswalker — Grist", oracleText: "Grist, the Hunger Tide can be your commander." }))).toBe(true);
    expect(canBeCommander(atraxa)).toBe(true);
  });

  it("cartas não encontradas e linhas ilegíveis", () => {
    const d = legalDeck();
    d.main.pop();
    d.main.push(entry(forest, 38));
    d.notFound = [{ quantity: 1, name: "Sol Rnig", line: 7, section: "main" }];
    d.unparsed = [{ line: 3, text: "???" }];
    const r = validateDeck(d);
    expect(r.errors.map((e) => e.code)).toEqual(["unparsed", "not_found"]);
    expect(r.errors[1].cards).toEqual(["Sol Rnig (linha 7)"]);
    expect(r.totalCards).toBe(100);
  });

  it("aviso para secções ignoradas", () => {
    const d = legalDeck();
    d.ignored = [{ quantity: 2, name: "Counterspell", line: 99, section: "ignored", sectionLabel: "Sideboard" }];
    expect(validateDeck(d).warnings[0].message).toBe("2 cartas ignoradas (secção Sideboard).");
  });
});
