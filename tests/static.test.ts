import { describe, expect, it } from "vitest";
import { decodeDeck, deckKey, encodeDeck } from "@/static/codec";
import { buildDb, staticSource } from "@/static/source";
import type { PackedCard } from "@/static/format";
import { loadDeck } from "@/lib/deck/load";

const text = "// COMMANDER\n1 Omnath, Locus of Mana\n\n1 Sol Ring\n1 Swords to Plowshares\n1 Delver of Secrets\n96 Forest";

describe("codec do link", () => {
  it("ida e volta", () => {
    const code = encodeDeck(text);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeDeck(code)).toBe(text);
  });
  it("lixo devolve null", () => {
    expect(decodeDeck("@@@")).toBeNull();
  });
  it("chave igual à do servidor (sha256 do texto canónico, 16 hex)", async () => {
    const { deckId } = await import("@/lib/deck/serverSource");
    expect(await deckKey(text)).toBe(deckId(text));
  });
});

describe("fonte de cartas estática", () => {
  const P = (scry: string, name: string, extra: Partial<Record<number, unknown>> = {}): PackedCard => {
    const base: PackedCard = [scry, name, "normal", "{1}", 1, "Artifact", "", "", "", "l", 0, 100, 120, 0, null, 0, 1];
    for (const [k, v] of Object.entries(extra)) (base as unknown[])[Number(k)] = v;
    return base;
  };
  const db = buildDb(
    [
      P("aa11", "Omnath, Locus of Mana", { 5: "Legendary Creature — Elemental", 7: "G" }),
      P("bb22", "Sol Ring"),
      P("cc33", "Swords to Plowshares", { 15: [["ramp", 0]] }),
      P("dd44", "Emeritus of Truce // Swords to Plowshares", { 13: [["Emeritus of Truce", "{1}{W}", "Creature", "", 1], ["Swords to Plowshares", "{W}", "Instant", "", 0]] }),
      P("ee55", "Delver of Secrets // Insectile Aberration", { 13: [["Delver of Secrets", "{U}", "Creature", "", 1], ["Insectile Aberration", null, "Creature", "", 2]], 16: 0 }),
      P("ff66", "Forest", { 5: "Basic Land — Forest", 7: "G" }),
    ],
    { exportedAt: "2026-11-24T00:00:00Z", bulkUpdatedAt: null, cards: 6 },
  );

  it("encontra por nome e por face, e prefere o nome exato", async () => {
    const loaded = await loadDeck(staticSource(db), text);
    const names = [...loaded.commander, ...loaded.main].map((r) => r.card.name);
    expect(names).toEqual(["Omnath, Locus of Mana", "Sol Ring", "Swords to Plowshares", "Delver of Secrets // Insectile Aberration", "Forest"]);
    expect(loaded.notFound).toEqual([]);
  });
  it("imagens reconstruídas (frente e verso)", () => {
    const delver = db.cards[4];
    expect(delver.faces![0].imageUris?.normal).toBe("https://cards.scryfall.io/normal/front/e/e/ee55.jpg");
    expect(delver.faces![1].imageUris?.large).toBe("https://cards.scryfall.io/large/back/e/e/ee55.jpg");
  });
  it("correções de categoria vêm no ficheiro", async () => {
    const o = await staticSource(db).overrides(["2"]);
    expect(o).toEqual([{ cardId: "2", category: "ramp", include: false }]);
  });
});
