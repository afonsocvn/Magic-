import { describe, expect, it } from "vitest";
import { addPrinting } from "@/lib/scryfall/prices";
import type { ScryfallCard } from "@/lib/scryfall/types";

const print = (prices: Record<string, string | null>) => ({ prices }) as unknown as ScryfallCard;

describe("addPrinting", () => {
  it("fica com o mais barato em cada moeda", () => {
    let acc = addPrinting(undefined, print({ eur: "0.50", usd: null }));
    acc = addPrinting(acc, print({ eur: "0.10", usd: "0.30" }));
    acc = addPrinting(acc, print({ eur: null, usd: "0.20" }));
    expect(acc).toEqual({ eur: 10, usd: 20 });
  });
  it("usa foil só quando não há preço normal", () => {
    expect(addPrinting(undefined, print({ eur: null, eur_foil: "2.00", usd: "1.00", usd_foil: "0.50" }))).toEqual({ eur: 200, usd: 100 });
  });
  it("sem preços fica null", () => {
    expect(addPrinting(undefined, print({}))).toEqual({ eur: null, usd: null });
  });
});
