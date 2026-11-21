import type { ScryfallCard } from "./types";

export type PriceAcc = { eur: number | null; usd: number | null };

function cents(v: string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Math.round(parseFloat(v) * 100);
  return Number.isFinite(n) ? n : null;
}

function min(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

/**
 * Atualiza o preço mais barato de uma carta com uma impressão.
 * Usa o preço normal; o foil só conta se a impressão não tiver normal.
 */
export function addPrinting(acc: PriceAcc | undefined, printing: ScryfallCard): PriceAcc {
  const p = printing.prices ?? {};
  const eur = cents(p.eur) ?? cents(p.eur_foil);
  const usd = cents(p.usd) ?? cents(p.usd_foil) ?? cents(p.usd_etched);
  return { eur: min(acc?.eur ?? null, eur), usd: min(acc?.usd ?? null, usd) };
}
