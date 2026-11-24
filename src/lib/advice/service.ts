import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeName } from "@/lib/cards/normalize";
import { resolveEntries } from "@/lib/cards/resolve";
import { lookupNames } from "@/lib/scryfall/map";
import { deckLines, evaluateLoadedDeck, toEvalCard } from "@/lib/deck/evaluation";
import { loadDeck } from "@/lib/deck/load";
import type { EvalParams } from "@/lib/deck/params";
import { adviceModel, AdviceError, requestAdvice, type AdviceClient } from "./claude";
import { buildUserPrompt, PROMPT_VERSION, type PromptCard } from "./prompt";
import { validateAdvice, type SuggestedCard, type ValidatedAdvice } from "./validate";

export const MAX_PLAN_LENGTH = 2000;

export type AdviceResponse = {
  advice: ValidatedAdvice;
  cached: boolean;
  model: string;
  createdAt: string;
};

export function adviceCacheKey(deckId: string, plan: string, params: EvalParams, model: string): string {
  const ctx = params.context;
  const parts = [deckId, plan.trim(), model, PROMPT_VERSION, params.template, params.hands, ctx.players, ctx.seat, ctx.firstPlayerDraws, ctx.freeMulligan];
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

/** Lê da cache, ou pede ao Claude, valida as sugestões e guarda. */
export async function getAdvice(
  db: PrismaClient,
  input: { deckId: string; plan: string; params: EvalParams; onlyCached?: boolean },
  client?: AdviceClient,
): Promise<AdviceResponse | null> {
  const plan = input.plan.trim().slice(0, MAX_PLAN_LENGTH);
  const model = adviceModel();
  const key = adviceCacheKey(input.deckId, plan, input.params, model);

  const cached = await db.deckAdvice.findUnique({ where: { key } });
  if (cached) {
    return { advice: cached.result as unknown as ValidatedAdvice, cached: true, model: cached.model, createdAt: cached.createdAt.toISOString() };
  }
  if (input.onlyCached) return null;

  const deck = await db.deck.findUnique({ where: { id: input.deckId } });
  if (!deck) throw new AdviceError("Deck não encontrado.", 404);
  const loaded = await loadDeck(db, deck.text);
  if (!loaded.validation.ok) {
    throw new AdviceError("Corrige primeiro os problemas da decklist: a análise só corre em decks válidos.", 400);
  }
  const commander = loaded.commander[0].card;
  const identity = commander.colorIdentity;
  const evaluation = evaluateLoadedDeck(loaded, input.params);

  const toPrompt = (card: typeof commander, quantity: number): PromptCard => ({
    ...toEvalCard(card, quantity, loaded.classification),
    categories: loaded.classification.get(card.id)?.categories ?? [],
  });
  const userPrompt = buildUserPrompt({
    commander: toPrompt(commander, 1),
    identity,
    deck: deckLines(loaded).map((l) => toPrompt(l.card, l.quantity)),
    evaluation,
    plan,
  });

  const result = await requestAdvice(userPrompt, client);

  // Procurar as sugestões na BD (e no Scryfall, se faltarem).
  const { resolved } = await resolveEntries(
    db,
    result.advice.suggestions.map((s, i) => ({ quantity: 1, name: s.name, line: i + 1, section: "main" as const })),
  );
  const lookup = new Map<string, SuggestedCard>(
    resolved.map(({ entry, card }) => [
      normalizeName(entry.name),
      {
        id: card.id,
        name: card.name,
        colorIdentity: card.colorIdentity,
        commanderLegality: card.commanderLegality,
        manaCost: card.manaCost,
        typeLine: card.typeLine,
        priceEurCents: card.priceEurCents,
        priceUsdCents: card.priceUsdCents,
        image: card.imageUris?.normal ?? card.faces?.[0]?.imageUris?.normal ?? null,
      },
    ]),
  );
  const deckNames = new Set([...loaded.commander, ...loaded.main].flatMap((r) => lookupNames(r.card)));
  const advice = validateAdvice(result.advice, { identity, deckNames, commanderName: commander.name, lookup });

  const row = await db.deckAdvice.create({
    data: {
      key,
      deckId: input.deckId,
      plan,
      model: result.model,
      result: advice as unknown as Prisma.InputJsonValue,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
  });
  return { advice, cached: false, model: row.model, createdAt: row.createdAt.toISOString() };
}
