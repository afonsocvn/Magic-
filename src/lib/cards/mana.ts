/** "{2}{W}{U/P}" → ["2", "W", "U/P"] */
export function parseManaSymbols(cost: string | null | undefined): string[] {
  if (!cost) return [];
  return [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

/** Nome do ficheiro SVG do Scryfall: "W/U" → "WU", "1/2" → "HALF"… */
export function symbolFile(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s === "½" || s === "1/2") return "HALF";
  if (s === "∞") return "INFINITY";
  return s.replace(/\//g, "");
}

/** Divide texto com símbolos em partes: texto ou símbolo. */
export function splitSymbols(text: string): ({ text: string } | { symbol: string })[] {
  const parts: ({ text: string } | { symbol: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(/\{([^}]+)\}/g)) {
    if (m.index! > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ symbol: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
