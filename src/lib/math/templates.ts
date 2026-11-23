import type { Category } from "@/lib/categories/types";

export type TemplateId = "cz" | "ct";

export type TemplateRow = {
  key: string;
  label: string;
  /** Uma carta conta se tiver qualquer uma destas categorias */
  categories: Category[];
  target: number;
};

export const TEMPLATES: Record<TemplateId, { name: string; rows: TemplateRow[] }> = {
  cz: {
    name: "Command Zone",
    rows: [
      { key: "land", label: "Terrenos", categories: ["land"], target: 38 },
      { key: "ramp", label: "Rampa", categories: ["ramp"], target: 10 },
      { key: "draw", label: "Card draw", categories: ["draw"], target: 12 },
      { key: "removal", label: "Remoção pontual", categories: ["removal"], target: 12 },
      { key: "wipe", label: "Remoção em massa", categories: ["wipe"], target: 6 },
    ],
  },
  ct: {
    name: "Commander Template",
    rows: [
      { key: "land", label: "Terrenos", categories: ["land"], target: 36 },
      { key: "ramp", label: "Rampa", categories: ["ramp"], target: 12 },
      { key: "draw", label: "Card draw", categories: ["draw"], target: 10 },
      { key: "removal", label: "Remoção (pontual + massa)", categories: ["removal", "wipe"], target: 10 },
    ],
  },
};

export type Status = "ok" | "warn" | "bad";

/**
 * Semáforo. Terrenos: |diferença| ≤ 1 verde, ≤ 3 amarelo.
 * Restantes: ≥ alvo verde, ≥ 75 % do alvo amarelo, abaixo vermelho.
 */
export function templateStatus(key: string, have: number, target: number): Status {
  if (key === "land") {
    const d = Math.abs(have - target);
    return d <= 1 ? "ok" : d <= 3 ? "warn" : "bad";
  }
  if (have >= target) return "ok";
  return have >= 0.75 * target ? "warn" : "bad";
}

/** Pontuação de 0 a 1 de uma linha (usada na nota geral). */
export function templateRowScore(key: string, have: number, target: number): number {
  if (key === "land") return Math.max(0, 1 - Math.abs(have - target) / 6);
  return target ? Math.min(1, have / target) : 1;
}
