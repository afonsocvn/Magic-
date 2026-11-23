import type { Category } from "@/lib/categories/types";
import { CATEGORIES } from "@/lib/categories/types";
import { bestRampFor, DEFAULT_HANDS, goodHandProbability, heatmap, withinHands, type Heatmap } from "./hypergeometric";
import { averageCmc, colorRequirements, karstenLands, manaCurve, tappedLands, type ColorRequirement, type EvalCard, type TappedLands } from "./mana";
import { computeScore, type Score } from "./score";
import { cardsKept, cardsSeen, landDropProbability, opponentTurnsBefore, type TableContext } from "./table";
import { TEMPLATES, templateRowScore, templateStatus, type Status, type TemplateId } from "./templates";

export const CHEAP_RAMP_MV = 2;

export type Evaluation = {
  context: TableContext;
  templateId: TemplateId;
  hands: number;
  byCategory: Record<Category, { count: number; cards: string[] }>;
  template: { key: string; label: string; have: number; target: number; status: Status; cards: string[] }[];
  curve: number[];
  avgCmc: number;
  lands: number;
  cheapRamp: { count: number; cards: { name: string; cmc: number }[] };
  karsten: number;
  colors: ColorRequirement[];
  tapped: TappedLands;
  hand: {
    single: number;
    withinN: number;
    byHands: { hand: number; cardsKept: number; probability: number }[];
    bestRamp: { ramp: number; p: number };
    heatmap: Heatmap;
  };
  landDrops: { turn: number; cardsSeen: number; probability: number; opponentTurns: number }[];
  score: Score;
};

const sum = (cs: EvalCard[]) => cs.reduce((s, c) => s + c.quantity, 0);
const names = (cs: EvalCard[]) => cs.flatMap((c) => (c.quantity > 1 ? [`${c.name} ×${c.quantity}`] : [c.name]));

/**
 * Avaliação de um deck: `deck` são as 99 cartas (sem o comandante).
 * O comandante só entra nas exigências de cor.
 */
export function evaluateDeck({
  deck,
  commander,
  identity,
  templateId = "cz",
  context,
  hands = DEFAULT_HANDS,
}: {
  deck: EvalCard[];
  commander: EvalCard | null;
  identity: string;
  templateId?: TemplateId;
  context: TableContext;
  hands?: number;
}): Evaluation {
  const has = (cat: Category) => deck.filter((c) => c.categories.includes(cat));
  const byCategory = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, { count: sum(has(cat)), cards: names(has(cat)) }]),
  ) as Evaluation["byCategory"];

  const template = TEMPLATES[templateId].rows.map((row) => {
    const cards = deck.filter((c) => row.categories.some((cat) => c.categories.includes(cat)));
    const have = sum(cards);
    return { key: row.key, label: row.label, have, target: row.target, status: templateStatus(row.key, have, row.target), cards: names(cards) };
  });

  const landCards = has("land");
  const lands = sum(landCards);
  const cheap = deck.filter((c) => !c.categories.includes("land") && c.categories.includes("ramp") && c.cmc <= CHEAP_RAMP_MV);
  const cheapRamp = { count: sum(cheap), cards: cheap.map((c) => ({ name: c.name, cmc: c.cmc })) };

  const avgCmc = averageCmc(deck);
  const karsten = karstenLands(avgCmc, cheapRamp.count);
  const colors = colorRequirements(deck, commander, identity, context);
  const tapped = tappedLands(deck);

  const N = sum(deck);
  const single = goodHandProbability(lands, cheapRamp.count, N);
  const map = heatmap({ hands, N });
  const hand = {
    single,
    withinN: withinHands(single, hands),
    byHands: Array.from({ length: hands }, (_, i) => ({
      hand: i + 1,
      cardsKept: cardsKept(context, i + 1),
      probability: withinHands(single, i + 1),
    })),
    bestRamp: bestRampFor(lands, { hands, N }),
    heatmap: map,
  };

  const landDrops = [1, 2, 3, 4, 5].map((turn) => ({
    turn,
    cardsSeen: cardsSeen(context, turn),
    probability: landDropProbability(context, lands, turn, N),
    opponentTurns: opponentTurnsBefore(context, turn),
  }));

  const worst = colors.map((c) => c.hardest?.probability).filter((p): p is number => p != null);
  const score = computeScore({
    template: template.map((t) => ({ ...t, score: templateRowScore(t.key, t.have, t.target) })),
    lands,
    karsten,
    worstColorProbability: worst.length ? Math.min(...worst) : null,
    avgCmc,
    tappedAlways: tapped.always.length,
    handProbability: hand.withinN,
    bestHandProbability: map.max.p,
  });

  return {
    context,
    templateId,
    hands,
    byCategory,
    template,
    curve: manaCurve(deck),
    avgCmc,
    lands,
    cheapRamp,
    karsten,
    colors,
    tapped,
    hand,
    landDrops,
    score,
  };
}
