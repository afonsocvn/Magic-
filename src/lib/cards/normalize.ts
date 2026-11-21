/**
 * Normaliza um nome de carta para pesquisa: minúsculas, sem acentos,
 * apóstrofos uniformes, espaços colapsados e separador de faces " // ".
 * "Lim-Dûl's Vault" → "lim-dul's vault"; "Fire/Ice" → "fire // ice".
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s*\/\/?\s*/g, " // ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const WUBRG = ["W", "U", "B", "R", "G"] as const;
export type Color = (typeof WUBRG)[number];

/** ["G","W"] → "WG" (ordem WUBRG, sem repetidos, ignora o que não é cor). */
export function colorsToString(colors: readonly string[] | null | undefined): string {
  if (!colors) return "";
  const set = new Set(colors.map((c) => c.toUpperCase()));
  return WUBRG.filter((c) => set.has(c)).join("");
}

/** Igual a colorsToString mas aceita também "C" (mana incolor), no fim. */
export function manaSymbolsToString(symbols: readonly string[] | null | undefined): string {
  if (!symbols) return "";
  const base = colorsToString(symbols);
  return symbols.some((s) => s.toUpperCase() === "C") ? base + "C" : base;
}

/** A identidade `inner` está contida em `outer`? */
export function isSubsetIdentity(inner: string, outer: string): boolean {
  return [...inner].every((c) => outer.includes(c));
}

export const COLOR_NAMES_PT: Record<Color, string> = {
  W: "branco",
  U: "azul",
  B: "preto",
  R: "vermelho",
  G: "verde",
};
