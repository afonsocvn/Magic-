import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { resolveEntries, type Resolved } from "@/lib/cards/resolve";
import { classifyCard, type Classification } from "@/lib/categories/classify";
import { canonicalDeckText, parseDecklist } from "./parser";
import type { DeckEntry } from "./types";
import { validateDeck, type ValidationResult } from "./validate";

export function deckId(text: string): string {
  return createHash("sha256").update(canonicalDeckText(text)).digest("hex").slice(0, 16);
}

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
export async function loadDeck(db: PrismaClient, text: string): Promise<LoadedDeck> {
  const parsed = parseDecklist(text);
  const ignored = parsed.entries.filter((e) => e.section === "ignored");
  const { resolved, notFound, lookupError } = await resolveEntries(
    db,
    parsed.entries.filter((e) => e.section !== "ignored"),
  );
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
  const overrides = await db.cardCategory.findMany({ where: { cardId: { in: ids } } });
  const classification = new Map(
    resolved.map((r) => [r.card.id, classifyCard(r.card, overrides.filter((o) => o.cardId === r.card.id))]),
  );

  return { commander, main, notFound, ignored, validation, classification, lookupError };
}
