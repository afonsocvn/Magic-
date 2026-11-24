import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AdviceError } from "@/lib/advice/claude";
import { getAdvice, MAX_PLAN_LENGTH } from "@/lib/advice/service";
import { parseEvalParams } from "@/lib/deck/params";

export const runtime = "nodejs";
// A análise pode demorar mais de um minuto.
export const maxDuration = 300;

/** Limite simples por IP para pedidos novos ao Claude (cada um custa dinheiro). */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.set(ip, recent);
  return recent.length >= MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  let body: { deckId?: unknown; plan?: unknown; params?: unknown; onlyCached?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const deckId = typeof body.deckId === "string" ? body.deckId : "";
  const plan = typeof body.plan === "string" ? body.plan : "";
  if (!/^[0-9a-f]{16}$/.test(deckId)) return NextResponse.json({ error: "Deck inválido." }, { status: 400 });
  if (plan.length > MAX_PLAN_LENGTH) {
    return NextResponse.json({ error: `O plano do deck tem mais de ${MAX_PLAN_LENGTH} caracteres.` }, { status: 400 });
  }
  const raw = body.params && typeof body.params === "object" ? (body.params as Record<string, string>) : {};
  const params = parseEvalParams(raw);
  const onlyCached = body.onlyCached === true;

  try {
    const cached = await getAdvice(prisma, { deckId, plan, params, onlyCached: true });
    if (cached || onlyCached) return NextResponse.json(cached);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    if (rateLimited(ip)) {
      return NextResponse.json({ error: "Demasiadas análises novas na última hora. Tenta mais tarde." }, { status: 429 });
    }
    hits.get(ip)!.push(Date.now());
    return NextResponse.json(await getAdvice(prisma, { deckId, plan, params }));
  } catch (err) {
    if (err instanceof AdviceError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Erro inesperado ao gerar a análise." }, { status: 500 });
  }
}
