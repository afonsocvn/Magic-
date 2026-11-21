import type { BulkDataInfo, CollectionIdentifier, CollectionResponse, ScryfallCard } from "./types";

export const SCRYFALL_API = "https://api.scryfall.com";
/** O Scryfall pede no máximo ~10 pedidos/s; nós ficamos por 2/s. */
export const MIN_INTERVAL_MS = 500;
export const COLLECTION_BATCH = 75;
const MAX_RETRIES = 3;

export function scryfallHeaders(): Record<string, string> {
  return {
    "User-Agent": process.env.SCRYFALL_USER_AGENT || "CommanderDeckEval/0.1",
    Accept: "application/json",
  };
}

type Sleep = (ms: number) => Promise<void>;
const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fila que garante pelo menos `intervalMs` entre o início de pedidos
 * consecutivos, partilhada por todo o processo.
 */
export function createRateLimiter(intervalMs: number, now: () => number = Date.now, sleep: Sleep = realSleep) {
  let next = 0;
  let chain: Promise<void> = Promise.resolve();
  return function schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = chain.then(async () => {
      const wait = next - now();
      if (wait > 0) await sleep(wait);
      next = now() + intervalMs;
    });
    chain = run.catch(() => {});
    return run.then(task);
  };
}

const limiter = createRateLimiter(MIN_INTERVAL_MS);

export class ScryfallError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Segundos do cabeçalho Retry-After (ou 1 s se não vier). */
export function retryAfterMs(header: string | null): number {
  const s = header ? Number(header) : NaN;
  return Number.isFinite(s) && s > 0 ? s * 1000 : 1000;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Pedido à API com limite de ritmo, cabeçalhos obrigatórios e
 * respeito pelo 429 (espera o Retry-After e tenta de novo).
 */
export async function scryfallFetch<T>(
  path: string,
  init: RequestInit = {},
  deps: { fetch?: FetchLike; sleep?: Sleep; schedule?: typeof limiter } = {},
): Promise<T> {
  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? realSleep;
  const schedule = deps.schedule ?? limiter;
  const url = path.startsWith("http") ? path : SCRYFALL_API + path;

  for (let attempt = 0; ; attempt++) {
    const res = await schedule(() =>
      doFetch(url, { ...init, headers: { ...scryfallHeaders(), ...(init.headers as Record<string, string>) } }),
    );
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await sleep(retryAfterMs(res.headers.get("Retry-After")));
      continue;
    }
    if (!res.ok) {
      let detail = "";
      try {
        detail = ((await res.json()) as { details?: string }).details ?? "";
      } catch {}
      throw new ScryfallError(`Scryfall ${res.status} em ${path}${detail ? `: ${detail}` : ""}`, res.status);
    }
    return (await res.json()) as T;
  }
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** /cards/collection em lotes de 75. */
export async function fetchCollection(
  identifiers: CollectionIdentifier[],
  deps?: Parameters<typeof scryfallFetch>[2],
): Promise<{ cards: ScryfallCard[]; notFound: CollectionIdentifier[] }> {
  const cards: ScryfallCard[] = [];
  const notFound: CollectionIdentifier[] = [];
  for (const batch of chunk(identifiers, COLLECTION_BATCH)) {
    const res = await scryfallFetch<CollectionResponse>(
      "/cards/collection",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: batch }),
      },
      deps,
    );
    cards.push(...res.data);
    notFound.push(...res.not_found);
  }
  return { cards, notFound };
}

export function fetchBulkInfo(type = "oracle_cards"): Promise<BulkDataInfo> {
  return scryfallFetch<BulkDataInfo>(`/bulk-data/${type.replace("_", "-")}`);
}
