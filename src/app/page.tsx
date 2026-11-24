import { DeckForm } from "@/components/DeckForm";
import { MyDecks } from "@/components/MyDecks";
import { HomeAside } from "@/components/SiteChrome";
import { prisma } from "@/lib/db";

export default async function Home({ searchParams }: { searchParams: Promise<{ from?: string; base?: string }> }) {
  const { from, base } = await searchParams;
  const previous = from ? await prisma.deck.findUnique({ where: { id: from } }) : null;
  const baseDeck = base && /^[0-9a-f]{16}$/.test(base) ? await prisma.deck.findUnique({ where: { id: base } }) : null;

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_17rem]">
      <section>
        <h1 className="text-2xl mb-1">{baseDeck ? "Nova versão do deck" : "Colar a decklist"}</h1>
        <p className="text-ink-2 mb-6 max-w-prose">
          {baseDeck ? (
            "Muda as cartas que quiseres. Ao avaliar, vês esta versão lado a lado com a anterior."
          ) : (
            <>
              Uma carta por linha. O comandante vai debaixo de <code className="num text-ink">{"// COMMANDER"}</code>.
            </>
          )}
        </p>
        <DeckForm initialText={previous?.text} baseId={baseDeck?.id} />
        <div className="mt-12">
          <MyDecks />
        </div>
      </section>

      <HomeAside />
    </div>
  );
}
