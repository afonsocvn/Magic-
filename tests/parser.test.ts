import { describe, expect, it } from "vitest";
import { parseCardLine, parseDecklist } from "@/lib/deck/parser";

describe("parseCardLine", () => {
  it("formato completo", () => {
    expect(parseCardLine("1 Sol Ring (TRC) 499")).toEqual({ quantity: 1, name: "Sol Ring", set: "trc", collectorNumber: "499" });
  });
  it("só quantidade e nome", () => {
    expect(parseCardLine("1 Sol Ring")).toEqual({ quantity: 1, name: "Sol Ring" });
    expect(parseCardLine("10x Forest")).toEqual({ quantity: 10, name: "Forest" });
  });
  it("sem quantidade conta 1", () => {
    expect(parseCardLine("Sol Ring")).toEqual({ quantity: 1, name: "Sol Ring" });
  });
  it("nomes com vírgulas, apóstrofos e faces", () => {
    expect(parseCardLine("1 Atraxa, Praetors' Voice (2X2) 190")?.name).toBe("Atraxa, Praetors' Voice");
    expect(parseCardLine("1 Fire // Ice (MH2) 290")?.name).toBe("Fire // Ice");
  });
  it("set só com o código, sem número", () => {
    expect(parseCardLine("1 Sol Ring (CMM)")).toEqual({ quantity: 1, name: "Sol Ring", set: "cmm" });
  });
  it("remove marcas de exportação (foil, categorias)", () => {
    expect(parseCardLine("1 Sol Ring (CMM) 410 *F*")?.name).toBe("Sol Ring");
    expect(parseCardLine("1x Sol Ring (cmm) 410 [Ramp]")?.collectorNumber).toBe("410");
  });
  it("número de coleção com letras", () => {
    expect(parseCardLine("1 Island (UNF) 236a")?.collectorNumber).toBe("236a");
  });
});

describe("parseDecklist", () => {
  const text = `// COMMANDER
1 Atraxa, Praetors' Voice (2X2) 190

// Mainboard
1 Sol Ring (TRC) 499
30 Forest
# comentário

// Sideboard
1 Counterspell`;

  it("separa comandante, principal e secções ignoradas", () => {
    const r = parseDecklist(text);
    expect(r.hasCommanderSection).toBe(true);
    expect(r.entries.filter((e) => e.section === "commander").map((e) => e.name)).toEqual(["Atraxa, Praetors' Voice"]);
    expect(r.entries.filter((e) => e.section === "main").map((e) => e.quantity)).toEqual([1, 30]);
    expect(r.entries.find((e) => e.name === "Counterspell")?.section).toBe("ignored");
    expect(r.entries.find((e) => e.name === "Sol Ring")?.line).toBe(5);
    expect(r.unparsed).toEqual([]);
  });

  it("aceita cabeçalhos estilo Arena (Commander / Deck)", () => {
    const r = parseDecklist("Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring");
    expect(r.hasCommanderSection).toBe(true);
    expect(r.entries.map((e) => e.section)).toEqual(["commander", "main"]);
  });

  it("sem secção de comandante", () => {
    const r = parseDecklist("1 Sol Ring\n1 Forest");
    expect(r.hasCommanderSection).toBe(false);
    expect(r.entries.every((e) => e.section === "main")).toBe(true);
  });

  it("linhas SB: são ignoradas", () => {
    expect(parseDecklist("SB: 1 Counterspell").entries[0].section).toBe("ignored");
  });
});

describe("linha em branco depois do comandante", () => {
  it("o que vem a seguir é o baralho principal", () => {
    const r = parseDecklist("// COMMANDER\n1 Atraxa, Praetors' Voice\n\n1 Sol Ring\n1 Forest");
    expect(r.entries.map((e) => e.section)).toEqual(["commander", "main", "main"]);
  });
  it("linha em branco antes do comandante não muda nada", () => {
    const r = parseDecklist("// COMMANDER\n\n1 Atraxa, Praetors' Voice");
    expect(r.entries[0].section).toBe("commander");
  });
});

describe("canonicalDeckText", () => {
  it("mantém uma linha em branco (separa o comandante) e junta repetidas", async () => {
    const { canonicalDeckText } = await import("@/lib/deck/parser");
    expect(canonicalDeckText("  // COMMANDER\r\n1  X\n\n\n\n1 Y  \n")).toBe("// COMMANDER\n1 X\n\n1 Y");
    expect(canonicalDeckText("// COMMANDER\n1 X\n1 Y")).not.toBe(canonicalDeckText("// COMMANDER\n1 X\n\n1 Y"));
  });
});
