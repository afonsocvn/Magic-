import { isSubsetIdentity, normalizeName } from "@/lib/cards/normalize";
import type { Advice } from "./schema";

/** O que precisamos de saber de uma carta sugerida. */
export type SuggestedCard = {
  id: string;
  name: string;
  colorIdentity: string;
  commanderLegality: string;
  manaCost: string | null;
  typeLine: string;
  priceEurCents: number | null;
  priceUsdCents: number | null;
  image: string | null;
};

export type ValidSuggestion = Advice["suggestions"][number] & { card: SuggestedCard };
export type RejectedSuggestion = { name: string; reason: string };

export type ValidatedAdvice = Omit<Advice, "suggestions" | "weakestCards"> & {
  suggestions: ValidSuggestion[];
  rejected: RejectedSuggestion[];
  weakestCards: Advice["weakestCards"];
};

/**
 * Só ficam as sugestões que existem na base de dados, são legais em
 * Commander, respeitam a identidade de cor e não estão já no deck.
 * As "cartas mais fracas" têm de estar no deck.
 */
export function validateAdvice(
  advice: Advice,
  ctx: {
    identity: string;
    /** nomes normalizados (e das faces) das cartas do deck, incluindo o comandante */
    deckNames: Set<string>;
    commanderName: string;
    lookup: Map<string, SuggestedCard>;
  },
): ValidatedAdvice {
  const suggestions: ValidSuggestion[] = [];
  const rejected: RejectedSuggestion[] = [];
  const seen = new Set<string>();

  for (const s of advice.suggestions) {
    const key = normalizeName(s.name);
    const card = ctx.lookup.get(key);
    let reason: string | null = null;
    if (!card) reason = "não existe com esse nome";
    else if (seen.has(card.id)) reason = "repetida";
    else if (ctx.deckNames.has(normalizeName(card.name)) || ctx.deckNames.has(key)) reason = "já está no deck";
    else if (card.commanderLegality !== "legal") reason = card.commanderLegality === "banned" ? "banida" : "não é legal em Commander";
    else if (!isSubsetIdentity(card.colorIdentity, ctx.identity)) reason = "fora da identidade de cor";
    if (reason) {
      rejected.push({ name: s.name, reason });
      continue;
    }
    seen.add(card!.id);
    const replaces = s.replaces && ctx.deckNames.has(normalizeName(s.replaces)) ? s.replaces : null;
    suggestions.push({ ...s, name: card!.name, replaces, card: card! });
  }

  const commander = normalizeName(ctx.commanderName);
  const weakestCards = advice.weakestCards.filter((w) => {
    const n = normalizeName(w.name);
    return ctx.deckNames.has(n) && n !== commander;
  });

  return { ...advice, suggestions, rejected, weakestCards };
}
