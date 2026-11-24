import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-serif text-lg font-semibold tracking-tight no-underline">
          Commander<span className="text-accent">/</span>avaliação
        </Link>
        <span className="hidden text-xs text-ink-2 sm:inline">decks de 100 cartas · Magic: The Gathering</span>
      </div>
    </header>
  );
}

export function SiteFooter({ note }: { note?: string }) {
  return (
    <footer className="border-t border-rule text-xs text-ink-2">
      <div className="mx-auto max-w-6xl space-y-1 px-4 py-4">
        <p>
          Dados, imagens e preços das cartas:{" "}
          <a href="https://scryfall.com" target="_blank" rel="noreferrer">
            Scryfall
          </a>
          . Os preços são de referência e podem ter até 24 h.{note ? ` ${note}` : ""}
        </p>
        <p>
          Magic: The Gathering e todo o seu conteúdo são propriedade da Wizards of the Coast. Este site não é produzido,
          apoiado nem afiliado com a Wizards of the Coast nem com o Scryfall.
        </p>
      </div>
    </footer>
  );
}

/** Coluna lateral da página inicial: formatos aceites e o que é verificado. */
export function HomeAside() {
  return (
    <aside className="space-y-5 text-sm md:border-l md:border-rule md:pl-6">
      <div>
        <h2 className="mb-2 text-base">Formatos aceites</h2>
        <ul className="num space-y-1 text-[12.5px]">
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
        <h2 className="mb-2 text-base">O que é verificado</h2>
        <ul className="space-y-1 text-ink-2">
          <li>100 cartas, contando o comandante</li>
          <li>Uma cópia de cada (exceto básicos)</li>
          <li>Identidade de cor do comandante</li>
          <li>Legalidade em Commander</li>
        </ul>
      </div>
    </aside>
  );
}
