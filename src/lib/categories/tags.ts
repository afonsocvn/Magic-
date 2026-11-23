import type { Category } from "./types";

/** Tag do bulk oracle_tags do Scryfall (só o que usamos). */
export type OracleTag = {
  id: string;
  label: string;
  child_ids: string[];
  taggings: { oracle_id: string }[];
};

/**
 * Cada categoria = uma tag do Tagger e todas as suas descendentes,
 * menos as sub-árvores excluídas.
 */
export const TAG_RULES: Record<Exclude<Category, "land">, { roots: string[]; exclude?: string[] }> = {
  // "ritual" e "combat ramp" dão mana só uma vez: não são rampa em Commander.
  ramp: { roots: ["ramp"], exclude: ["ritual", "combat ramp"] },
  // Loot/rummage/brainstorm filtram, não dão cartas a mais.
  draw: {
    roots: ["draw"],
    exclude: ["loot", "loot to exile", "loot to library", "rummage", "rummage to library", "brainstorm"],
  },
  removal: { roots: ["spot removal"] },
  wipe: { roots: ["sweeper"] },
  counter: { roots: ["counterspell"] },
  protection: { roots: ["protection"] },
  // Procurar terrenos é rampa, não tutor.
  tutor: { roots: ["tutor"], exclude: ["tutor-land", "gamble"] },
  // Cartas que só se devolvem a si mesmas não são recursão para o deck.
  recursion: { roots: ["recursion"], exclude: ["recursion-self"] },
  wincon: { roots: ["alternate win condition", "overrun"] },
};

function descendants(rootIds: string[], byId: Map<string, OracleTag>): Set<string> {
  const out = new Set<string>();
  const stack = [...rootIds];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(byId.get(id)?.child_ids ?? []));
  }
  return out;
}

/**
 * oracle_id → categorias. As cartas com alguma tag (qualquer uma) aparecem
 * no mapa, mesmo sem categoria, para se saber que o Tagger as conhece.
 */
export function categoriesFromTags(tags: OracleTag[]): Map<string, Set<Category>> {
  const byId = new Map(tags.map((t) => [t.id, t]));
  const byLabel = new Map(tags.map((t) => [t.label, t]));
  const ids = (labels: string[]) => labels.map((l) => byLabel.get(l)?.id).filter((x): x is string => !!x);

  const tagToCats = new Map<string, Category[]>();
  for (const [cat, rule] of Object.entries(TAG_RULES) as [Category, (typeof TAG_RULES)["ramp"]][]) {
    const inc = descendants(ids(rule.roots), byId);
    const exc = descendants(ids(rule.exclude ?? []), byId);
    for (const id of inc) if (!exc.has(id)) tagToCats.set(id, [...(tagToCats.get(id) ?? []), cat]);
  }

  const result = new Map<string, Set<Category>>();
  for (const t of tags) {
    const cats = tagToCats.get(t.id) ?? [];
    for (const { oracle_id } of t.taggings) {
      const set = result.get(oracle_id) ?? new Set<Category>();
      cats.forEach((c) => set.add(c));
      result.set(oracle_id, set);
    }
  }
  return result;
}
