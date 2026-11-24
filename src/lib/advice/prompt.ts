import { COLOR_NAMES_PT, type Color } from "@/lib/cards/normalize";
import { CATEGORY_LABELS, type Category } from "@/lib/categories/types";
import { pct, num } from "@/lib/format";
import type { Evaluation } from "@/lib/math/evaluate";
import { TEMPLATES } from "@/lib/math/templates";

/** Muda quando o prompt muda: invalida a cache das respostas antigas. */
export const PROMPT_VERSION = 1;

export type PromptCard = {
  name: string;
  quantity: number;
  manaCost: string | null;
  cmc: number;
  typeLine: string;
  oracleText: string | null;
  categories: Category[];
};

export const SYSTEM_PROMPT = `És um jogador experiente de Magic: The Gathering, formato Commander (EDH), a analisar um deck de 100 cartas para o seu dono.

Escreve sempre em português de Portugal, num tom direto e concreto, como um amigo que conhece bem o formato. Nada de frases de circunstância.

Recebes:
- o comandante e as 99 cartas, com custo, tipo, categorias atribuídas automaticamente e oracle text;
- métricas calculadas pelo site (contagens vs. template, curva, fórmula de Karsten, fontes de cor, probabilidade de mão inicial boa, contexto de mesa);
- opcionalmente, o plano do deck descrito pelo dono. Quando existir, leva-o a sério: interpreta as cartas à luz desse plano (por exemplo, deathtouch + dano a todas as criaturas funciona como board wipe) e diz se as métricas automáticas estão a subestimar alguma coisa por causa disso.

Regras:
- Baseia-te no oracle text e nas métricas; quando citares números, usa os que recebeste.
- As categorias automáticas podem falhar; corrige-as na tua análise quando for o caso.
- Nos campos de nomes de cartas usa sempre o nome oficial exato em inglês.
- Sugestões: só cartas que não estejam já no deck, dentro da identidade de cor do comandante e legais em Commander. Prefere cartas que sirvam o plano e resolvam as fraquezas que apontaste. Dá entre 6 e 12 sugestões e, quando fizer sentido, indica que carta do deck sai.
- Cartas mais fracas: entre 4 e 8, só cartas que estão no deck (não o comandante).
- Não inventes cartas. Se não tiveres a certeza de que uma carta existe com esse nome exato, não a sugiras.`;

function fmtCard(c: PromptCard): string {
  const cats = c.categories.map((x) => CATEGORY_LABELS[x]).join(", ");
  const text = (c.oracleText ?? "").replace(/\n+/g, " / ");
  return `${c.quantity > 1 ? `${c.quantity}x ` : ""}${c.name} | ${c.manaCost ?? "-"} (MV ${c.cmc}) | ${c.typeLine}${cats ? ` | categorias: ${cats}` : ""}\n  ${text}`;
}

export function buildMetrics(e: Evaluation): string {
  const ctx = e.context;
  const lines = [
    `Template ${TEMPLATES[e.templateId].name}: ` +
      e.template.map((t) => `${t.label} ${t.have}/${t.target}`).join("; "),
    `Todas as categorias: ` +
      (Object.entries(e.byCategory) as [Category, { count: number }][])
        .map(([c, v]) => `${CATEGORY_LABELS[c]} ${v.count}`)
        .join("; "),
    `Curva (MV 0..7+): ${e.curve.join(", ")}; CMC médio sem terrenos ${num(e.avgCmc)}`,
    `Terrenos: ${e.lands}; rampa MV 0–2: ${e.cheapRamp.count}; Karsten recomenda ${num(e.karsten, 1)} terrenos`,
    `Terrenos tapped: ${e.tapped.always.length} sempre, ${e.tapped.conditional.length} às vezes`,
    ...e.colors.map(
      (c) =>
        `Cor ${COLOR_NAMES_PT[c.color as Color]}: ${c.sources} fontes (${c.landSources} terrenos + ${c.rampSources} rampa), ${c.totalPips} símbolos` +
        (c.hardest ? `; mais exigente ${c.hardest.name} (${c.hardest.pips}× no turno ${c.hardest.turn}): ${pct(c.hardest.probability)}` : ""),
    ),
    `Mão inicial boa (MustaKotka): ${pct(e.hand.single)} numa mão, ${pct(e.hand.withinN)} em até ${e.hands} mãos; melhor rampa para ${e.lands} terrenos seria ${e.hand.bestRamp.ramp}`,
    `Mesa: ${ctx.players === 2 ? "1 vs 1" : `${ctx.players} jogadores`}, lugar ${ctx.seat}; ${ctx.firstPlayerDraws ? "quem começa compra" : "quem começa não compra"}; ${ctx.freeMulligan ? "1.º mulligan grátis" : "sem mulligan grátis"}`,
    `Nota do site: ${e.score.total}/100 (` + e.score.parts.map((p) => `${p.label} ${num(p.points, 1)}/${num(p.max, 1)}`).join("; ") + ")",
  ];
  return lines.join("\n");
}

export function buildUserPrompt(input: {
  commander: PromptCard;
  identity: string;
  deck: PromptCard[];
  evaluation: Evaluation;
  plan: string;
}): string {
  const identity = input.identity ? [...input.identity].map((c) => COLOR_NAMES_PT[c as Color]).join(", ") : "incolor";
  return [
    `<comandante>\n${fmtCard(input.commander)}\nIdentidade de cor: ${identity}\n</comandante>`,
    `<plano_do_dono>\n${input.plan.trim() || "(não indicado)"}\n</plano_do_dono>`,
    `<metricas>\n${buildMetrics(input.evaluation)}\n</metricas>`,
    `<deck>\n${input.deck.map(fmtCard).join("\n")}\n</deck>`,
    "Analisa o deck e responde no formato pedido.",
  ].join("\n\n");
}
