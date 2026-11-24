import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AdviceSchema, type Advice } from "./schema";
import { SYSTEM_PROMPT } from "./prompt";

/** Sonnet 5.5 por omissão (escolha do projeto); configurável no .env. */
export const DEFAULT_MODEL = "claude-sonnet-5-5";

export function adviceModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

export class AdviceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type AdviceResult = {
  advice: Advice;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
};

/** Só o que usamos do cliente — permite substituí-lo nos testes. */
export type AdviceClient = Pick<Anthropic, "beta">;

export async function requestAdvice(userPrompt: string, client?: AdviceClient): Promise<AdviceResult> {
  const model = adviceModel();
  let message;
  try {
    const api = client ?? new Anthropic();
    message = await api.beta.messages
      .stream({
        model,
        max_tokens: 32000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
        output_config: { effort: "high", format: betaZodOutputFormat(AdviceSchema) },
        // Se os filtros de segurança recusarem por engano, o servidor tenta outro modelo.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      })
      .finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AdviceError("A chave da API da Anthropic é inválida ou não está configurada (ANTHROPIC_API_KEY no .env).", 503);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new AdviceError("A API da Anthropic está a limitar pedidos. Tenta daqui a um minuto.", 429);
    }
    if (err instanceof Anthropic.APIError) {
      throw new AdviceError(`Erro da API da Anthropic (${err.status ?? "rede"}). Tenta de novo.`, 502);
    }
    if (err instanceof Anthropic.AnthropicError) {
      // ex.: nenhuma credencial configurada
      throw new AdviceError("Falta configurar a chave da API da Anthropic (ANTHROPIC_API_KEY no .env do servidor).", 503);
    }
    throw err;
  }

  if (message.stop_reason === "refusal") {
    throw new AdviceError("O Claude recusou analisar este deck. Tenta reformular o plano do deck.", 422);
  }
  if (message.stop_reason === "max_tokens") {
    throw new AdviceError("A resposta do Claude ficou cortada. Tenta de novo.", 502);
  }
  const advice = message.parsed_output;
  if (!advice) throw new AdviceError("A resposta do Claude não veio no formato esperado. Tenta de novo.", 502);

  return {
    advice,
    model: message.model,
    usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
  };
}
