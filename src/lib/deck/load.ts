import type { DeckCard } from "@/lib/cards/types";
import { classifyCard, type Classification } from "@/lib/categories/classify";
import { parseDecklist } from "./parser";
import type { DeckEntry } from "./types";
import { validateDeck, type ValidationResult } from "./validate";

export type Resolved = { entry: DeckEntry; card: DeckCard };

/** De onde vêm as cartas: a base de dados do servidor, ou o ficheiro JSON da versão estática. */
export type CardSource = {
  resolve(entries: DeckEntry[]): Promise<{ resolved: Resolved[]; notFound: DeckEntry[]; lookupError?: string }>;
  /** Correções manuais de categorias para estas cartas */
  overrides(ids: string[]): Promise<{ cardId: string; category: string; include: boolean }[]>;
};

export type LoadedDeck = {
  commander: Resolved[];
  main: Resolved[];
  notFound: DeckEntry[];
  ignored: DeckEntry[];
  validation: ValidationResult;
  /** Categorias de cada carta, por id */
  classification: Map<string, Classification>;
  lookupError?: string;
};

/** Lê, encontra as cartas e valida uma decklist. */
export async function loadDeck(source: CardSource, text: string): Promise<LoadedDeck> {
  const parsed = parseDecklist(text);
  const ignored = parsed.entries.filter((e) => e.section === "ignored");
  const { resolved, notFound, lookupError } = await source.resolve(parsed.entries.filter((e) => e.section !== "ignored"));
  const commander = resolved.filter((r) => r.entry.section === "commander");
  const main = resolved.filter((r) => r.entry.section === "main");

  const validation = validateDeck({
    hasCommanderSection: parsed.hasCommanderSection,
    commander,
    main,
    notFound,
    ignored,
    unparsed: parsed.unparsed,
  });
  if (lookupError) {
    validation.warnings.push({
      code: "lookup_error",
      message: "Não foi possível consultar o Scryfall para as cartas em falta. Tenta de novo daqui a pouco.",
    });
  }
  const ids = [...new Set(resolved.map((r) => r.card.id))];
  const overrides = await source.overrides(ids);
  const classification = new Map(
    resolved.map((r) => [r.card.id, classifyCard(r.card, overrides.filter((o) => o.cardId === r.card.id))]),
  );

  return { commander, main, notFound, ignored, validation, classification, lookupError };
}
