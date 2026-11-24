import { describe, expect, it } from "vitest";
import { AdviceError, requestAdvice, type AdviceClient } from "@/lib/advice/claude";
import { buildUserPrompt, SYSTEM_PROMPT, type PromptCard } from "@/lib/advice/prompt";
import type { Advice } from "@/lib/advice/schema";
import { adviceCacheKey } from "@/lib/advice/service";
import { validateAdvice, type SuggestedCard } from "@/lib/advice/validate";
import { parseEvalParams } from "@/lib/deck/params";
import { evaluateDeck } from "@/lib/math/evaluate";
import { defaultContext } from "@/lib/math/table";

const advice: Advice = {
  plan: "Rampa e criaturas grandes.",
  synergies: [{ title: "Terras", cards: ["Cultivate"], explanation: "…" }],
  strengths: [{ title: "Rampa", explanation: "20 peças de rampa." }],
  weaknesses: [{ area: "board wipes", title: "Poucos wipes", explanation: "2 de 6." }],
  weakestCards: [
    { name: "Vigor", reason: "caro" },
    { name: "Omnath, Locus of Mana", reason: "comandante não conta" },
    { name: "Carta Inventada", reason: "não está no deck" },
  ],
  suggestions: [
    { name: "Ezuri's Predation", reason: "wipe", replaces: null, fills: "board wipes" },
    { name: "Toxic Deluge", reason: "wipe", replaces: "Vigor", fills: "board wipes" },
    { name: "Sylvan Scrying", reason: "tutor", replaces: "Carta Inventada", fills: "mana" },
    { name: "Hurricane", reason: "wipe", replaces: "Vigor", fills: "board wipes" },
    { name: "Hurricane", reason: "de novo", replaces: null, fills: "board wipes" },
    { name: "Natural Order", reason: "banida?", replaces: null, fills: "outro" },
    { name: "Fantasy Card", reason: "?", replaces: null, fills: "outro" },
  ],
};

const card = (name: string, over: Partial<SuggestedCard> = {}): SuggestedCard => ({
  id: name, name, colorIdentity: "G", commanderLegality: "legal", manaCost: null, typeLine: "Sorcery",
  priceEurCents: 100, priceUsdCents: 120, image: null, ...over,
});

describe("validateAdvice", () => {
  const lookup = new Map<string, SuggestedCard>([
    ["ezuri's predation", card("Ezuri's Predation")],
    ["toxic deluge", card("Toxic Deluge", { colorIdentity: "B" })],
    ["sylvan scrying", card("Sylvan Scrying")],
    ["hurricane", card("Hurricane")],
    ["natural order", card("Natural Order", { commanderLegality: "banned" })],
  ]);
  const r = validateAdvice(advice, {
    identity: "G",
    deckNames: new Set(["ezuri's predation", "vigor", "omnath, locus of mana"]),
    commanderName: "Omnath, Locus of Mana",
    lookup,
  });

  it("só ficam sugestões válidas, com o motivo das rejeitadas", () => {
    expect(r.suggestions.map((s) => s.name)).toEqual(["Sylvan Scrying", "Hurricane"]);
    expect(r.rejected).toEqual([
      { name: "Ezuri's Predation", reason: "já está no deck" },
      { name: "Toxic Deluge", reason: "fora da identidade de cor" },
      { name: "Hurricane", reason: "repetida" },
      { name: "Natural Order", reason: "banida" },
      { name: "Fantasy Card", reason: "não existe com esse nome" },
    ]);
  });
  it("'substitui' só aponta para cartas do deck", () => {
    expect(r.suggestions[0].replaces).toBeNull();
    expect(r.suggestions[1].replaces).toBe("Vigor");
  });
  it("cartas fracas: só do deck e nunca o comandante", () => {
    expect(r.weakestCards.map((w) => w.name)).toEqual(["Vigor"]);
  });
});

