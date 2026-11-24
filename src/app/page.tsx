import { DeckForm } from "@/components/DeckForm";
import { MyDecks } from "@/components/MyDecks";
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

      <aside className="text-sm md:border-l md:border-rule md:pl-6 space-y-5">
        <div>
          <h2 className="text-base mb-2">Formatos aceites</h2>
          <ul className="num text-[12.5px] space-y-1">
            <li>1 Sol Ring (TRC) 499</li>
            <li>1x Sol Ring</li>
            <li>1 Sol Ring</li>
            <li>10 Forest</li>
          </ul>
          <p className="mt-2 text-ink-2">
            Exportações do Moxfield, Archidekt e Arena funcionam. Sideboard e maybeboard são ignorados.
          </p>
        </div>
        <div>
          <h2 className="text-base mb-2">O que é verificado</h2>
          <ul className="space-y-1 text-ink-2">
            <li>100 cartas, contando o comandante</li>
            <li>Uma cópia de cada (exceto básicos)</li>
            <li>Identidade de cor do comandante</li>
            <li>Legalidade em Commander</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
