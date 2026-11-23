/** Carrega data/category-overrides.json para a tabela CardCategory. */
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/db";
import { normalizeName } from "@/lib/cards/normalize";
import { isCategory } from "@/lib/categories/types";

type Entry = { name: string; add?: string[]; remove?: string[]; note?: string };

async function main() {
  const { cards } = JSON.parse(readFileSync("data/category-overrides.json", "utf8")) as { cards: Entry[] };
  const rows: { cardId: string; category: string; include: boolean; note: string | null }[] = [];
  const problems: string[] = [];

  for (const e of cards) {
    const hits = await prisma.cardName.findMany({ where: { name: normalizeName(e.name) }, include: { card: true } });
    const hit = hits.find((h) => normalizeName(h.card.name) === normalizeName(e.name));
    if (!hit) {
      problems.push(`carta não encontrada: ${e.name}`);
      continue;
    }
    for (const [list, include] of [[e.add ?? [], true], [e.remove ?? [], false]] as const) {
      for (const c of list) {
        if (!isCategory(c)) problems.push(`${e.name}: categoria desconhecida "${c}"`);
        else rows.push({ cardId: hit.cardId, category: c, include, note: e.note || null });
      }
    }
  }

  await prisma.$transaction([prisma.cardCategory.deleteMany(), prisma.cardCategory.createMany({ data: rows })]);
  console.log(`${rows.length} correções carregadas.`);
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
  }
}

main().finally(() => prisma.$disconnect());
