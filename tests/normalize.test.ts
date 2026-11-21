import { describe, expect, it } from "vitest";
import { colorsToString, isSubsetIdentity, normalizeName } from "@/lib/cards/normalize";

describe("normalizeName", () => {
  it("remove acentos e uniformiza apóstrofos", () => {
    expect(normalizeName("Lim-Dûl’s Vault")).toBe("lim-dul's vault");
  });
  it("uniformiza o separador de faces", () => {
    expect(normalizeName("Fire/Ice")).toBe("fire // ice");
    expect(normalizeName("Fire  //Ice")).toBe("fire // ice");
  });
  it("colapsa espaços e ignora maiúsculas", () => {
    expect(normalizeName("  SOL   ring ")).toBe("sol ring");
  });
});

describe("cores", () => {
  it("ordena em WUBRG", () => {
    expect(colorsToString(["G", "W", "U"])).toBe("WUG");
    expect(colorsToString([])).toBe("");
  });
  it("identidade contida", () => {
    expect(isSubsetIdentity("", "WU")).toBe(true);
    expect(isSubsetIdentity("U", "WU")).toBe(true);
    expect(isSubsetIdentity("B", "WU")).toBe(false);
  });
});