describe("prompt", () => {
  const pc = (name: string, over: Partial<PromptCard> = {}): PromptCard => ({
    name, quantity: 1, manaCost: "{1}{G}", cmc: 2, typeLine: "Creature", oracleText: "Deathtouch\nWhen X dies, draw.", categories: [], ...over,
  });
  const evaluation = evaluateDeck({
    deck: [{ ...pc("Forest", { quantity: 36, manaCost: null, cmc: 0, typeLine: "Basic Land" }), producedMana: "G", categories: ["land"] }],
    commander: null, identity: "G", context: defaultContext(4),
  });
  const text = buildUserPrompt({
    commander: pc("Omnath, Locus of Mana"), identity: "G",
    deck: [pc("Forest", { quantity: 36, categories: ["land"] }), pc("Elvish Archer")],
    evaluation, plan: "deathtouch + pings como board wipe",
  });
  it("inclui plano, métricas, comandante e cartas com oracle text", () => {
    expect(text).toContain("<plano_do_dono>\ndeathtouch + pings como board wipe");
    expect(text).toContain("Identidade de cor: verde");
    expect(text).toContain("36x Forest");
    expect(text).toContain("categorias: Terrenos");
    expect(text).toContain("Deathtouch / When X dies, draw.");
    expect(text).toMatch(/Mão inicial boa \(MustaKotka\): .*%/);
    expect(text).toContain("Mesa: 4 jogadores, lugar 1");
  });
  it("plano vazio fica marcado como não indicado", () => {
    const t = buildUserPrompt({ commander: pc("X"), identity: "", deck: [], evaluation, plan: "  " });
    expect(t).toContain("(não indicado)");
    expect(t).toContain("Identidade de cor: incolor");
  });
  it("instruções pedem português de Portugal e só cartas legais na identidade", () => {
    expect(SYSTEM_PROMPT).toContain("português de Portugal");
    expect(SYSTEM_PROMPT).toContain("identidade de cor");
  });
});

describe("cache", () => {
  it("a chave muda com o plano e com o contexto, não com espaços", () => {
    const p = parseEvalParams({});
    const k = adviceCacheKey("abc", "plano", p, "m");
    expect(adviceCacheKey("abc", "  plano ", p, "m")).toBe(k);
    expect(adviceCacheKey("abc", "outro", p, "m")).not.toBe(k);
    expect(adviceCacheKey("abc", "plano", parseEvalParams({ j: "2" }), "m")).not.toBe(k);
    expect(adviceCacheKey("abc", "plano", p, "outro-modelo")).not.toBe(k);
  });
});

describe("requestAdvice (cliente simulado)", () => {
  const fake = (message: Record<string, unknown>, capture?: (p: Record<string, unknown>) => void): AdviceClient =>
    ({
      beta: {
        messages: {
          stream: (params: Record<string, unknown>) => {
            capture?.(params);
            return { finalMessage: async () => message };
          },
        },
      },
    }) as unknown as AdviceClient;
  const ok = { stop_reason: "end_turn", parsed_output: advice, model: "claude-sonnet-5-5", usage: { input_tokens: 15000, output_tokens: 3000 } };

  it("envia modelo, sistema, formato estruturado e fallback", async () => {
    let sent: Record<string, unknown> = {};
    const r = await requestAdvice("olá", fake(ok, (p) => (sent = p)));
    expect(sent.model).toBe("claude-sonnet-5-5");
    expect(sent.system).toBe(SYSTEM_PROMPT);
    expect(sent.fallbacks).toBe("default");
    expect(sent.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect((sent.output_config as { format: { type: string } }).format.type).toBe("json_schema");
    expect(r.advice.plan).toBe(advice.plan);
    expect(r.usage).toEqual({ inputTokens: 15000, outputTokens: 3000 });
  });
  it("modelo configurável por ANTHROPIC_MODEL", async () => {
    process.env.ANTHROPIC_MODEL = "claude-opus-5-5";
    let sent: Record<string, unknown> = {};
    await requestAdvice("olá", fake(ok, (p) => (sent = p)));
    delete process.env.ANTHROPIC_MODEL;
    expect(sent.model).toBe("claude-opus-5-5");
  });
  it("recusa e formato inválido dão erros claros", async () => {
    await expect(requestAdvice("x", fake({ ...ok, stop_reason: "refusal" }))).rejects.toThrow(AdviceError);
    await expect(requestAdvice("x", fake({ ...ok, parsed_output: null }))).rejects.toThrow(/formato/);
    await expect(requestAdvice("x", fake({ ...ok, stop_reason: "max_tokens" }))).rejects.toThrow(/cortada/);
  });
});
