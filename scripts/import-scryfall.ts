/**
 * Importa o bulk "oracle_cards" do Scryfall para a base de dados.
 * Correr 1x por dia (o Scryfall só gera o bulk a cada 12 h):
 *
 *   npm run import:scryfall            # salta se o bulk não mudou
 *   npm run import:scryfall -- --force # importa mesmo assim
 *   npm run import:scryfall -- --file caminho/oracle-cards.jsonl.gz
 *   npm run import:scryfall -- --no-fill-prices   # não preenche preços em falta
 *
 * Depois do oracle_cards, as cartas cuja impressão escolhida não tem preço
 * recebem o preço da impressão mais barata (bulk default_cards).
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { prisma } from "@/lib/db";
import { upsertCards } from "@/lib/cards/store";
import { fetchBulkInfo, scryfallHeaders } from "@/lib/scryfall/client";
import { isGameCard, mapScryfallCard, type CardData } from "@/lib/scryfall/map";
import { addPrinting, type PriceAcc } from "@/lib/scryfall/prices";
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

async function readLines(file: string | undefined, url: string | undefined, onCard: (c: ScryfallCard) => void) {
  const rl = createInterface({ input: await openSource(file, url), crlfDelay: Infinity });
  for await (const line of rl) {
    const card = parseBulkLine(line);
    if (card) onCard(card);
  }
}

/** Preenche preços em falta com a impressão mais barata (bulk default_cards). */
async function fillMissingPrices() {
  const missing = await prisma.card.findMany({
    where: { OR: [{ priceEurCents: null }, { priceUsdCents: null }] },
    select: { id: true, priceEurCents: true, priceUsdCents: true },
  });
  if (!missing.length) return;
  const want = new Map(missing.map((c) => [c.id, c]));
  const info = await fetchBulkInfo("default_cards");
  const acc = new Map<string, PriceAcc>();
  const started = Date.now();
  await readLines(undefined, info.jsonl_download_uri ?? info.download_uri, (card) => {
    if (card.oracle_id && want.has(card.oracle_id)) acc.set(card.oracle_id, addPrinting(acc.get(card.oracle_id), card));
  });

  const updates = [];
  for (const [id, p] of acc) {
    const cur = want.get(id)!;
    const data: { priceEurCents?: number; priceUsdCents?: number } = {};
    if (cur.priceEurCents == null && p.eur != null) data.priceEurCents = p.eur;
    if (cur.priceUsdCents == null && p.usd != null) data.priceUsdCents = p.usd;
    if (Object.keys(data).length) updates.push(prisma.card.update({ where: { id }, data }));
  }
  for (let i = 0; i < updates.length; i += 500) await prisma.$transaction(updates.slice(i, i + 500));
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Preços em falta: ${missing.length} cartas, ${updates.length} preenchidas com a impressão mais barata (${secs}s).`);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const fileIdx = args.indexOf("--file");
  const file = fileIdx >= 0 ? args[fileIdx + 1] : undefined;
  const fillPrices = !args.includes("--no-fill-prices") && !file;

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
    if (fillPrices) await fillMissingPrices();
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
