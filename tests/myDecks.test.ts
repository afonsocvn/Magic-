import { describe, expect, it } from "vitest";
import { compareOrder, type SavedDeck } from "@/lib/myDecks";

const d = (id: string, createdAt: string, baseId?: string): SavedDeck => ({ id, commander: "X", identity: "G", createdAt, savedAt: "2026-11-24T12:00:00Z", baseId });

describe("compareOrder", () => {
  it("a versão feita a partir da outra é a nova", () => {
    const base = d("a", "2026-11-24T10:00:00Z");
    const nova = d("b", "2026-11-20T10:00:00Z", "a");
    expect(compareOrder(nova, base).map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("sem relação: a guardada primeiro é a base", () => {
    expect(compareOrder(d("b", "2026-11-24T10:00:00Z"), d("a", "2026-11-23T10:00:00Z")).map((x) => x.id)).toEqual(["a", "b"]);
  });
});
