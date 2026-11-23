import { CATEGORIES, isCategory, type Category } from "./types";

export type ClassifiableCard = {
  name: string;
  layout: string;
  typeLine: string;
  oracleText: string | null;
  faces?: { typeLine: string | null; oracleText: string | null }[] | null;
  tagCategories: string | null;
};

export type Override = { category: string; include: boolean };

/** De onde veio cada categoria (para mostrar ao utilizador). */
export type CategorySource = "tagger" | "regra" | "correção";

export type Classification = {
  categories: Category[];
  sources: Partial<Record<Category, CategorySource>>;
};

function faceTypes(card: ClassifiableCard): string[] {
  return card.faces?.length ? card.faces.map((f) => f.typeLine ?? "") : card.typeLine.split(" // ");
}

/**
 * Terreno: a face da frente é terreno, ou é um MDFC com uma face de
 * terreno (ex.: Emeria's Call // Emeria, Shattered Skyclave).
 */
export function isLandCard(card: ClassifiableCard): boolean {
  const types = faceTypes(card);
  if (/\bLand\b/.test(types[0] ?? "")) return true;
  return card.layout === "modal_dfc" && types.some((t) => /\bLand\b/.test(t));
}

const PERMANENT = /\b(Creature|Artifact|Enchantment|Planeswalker)\b/;
const BASIC_TYPES = "(?:basic |snow )*(?:land|forest|island|swamp|mountain|plains|wastes)";

/** Regras que se aplicam sempre (o Tagger falha algumas, ex.: Llanowar Elves). */
function alwaysRules(card: ClassifiableCard, text: string): Category[] {
  const out: Category[] = [];
  const front = faceTypes(card)[0] ?? "";
  const manaAbility = /\{T\}(?:,[^:\n]*)?:\s*Add\b/i.test(text) || /^Add \{/m.test(text);
  const landToBattlefield = new RegExp(
    `search your library for [^.]*${BASIC_TYPES} cards?[^.]*onto the battlefield`,
    "i",
  ).test(text);
  const extraLand = /you may play (?:an|two|one) additional lands?/i.test(text);
  if ((manaAbility && PERMANENT.test(front)) || landToBattlefield || extraLand) out.push("ramp");
  if (/\byou win the game\b/i.test(text) || /\b(?:each opponent|target opponent|that player) loses the game\b/i.test(text)) {
    out.push("wincon");
  }
  return out;
}

/** Regras de reserva para cartas que o Tagger ainda não conhece. */
function fallbackRules(text: string): Category[] {
  const rules: [Category, RegExp][] = [
    ["draw", /\bdraws? (?:a|an|two|three|four|five|seven|X|that many) (?:additional )?cards?\b/i],
    ["removal", /\b(?:destroy|exile) target (?:creature|artifact|enchantment|planeswalker|battle|(?:nonland )?permanent)/i],
    ["wipe", /\b(?:destroy|exile) all (?:other )?(?:creatures|nonland permanents|artifacts|enchantments|permanents)\b|\ball creatures get -\d+\/-\d+/i],
    ["counter", /\bcounter target (?:\w+ )?(?:spell|activated ability|ability)\b/i],
    ["tutor", /\bsearch your library for (?:a|an|up to \w+) (?!(?:basic )?land)[^.]*card/i],
    ["recursion", /\breturn (?:target|up to \w+ target|another target)[^.]*cards? from your graveyard/i],
    ["protection", /\b(?:gains?|have|has) (?:hexproof|indestructible|shroud|protection from)\b/i],
  ];
  return rules.filter(([, re]) => re.test(text)).map(([c]) => c);
}

/** O tutor só procura terrenos? Então é rampa/fixing, não tutor. */
function onlySearchesLands(text: string): boolean {
  const clauses = [...text.matchAll(/search your library for ([^.]*?)(?:,|\.|and put|then)/gi)].map((m) => m[1]);
  return clauses.length > 0 && clauses.every((c) => new RegExp(BASIC_TYPES, "i").test(c) && !/\bnonland\b/i.test(c));
}

export function classifyCard(card: ClassifiableCard, overrides: Override[] = []): Classification {
  const sources: Classification["sources"] = {};
  const add = (c: Category, s: CategorySource) => {
    if (!sources[c]) sources[c] = s;
  };
  const text = card.faces?.length ? card.faces.map((f) => f.oracleText ?? "").join("\n") : (card.oracleText ?? "");
  const land = isLandCard(card);

  if (land) add("land", "regra");
  for (const t of (card.tagCategories ?? "").split(",")) if (isCategory(t)) add(t, "tagger");
  for (const c of alwaysRules(card, text)) add(c, "regra");
  if (card.tagCategories == null) for (const c of fallbackRules(text)) add(c, "regra");

  // Terrenos dão mana por definição: não contam como rampa.
  if (land) delete sources.ramp;
  if (sources.tutor && sources.tutor !== "correção" && onlySearchesLands(text)) delete sources.tutor;

  for (const o of overrides) {
    if (!isCategory(o.category)) continue;
    if (o.include) sources[o.category] = "correção";
    else delete sources[o.category];
  }

  return { categories: CATEGORIES.filter((c) => c in sources), sources };
}
