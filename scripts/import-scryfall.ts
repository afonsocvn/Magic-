/**
 * Importa o bulk "oracle_cards" do Scryfall para a base de dados.
 * Correr 1x por dia (o Scryfall só gera o bulk a cada 12 h):
 *
 *   npm run import:scryfall            # salta se o bulk não mudou
 *   npm run import:scryfall -- --force # importa mesmo assim
 *   npm run import:scryfall -- --file caminho/oracle-cards.jsonl.gz
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { prisma } from "@/lib/db";
import { upsertCards } from "@/lib/cards/store";
import { fetchBulkInfo, scryfallHeaders } from "@/lib/scryfall/client";
import { isGameCard, mapScryfallCard, type CardData } from "@/lib/scryfall/map";
import type { ScryfallCard } from "@/lib/scryfall/types";

const BATCH = 1000;

/** Aceita JSONL e também o formato antigo (array JSON com uma carta por linha). */
export function parseBulkLine(line: string): ScryfallCard | null {
  const t = line.trim().replace(/,$/, "");
  if (!t || t === "[" || t === "]") return null;
  return JSON.parse(t) as ScryfallCard;
}

async function openSource(file: string | undefined, url: string | undefined): Promise<NodeJS.ReadableStream> {
  if (file) {
    const s = createReadStream(file);
    return file.endsWith(".gz") ? s.pipe(createGunzip()) : s;
  }
  if (!url) throw new Error("O bulk não tem link de download.");
  const res = await fetch(url, { headers: scryfallHeaders() });
  if (!res.ok || !res.body) throw new Error(`Download falhou: ${res.status}`);
  const body = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
  // O servidor pode já descomprimir (Content-Encoding); só fazemos gunzip se vier comprimido.
  const encoded = res.headers.get("content-encoding")?.includes("gzip");
  return url.endsWith(".gz") && !encoded ? body.pipe(createGunzip()) : body;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const fileIdx = args.indexOf("--file");
  const file = fileIdx >= 0 ? args[fileIdx + 1] : undefined;

  let bulkUpdatedAt: Date | null = null;
  let url: string | undefined;
  if (!file) {
    const info = await fetchBulkInfo("oracle_cards");
    bulkUpdatedAt = new Date(info.updated_at);
    url = info.jsonl_download_uri ?? info.download_uri;
    const last = await prisma.importRun.findFirst({ where: { status: "ok" }, orderBy: { startedAt: "desc" } });
    if (!force && last?.bulkUpdatedAt && last.bulkUpdatedAt.getTime() === bulkUpdatedAt.getTime()) {
      console.log(`Bulk de ${info.updated_at} já importado. Nada a fazer (usa --force para repetir).`);
      await prisma.importRun.create({
        data: { status: "skipped", bulkUpdatedAt, finishedAt: new Date(), message: "bulk sem alterações" },
      });
      return;
    }
  }

  const run = await prisma.importRun.create({ data: { bulkUpdatedAt } });
  const started = Date.now();
  let count = 0;
  let skipped = 0;
  try {
    const rl = createInterface({ input: await openSource(file, url), crlfDelay: Infinity });
    let batch: CardData[] = [];
    for await (const line of rl) {
      const card = parseBulkLine(line);
      if (!card) continue;
      if (!isGameCard(card)) {
        skipped++;
        continue;
      }
      batch.push(mapScryfallCard(card, "bulk"));
      if (batch.length >= BATCH) {
        await upsertCards(prisma, batch);
        count += batch.length;
        batch = [];
        process.stdout.write(`\r${count} cartas…`);
      }
    }
    await upsertCards(prisma, batch);
    count += batch.length;

    const secs = ((Date.now() - started) / 1000).toFixed(1);
    await prisma.importRun.update({
      where: { id: run.id },
      data: { status: "ok", finishedAt: new Date(), cardCount: count, message: `${skipped} objetos ignorados (tokens, art cards…)` },
    });
    console.log(`\r${count} cartas importadas em ${secs}s (${skipped} tokens/art cards ignorados).`);
  } catch (err) {
    await prisma.importRun.update({
      where: { id: run.id },
      data: { status: "failed", finishedAt: new Date(), cardCount: count, message: String(err) },
    });
    throw err;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
