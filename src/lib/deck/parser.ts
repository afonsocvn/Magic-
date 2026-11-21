import type { DeckEntry, DeckSection, ParseResult } from "./types";

const SECTION_ALIASES: Record<string, DeckSection> = {
  commander: "commander",
  commanders: "commander",
  deck: "main",
  main: "main",
  mainboard: "main",
  maindeck: "main",
  "main deck": "main",
  sideboard: "ignored",
  maybeboard: "ignored",
  considering: "ignored",
  companion: "ignored",
  tokens: "ignored",
  about: "ignored",
};

/** "// COMMANDER", "Commander", "Deck:", "// Sideboard" → secção; senão null. */
export function parseSectionHeader(line: string): { section: DeckSection; label: string } | null {
  const slash = line.match(/^\/\/\s*(.*?)\s*:?\s*$/);
  const raw = slash ? slash[1] : line.replace(/:\s*$/, "").trim();
  const key = raw.toLowerCase();
  if (key in SECTION_ALIASES) return { section: SECTION_ALIASES[key], label: raw };
  // "// qualquer outra coisa" é um cabeçalho desconhecido: tratamos como baralho principal.
  if (slash) return { section: "main", label: raw };
  return null;
}

// 1 Sol Ring (TRC) 499 *F*   |   1x Sol Ring   |   Sol Ring
const CARD_LINE =
  /^(?:(\d+)\s*x?\s+)?(.+?)(?:\s+\(([A-Za-z0-9]{2,8})\)(?:\s+([A-Za-z0-9★†\-]+))?)?\s*$/i;

/** Remove marcas de exportação: *F*, *E*, [Categoria], ^Tag^. */
function stripMarkers(line: string): string {
  return line
    .replace(/\s+\*[A-Z]+\*/gi, "")
    .replace(/\s+\[[^\]]*\]/g, "")
    .replace(/\s+\^[^^]*\^/g, "")
    .trim();
}

export function parseCardLine(text: string): Omit<DeckEntry, "line" | "section" | "sectionLabel"> | null {
  const cleaned = stripMarkers(text.replace(/^SB:\s*/i, ""));
  const m = cleaned.match(CARD_LINE);
  if (!m) return null;
  const quantity = m[1] ? parseInt(m[1], 10) : 1;
  const name = m[2].trim();
  if (!name || quantity < 1) return null;
  return {
    quantity,
    name,
    ...(m[3] ? { set: m[3].toLowerCase() } : {}),
    ...(m[4] ? { collectorNumber: m[4] } : {}),
  };
}

/**
 * Lê uma decklist em texto. Sem cabeçalho, as cartas vão para o
 * baralho principal; "// COMMANDER" (ou "Commander") marca o comandante.
 */
export function parseDecklist(text: string): ParseResult {
  const entries: DeckEntry[] = [];
  const unparsed: ParseResult["unparsed"] = [];
  let section: DeckSection = "main";
  let sectionLabel: string | undefined;
  let hasCommanderSection = false;

  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.trim();
    const lineNo = i + 1;
    // Linha em branco depois do comandante: o resto é o baralho principal.
    if (!line && section === "commander" && entries.some((e) => e.section === "commander")) {
      section = "main";
      sectionLabel = undefined;
      return;
    }
    if (!line || line.startsWith("#")) return;

    const header = parseSectionHeader(line);
    if (header) {
      section = header.section;
      sectionLabel = header.label;
      if (section === "commander") hasCommanderSection = true;
      return;
    }

    const isSideboardLine = /^SB:\s*/i.test(line);
    const parsed = parseCardLine(line);
    if (!parsed) {
      unparsed.push({ line: lineNo, text: line });
      return;
    }
    entries.push({
      ...parsed,
      line: lineNo,
      section: isSideboardLine ? "ignored" : section,
      ...(isSideboardLine ? { sectionLabel: "Sideboard" } : sectionLabel ? { sectionLabel } : {}),
    });
  });

  return { entries, unparsed, hasCommanderSection };
}

/** Texto canónico (para o hash do deck): ignora espaços extra e linhas vazias. */
export function canonicalDeckText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n");
}
