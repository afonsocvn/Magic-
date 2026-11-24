import { notFound } from "next/navigation";
import { CompareView } from "@/components/views/CompareView";
import { prisma } from "@/lib/db";
import { loadDeck } from "@/lib/deck/load";
import { parseEvalParams, type RawParams } from "@/lib/deck/params";
import { prismaSource } from "@/lib/deck/serverSource";

export const dynamic = "force-dynamic";

const ID = /^[0-9a-f]{16}$/;

export default async function ComparePage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const a = typeof raw.a === "string" && ID.test(raw.a) ? raw.a : null;
  const b = typeof raw.b === "string" && ID.test(raw.b) ? raw.b : null;
  if (!a || !b) notFound();
  const [deckA, deckB] = await Promise.all([
    prisma.deck.findUnique({ where: { id: a } }),
    prisma.deck.findUnique({ where: { id: b } }),
  ]);
  if (!deckA || !deckB) notFound();

  const params = parseEvalParams(raw);
  const source = prismaSource(prisma);
  const [la, lb] = await Promise.all([loadDeck(source, deckA.text), loadDeck(source, deckB.text)]);

  return (
    <CompareView
      a={a}
      b={b}
      la={la}
      lb={lb}
      params={params}
      links={{ a: `/deck/${a}?v=avaliacao`, b: `/deck/${b}?v=avaliacao` }}
    />
  );
}
