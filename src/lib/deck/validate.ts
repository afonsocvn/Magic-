import { COLOR_NAMES_PT, isSubsetIdentity, type Color } from "@/lib/cards/normalize";
import type { DeckEntry, Issue } from "./types";

export const DECK_SIZE = 100;

/** Campos da carta de que a validação precisa. */
export type ValidationCard = {
  id: string;
  name: string;
  typeLine: string;
  oracleText: string | null;
  colorIdentity: string;
  commanderLegality: string;
  faces?: { typeLine: string | null; oracleText: string | null }[] | null;
};

export type ResolvedEntry = { entry: DeckEntry; card: ValidationCard };

export type ValidationInput = {
  hasCommanderSection: boolean;
  commander: ResolvedEntry[];
  main: ResolvedEntry[];
  notFound: DeckEntry[];
  ignored: DeckEntry[];
  unparsed: { line: number; text: string }[];
};

export type ValidationResult = {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  totalCards: number;
  commanderIdentity: string | null;
};

const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function frontTypeLine(card: ValidationCard): string {
  return card.faces?.[0]?.typeLine ?? card.typeLine.split(" // ")[0];
}

export function isBasicLand(card: ValidationCard): boolean {
  return /\bBasic\b/.test(frontTypeLine(card)) && /\bLand\b/.test(frontTypeLine(card));
}

/** Máximo de cópias permitido (Infinity para "any number of cards named"). */
export function maxCopies(card: ValidationCard): number {
  if (isBasicLand(card)) return Infinity;
  const text = card.oracleText ?? "";
  if (/a deck can have any number of cards named/i.test(text)) return Infinity;
  const m = text.match(/a deck can have up to (\w+) cards named/i);
  if (m) return NUMBER_WORDS[m[1].toLowerCase()] ?? (Number(m[1]) || 1);
  return 1;
}

export function canBeCommander(card: ValidationCard): boolean {
  const type = frontTypeLine(card);
  if (/\bLegendary\b/.test(type) && /\bCreature\b/.test(type)) return true;
  return /can be your commander/i.test(card.oracleText ?? "");
}

function colorList(identity: string): string {
  return [...identity].map((c) => COLOR_NAMES_PT[c as Color] ?? c).join(", ");
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

export function validateDeck(input: ValidationInput): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  for (const u of input.unparsed) {
    errors.push({ code: "unparsed", message: `Linha ${u.line} não foi reconhecida: "${u.text}".` });
  }

  if (input.notFound.length) {
    errors.push({
      code: "not_found",
      message: `${plural(input.notFound.length, "Carta não encontrada", "Cartas não encontradas")}. Confirma a ortografia (nome em inglês).`,
      cards: input.notFound.map((e) => `${e.name} (linha ${e.line})`),
    });
  }

  const ignoredCount = input.ignored.reduce((s, e) => s + e.quantity, 0);
  if (ignoredCount) {
    const labels = [...new Set(input.ignored.map((e) => e.sectionLabel ?? "?"))].join(", ");
    warnings.push({
      code: "ignored_section",
      message: `${ignoredCount} ${plural(ignoredCount, "carta ignorada", "cartas ignoradas")} (secção ${labels}).`,
    });
  }

  // Comandante
  let commanderIdentity: string | null = null;
  const commanderQty = input.commander.reduce((s, r) => s + r.entry.quantity, 0);
  if (!input.hasCommanderSection) {
    errors.push({
      code: "no_commander_section",
      message: 'Falta a secção "// COMMANDER". Coloca o comandante por baixo dessa linha.',
    });
  } else if (commanderQty === 0) {
    if (!input.notFound.some((e) => e.section === "commander")) {
      errors.push({ code: "no_commander", message: 'A secção "// COMMANDER" está vazia.' });
    }
  } else if (commanderQty > 1) {
    errors.push({
      code: "multiple_commanders",
      message: `A secção "// COMMANDER" tem ${commanderQty} cartas. Por agora o site só aceita um comandante (Partner e Background ainda não são suportados).`,
      cards: input.commander.map((r) => r.card.name),
    });
  } else {
    const cmd = input.commander[0].card;
    commanderIdentity = cmd.colorIdentity;
    if (!canBeCommander(cmd)) {
      errors.push({
        code: "invalid_commander",
        message: `${cmd.name} não pode ser comandante (tem de ser uma criatura lendária ou dizer "can be your commander").`,
      });
    }
  }

  const all = [...input.commander, ...input.main];

  // Tamanho (conta só o que foi reconhecido; cartas não encontradas também contam)
  const notFoundQty = input.notFound
    .filter((e) => e.section !== "ignored")
    .reduce((s, e) => s + e.quantity, 0);
  const totalCards = all.reduce((s, r) => s + r.entry.quantity, 0) + notFoundQty;
  if (totalCards !== DECK_SIZE) {
    const diff = totalCards - DECK_SIZE;
    errors.push({
      code: "deck_size",
      message: `O deck tem ${totalCards} cartas (deve ter exatamente ${DECK_SIZE}, contando o comandante): ${
        diff > 0 ? `sobram ${diff}` : `faltam ${-diff}`
      }.`,
    });
  }

  // Singleton
  const copies = new Map<string, { card: ValidationCard; qty: number }>();
  for (const r of all) {
    const cur = copies.get(r.card.id);
    copies.set(r.card.id, { card: r.card, qty: (cur?.qty ?? 0) + r.entry.quantity });
  }
  const tooMany = [...copies.values()].filter(({ card, qty }) => qty > maxCopies(card));
  if (tooMany.length) {
    errors.push({
      code: "singleton",
      message: "Commander é singleton: só uma cópia de cada carta (exceto terrenos básicos).",
      cards: tooMany.map(({ card, qty }) => {
        const max = maxCopies(card);
        return max > 1 ? `${card.name} ×${qty} (máximo ${max})` : `${card.name} ×${qty}`;
      }),
    });
  }

  // Identidade de cor
  if (commanderIdentity !== null) {
    const outside = input.main.filter((r) => !isSubsetIdentity(r.card.colorIdentity, commanderIdentity!));
    if (outside.length) {
      const cmdName = input.commander[0].card.name;
      errors.push({
        code: "color_identity",
        message: `Cartas fora da identidade de cor de ${cmdName} (${commanderIdentity ? colorList(commanderIdentity) : "incolor"}).`,
        cards: outside.map((r) => {
          const extra = [...r.card.colorIdentity].filter((c) => !commanderIdentity!.includes(c)).join("");
          return `${r.card.name} (${colorList(extra)})`;
        }),
      });
    }
  }

  // Legalidade
  const banned = [...copies.values()].filter(({ card }) => card.commanderLegality === "banned");
  if (banned.length) {
    errors.push({
      code: "banned",
      message: `${plural(banned.length, "Carta banida", "Cartas banidas")} em Commander.`,
      cards: banned.map(({ card }) => card.name),
    });
  }
  const notLegal = [...copies.values()].filter(
    ({ card }) => card.commanderLegality !== "legal" && card.commanderLegality !== "banned",
  );
  if (notLegal.length) {
    errors.push({
      code: "not_legal",
      message: `${plural(notLegal.length, "Carta que não é legal", "Cartas que não são legais")} em Commander (ex.: cartas digitais, Un-sets, tokens).`,
      cards: notLegal.map(({ card }) => card.name),
    });
  }

  return { ok: errors.length === 0, errors, warnings, totalCards, commanderIdentity };
}
