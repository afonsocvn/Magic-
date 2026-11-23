import { describe, expect, it } from "vitest";
import { classifyCard, isLandCard, type ClassifiableCard } from "@/lib/categories/classify";
import { categoriesFromTags } from "@/lib/categories/tags";

const c = (name: string, over: Partial<ClassifiableCard> = {}): ClassifiableCard => ({
  name, layout: "normal", typeLine: "Instant", oracleText: "", tagCategories: "", ...over,
});
const cats = (card: ClassifiableCard, o = []) => classifyCard(card, o).categories;

describe("terrenos", () => {
  it("MDFC com face de terreno conta como terreno; transform não", () => {
    const mdfc = c("Emeria's Call", { layout: "modal_dfc", typeLine: "Sorcery // Land", faces: [{ typeLine: "Sorcery", oracleText: "" }, { typeLine: "Land", oracleText: "" }] });
    expect(isLandCard(mdfc)).toBe(true);
    const transform = c("Legion's Landing", { layout: "transform", typeLine: "Enchantment // Land", faces: [{ typeLine: "Legendary Enchantment", oracleText: "" }, { typeLine: "Legendary Land", oracleText: "" }] });
    expect(isLandCard(transform)).toBe(false);
  });
  it("terrenos nunca contam como rampa", () => {
    expect(cats(c("Ancient Tomb", { typeLine: "Land", oracleText: "{T}: Add {C}{C}.", tagCategories: "ramp" }))).toEqual(["land"]);
  });
});

describe("regras", () => {
  it("criatura com {T}: Add é rampa mesmo sem tag", () => {
    expect(cats(c("Llanowar Elves", { typeLine: "Creature — Elf Druid", oracleText: "{T}: Add {G}." }))).toEqual(["ramp"]);
  });
  it("procurar terrenos para o campo é rampa, não tutor", () => {
    const cultivate = c("Cultivate", {
      typeLine: "Sorcery",
      oracleText: "Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.",
      tagCategories: "ramp,tutor",
    });
    expect(cats(cultivate)).toEqual(["ramp"]);
  });
  it("Demonic Tutor continua tutor", () => {
    expect(cats(c("Demonic Tutor", { oracleText: "Search your library for a card, put that card into your hand, then shuffle.", tagCategories: "tutor" }))).toEqual(["tutor"]);
  });
  it("wincon por texto", () => {
    expect(cats(c("Thassa's Oracle", { typeLine: "Creature", oracleText: "If X is greater than or equal to the number of cards in your library, you win the game." }))).toContain("wincon");
  });
  it("regras de reserva só para cartas sem tags", () => {
    const text = "Destroy target creature. Draw a card.";
    expect(cats(c("Nova carta", { oracleText: text, tagCategories: null }))).toEqual(["draw", "removal"]);
    expect(cats(c("Carta com tags", { oracleText: text, tagCategories: "removal" }))).toEqual(["removal"]);
  });
});

describe("correções", () => {
  it("têm prioridade sobre tags e regras", () => {
    const path = c("Path to Exile", { oracleText: "Exile target creature. Its controller may search their library for a basic land card, put that card onto the battlefield tapped", tagCategories: "ramp,removal" });
    expect(cats(path)).toEqual(["ramp", "removal"]);
    const r = classifyCard(path, [{ category: "ramp", include: false }, { category: "wincon", include: true }]);
    expect(r.categories).toEqual(["removal", "wincon"]);
    expect(r.sources).toEqual({ removal: "tagger", wincon: "correção" });
  });
});

describe("tags do Scryfall Tagger", () => {
  it("usa descendentes e respeita exclusões", () => {
    const tags = [
      { id: "1", label: "ramp", child_ids: ["2", "3"], taggings: [] },
      { id: "2", label: "mana producer", child_ids: [], taggings: [{ oracle_id: "sol" }] },
      { id: "3", label: "ritual", child_ids: [], taggings: [{ oracle_id: "dark-ritual" }] },
      { id: "4", label: "cycle-xyz", child_ids: [], taggings: [{ oracle_id: "vanilla" }] },
    ];
    const m = categoriesFromTags(tags);
    expect([...m.get("sol")!]).toEqual(["ramp"]);
    expect([...m.get("dark-ritual")!]).toEqual([]);
    expect(m.has("vanilla")).toBe(true);
  });
});
