import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avaliação de decks Commander",
  description: "Cola a decklist e vê as cartas, os preços e uma avaliação matemática do deck.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt">
      <body className="min-h-screen flex flex-col antialiased">
        <header className="border-b border-rule">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-baseline justify-between gap-4">
            <Link href="/" className="no-underline font-serif text-lg font-semibold tracking-tight">
              Commander<span className="text-accent">/</span>avaliação
            </Link>
            <span className="text-xs text-ink-2 hidden sm:inline">decks de 100 cartas · Magic: The Gathering</span>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">{children}</main>

        <footer className="border-t border-rule text-xs text-ink-2">
          <div className="mx-auto max-w-6xl px-4 py-4 space-y-1">
            <p>
              Dados, imagens e preços das cartas:{" "}
              <a href="https://scryfall.com" target="_blank" rel="noreferrer">
                Scryfall
              </a>
              . Os preços são de referência e podem ter até 24 h.
            </p>
            <p>
              Magic: The Gathering e todo o seu conteúdo são propriedade da Wizards of the Coast. Este site não é
              produzido, apoiado nem afiliado com a Wizards of the Coast nem com o Scryfall.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
