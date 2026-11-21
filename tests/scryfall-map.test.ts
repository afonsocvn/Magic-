import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/scryfall-cards.json";
import { isGameCard, isScryfallImageUrl, lookupNames, mapScryfallCard } from "@/lib/scryfall/map";
import type { ScryfallCard } from "@/lib/scryfall/types";

const cards = fixtures as unknown as ScryfallCard[];
const byName = (n: string) => cards.find((c) => c.name === n)!;

describe("mapScryfallCard", () => {
  it("carta normal", () => {
    const c = mapScryfallCard(byName("Sol Ring"));
    expect(c.manaCost).toBe("{1}");
    expect(c.cmc).toBe(1);
    expect(c.colorIdentity).toBe("");
    expect(c.producedMana).toBe("C");
    expect(c.commanderLegality).toBe("legal");
    expect(c.imageUris?.normal).toMatch(/^https:\/\/cards\.scryfall\.io\//);
    expect(c.faces).toBeNull();
    expect(typeof c.priceEurCents === "number" || c.priceEurCents === null).toBe(true);
  });

  it("MDFC guarda as duas faces com imagens e junta o texto", () => {
    const c = mapScryfallCard(byName("Emeria's Call // Emeria, Shattered Skyclave"));
    expect(c.layout).toBe("modal_dfc");
    expect(c.faces).toHaveLength(2);
    expect(c.faces![1].typeLine).toMatch(/Land/);
    expect(c.faces![0].imageUris?.normal).toBeTruthy();
    expect(c.imageUris).toBeNull();
    expect(c.oracleText).toContain("//");
    expect(c.manaCost).toBe("{4}{W}{W}{W}");
  });

  it("split card: custo das duas metades", () => {
    const c = mapScryfallCard(byName("Fire // Ice"));
    expect(c.manaCost).toBe("{1}{R} // {1}{U}");
    expect(c.colorIdentity).toBe("UR");
  });

  it("nomes de pesquisa incluem cada face", () => {
    const c = mapScryfallCard(byName("Delver of Secrets // Insectile Aberration"));
    expect(lookupNames(c)).toEqual([
      "delver of secrets // insectile aberration",
      "delver of secrets",
      "insectile aberration",
    ]);
  });

  it("ignora tokens e art cards", () => {
    expect(cards.filter((c) => !isGameCard(c)).map((c) => c.layout).sort()).toEqual(["art_series", "token"]);
  });

  it("só aceita imagens do Scryfall", () => {
    expect(isScryfallImageUrl("https://cards.scryfall.io/normal/x.jpg")).toBe(true);
    expect(isScryfallImageUrl("https://evil.example/scryfall.io.jpg")).toBe(false);
    expect(isScryfallImageUrl("http://cards.scryfall.io/x.jpg")).toBe(false);
  });
});
