import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avaliação de decks Commander",
  description: "Cola a decklist e vê as cartas, os preços e uma avaliação matemática do deck.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt">
      <body className="min-h-screen flex flex-col antialiased">
        <SiteHeader />

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">{children}</main>

        <SiteFooter />
      </body>
    </html>
  );
}
