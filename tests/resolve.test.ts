import { describe, expect, it } from "vitest";
import type { Card } from "@prisma/client";
import { pickBestCard } from "@/lib/cards/resolve";

const c = (name: string, over: Partial<Card> = {}) =>
  ({ id: name, name, commanderLegality: "legal", source: "bulk", ...over }) as Card;

describe("pickBestCard", () => {
  it("prefere o nome completo exato a uma face de outra carta", () => {
    const cards = [c("Emeritus of Truce // Swords to Plowshares"), c("Swords to Plowshares")];
    expect(pickBestCard(cards, "swords to plowshares")?.name).toBe("Swords to Plowshares");
  });
  it("aceita o nome da face quando é a única opção", () => {
    expect(pickBestCard([c("Delver of Secrets // Insectile Aberration")], "delver of secrets")?.name).toBe(
      "Delver of Secrets // Insectile Aberration",
    );
  });
  it("prefere a versão legal em Commander", () => {
    const cards = [c("Sly Spy", { id: "a", commanderLegality: "not_legal" }), c("Sly Spy", { id: "b" })];
    expect(pickBestCard(cards, "sly spy")?.id).toBe("b");
  });
});
