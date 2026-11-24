import { z } from "zod";

export const WEAKNESS_AREAS = [
  "mana",
  "rampa",
  "draw",
  "remoção",
  "board wipes",
  "proteção",
  "curva",
  "wincons",
  "sinergia",
  "outro",
] as const;

/** Resposta estruturada que pedimos ao Claude (tudo em português). */
export const AdviceSchema = z.object({
  plan: z.string().describe("Resumo, em 2–4 frases, do plano de jogo que o deck parece seguir."),
  synergies: z
    .array(
      z.object({
        title: z.string(),
        cards: z.array(z.string()).describe("Nomes exatos (em inglês) de cartas do deck envolvidas"),
        explanation: z.string(),
      }),
    )
    .describe("Sinergias e combos encontrados no deck"),
  strengths: z.array(z.object({ title: z.string(), explanation: z.string() })),
  weaknesses: z.array(
    z.object({
      area: z.enum(WEAKNESS_AREAS),
      title: z.string(),
      explanation: z.string().describe("Usa as métricas fornecidas sempre que possível"),
    }),
  ),
  weakestCards: z
    .array(
      z.object({
        name: z.string().describe("Nome exato (em inglês) de uma carta do deck"),
        reason: z.string(),
      }),
    )
    .describe("As cartas mais fracas ou que menos contribuem para o plano"),
  suggestions: z
    .array(
      z.object({
        name: z.string().describe("Nome oficial exato em inglês de uma carta que NÃO está no deck"),
        reason: z.string(),
        replaces: z.string().nullable().describe("Carta do deck a tirar para entrar esta, ou null"),
        fills: z.enum(WEAKNESS_AREAS).describe("Que fraqueza esta carta resolve"),
      }),
    )
    .describe("Cartas a adicionar, pela ordem de impacto"),
});

export type Advice = z.infer<typeof AdviceSchema>;
