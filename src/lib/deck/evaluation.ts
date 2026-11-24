import type { Classification } from "@/lib/categories/classify";
import type { DeckCard } from "@/lib/cards/types";
import { evaluateDeck, type Evaluation } from "@/lib/math/evaluate";
import type { EvalCard } from "@/lib/math/mana";
import { mergeLines } from "./groups";
import type { LoadedDeck } from "./load";
import type { EvalParams } from "./params";

export function toEvalCard(card: DeckCard, quantity: number, cls: Map<string, Classification>): EvalCard {
  return { ...card, quantity, categories: cls.get(card.id)?.categories ?? [] };
}

/** Linhas das 99 (sem o comandante), com repetidos juntos. */
export function deckLines(loaded: LoadedDeck) {
  return mergeLines(loaded.main.map((r) => ({ card: r.card, quantity: r.entry.quantity })));
}

export function evaluateLoadedDeck(loaded: LoadedDeck, params: EvalParams): Evaluation {
  const commander = loaded.commander[0]?.card ?? null;
  return evaluateDeck({
    deck: deckLines(loaded).map((l) => toEvalCard(l.card, l.quantity, loaded.classification)),
    commander: commander ? toEvalCard(commander, 1, loaded.classification) : null,
    identity: commander?.colorIdentity ?? "",
    templateId: params.template,
    context: params.context,
    hands: params.hands,
  });
}
