import { notFound } from "next/navigation";
import { DeckView, type DeckLinks, type DeckTab } from "@/components/views/DeckView";
import { prisma } from "@/lib/db";
import { evaluateLoadedDeck } from "@/lib/deck/evaluation";
import { loadDeck } from "@/lib/deck/load";
import { parseEvalParams, type RawParams } from "@/lib/deck/params";
import { prismaSource } from "@/lib/deck/serverSource";

export const dynamic = "force-dynamic";

export default async function DeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const evalParams = parseEvalParams(raw);
  const tab: DeckTab = raw.v === "avaliacao" || raw.v === "mesa" ? raw.v : "cartas";
  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck) notFound();

  const [loaded, lastImport] = await Promise.all([
    loadDeck(prismaSource(prisma), deck.text),
    prisma.importRun.findFirst({ where: { status: "ok" }, orderBy: { finishedAt: "desc" } }),
  ]);
  const evaluation = tab !== "cartas" ? evaluateLoadedDeck(loaded, evalParams) : null;

  const href = (changes: Record<string, string | null>) => {
    const sp = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"));
    for (const [k, v] of Object.entries(changes)) {
      if (v == null) sp.delete(k);
      else sp.set(k, v);
    }
    const q = sp.toString();
    return `/deck/${id}${q ? `?${q}` : ""}`;
  };
  const links: DeckLinks = {
    cartas: href({ v: null }),
    avaliacao: href({ v: "avaliacao" }),
    mesa: href({ v: "mesa" }),
    eur: href({ moeda: null }),
    usd: href({ moeda: "usd" }),
    version: `/?from=${id}&base=${id}`,
    edit: `/?from=${id}`,
  };

  return (
    <DeckView
      deckKey={id}
      loaded={loaded}
      evaluation={evaluation}
      tab={tab}
      params={evalParams}
      links={links}
      pricesDate={lastImport?.finishedAt ?? null}
    />
  );
}
