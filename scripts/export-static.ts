/**
 * Exporta as cartas da base de dados para a versão estática (GitHub Pages):
 *   npm run export:static   → out-static/data/cards.json + meta.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/db";
import type { CardFaceData, CardImages } from "@/lib/scryfall/map";
import { LEGALITY_CODE, type PackedCard, type StaticMeta } from "@/static/format";

const OUT = process.argv[2] ?? "out-static/data";

async function main() {
  const [cards, lastImport] = await Promise.all([
    prisma.card.findMany({ include: { categories: true }, orderBy: { name: "asc" } }),
    prisma.importRun.findFirst({ where: { status: "ok" }, orderBy: { finishedAt: "desc" } }),
  ]);
  const packed: PackedCard[] = cards.map((c) => {
    const faces = c.faces as CardFaceData[] | null;
    const img = c.imageUris as CardImages | null;
    return [
      c.scryfallId,
      c.name,
      c.layout,
      c.manaCost,
      c.cmc,
      c.typeLine,
      c.oracleText,
      c.colorIdentity,
      c.producedMana,
      LEGALITY_CODE[c.commanderLegality] ?? "n",
      c.gameChanger ? 1 : 0,
      c.priceEurCents,
      c.priceUsdCents,
      faces?.length
        ? faces.map((f, i) => [f.name, f.manaCost, f.typeLine, f.oracleText, f.imageUris ? (i === 0 ? 1 : 2) : 0])
        : 0,
      c.tagCategories,
      c.categories.length ? c.categories.map((o) => [o.category, o.include ? 1 : 0]) : 0,
      img ? 1 : 0,
    ];
  });
  const meta: StaticMeta = {
    exportedAt: new Date().toISOString(),
    bulkUpdatedAt: lastImport?.finishedAt?.toISOString() ?? null,
    cards: packed.length,
  };
  mkdirSync(OUT, { recursive: true });
  // Uma carta por linha: o ficheiro lê-se e compara-se bem no git/diffs.
  writeFileSync(`${OUT}/cards.json`, "[\n" + packed.map((p) => JSON.stringify(p)).join(",\n") + "\n]\n");
  writeFileSync(`${OUT}/meta.json`, JSON.stringify(meta));
  console.log(`${packed.length} cartas exportadas para ${OUT}`);
}

main().finally(() => prisma.$disconnect());
