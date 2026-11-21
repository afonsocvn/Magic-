import Link from "next/link";
import { notFound } from "next/navigation";
import { ColorPips } from "@/components/ColorPips";
import { ValidationReport } from "@/components/ValidationReport";
import { prisma } from "@/lib/db";
import { loadDeck } from "@/lib/deck/load";

export const dynamic = "force-dynamic";

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck) notFound();

  const loaded = await loadDeck(prisma, deck.text);
  const commander = loaded.commander[0]?.card;
  const rows = [...loaded.commander, ...loaded.main];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule pb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-2">Comandante</p>
          <h1 className="text-2xl">
            {commander ? commander.name : "—"}{" "}
            {commander && <ColorPips identity={commander.colorIdentity} size={18} />}
          </h1>
        </div>
        <Link href={`/?from=${id}`} className="text-sm">
          Editar lista
        </Link>
      </div>

      <ValidationReport result={loaded.validation} />

      <section>
        <h2 className="text-lg mb-3">
          Cartas <span className="num text-sm text-ink-2">({loaded.validation.totalCards})</span>
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs text-ink-2 border-b border-rule">
              <th className="py-1 pr-3 font-normal w-10">Qt.</th>
              <th className="py-1 pr-3 font-normal">Nome</th>
              <th className="py-1 pr-3 font-normal hidden sm:table-cell">Tipo</th>
              <th className="py-1 font-normal w-20">Cor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ entry, card }) => (
              <tr key={entry.line} className="border-b border-rule/60">
                <td className="py-1 pr-3 num">{entry.quantity}</td>
                <td className="py-1 pr-3">
                  {card.name}
                  {entry.section === "commander" && <span className="ml-2 text-xs text-accent">comandante</span>}
                </td>
                <td className="py-1 pr-3 text-ink-2 hidden sm:table-cell">{card.typeLine}</td>
                <td className="py-1">
                  <ColorPips identity={card.colorIdentity} size={14} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
