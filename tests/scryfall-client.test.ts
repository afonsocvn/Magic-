import { describe, expect, it } from "vitest";
import { chunk, createRateLimiter, fetchCollection, retryAfterMs, scryfallFetch } from "@/lib/scryfall/client";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

const noLimit = <T,>(task: () => Promise<T>) => task();

describe("rate limiter", () => {
  it("espaça os pedidos pelo menos 500 ms", async () => {
    let t = 0;
    const starts: number[] = [];
    const schedule = createRateLimiter(500, () => t, async (ms) => void (t += ms));
    await Promise.all([1, 2, 3, 4].map(() => schedule(async () => void starts.push(t))));
    expect(starts).toEqual([0, 500, 1000, 1500]);
  });
});

describe("scryfallFetch", () => {
  it("envia User-Agent e Accept", async () => {
    let headers: Record<string, string> = {};
    await scryfallFetch("/x", {}, {
      schedule: noLimit,
      fetch: async (_u, init) => {
        headers = init!.headers as Record<string, string>;
        return json({ ok: 1 });
      },
    });
    expect(headers["User-Agent"]).toBeTruthy();
    expect(headers.Accept).toBe("application/json");
  });

  it("respeita o 429: espera o Retry-After e repete", async () => {
    const waits: number[] = [];
    let calls = 0;
    const res = await scryfallFetch<{ ok: number }>("/x", {}, {
      schedule: noLimit,
      sleep: async (ms) => void waits.push(ms),
      fetch: async () => (++calls === 1 ? json({}, 429, { "Retry-After": "2" }) : json({ ok: 1 })),
    });
    expect(res.ok).toBe(1);
    expect(waits).toEqual([2000]);
  });

  it("desiste depois de 3 tentativas", async () => {
    await expect(
      scryfallFetch("/x", {}, { schedule: noLimit, sleep: async () => {}, fetch: async () => json({}, 429) }),
    ).rejects.toThrow(/429/);
  });

  it("Retry-After inválido → 1 s", () => {
    expect(retryAfterMs(null)).toBe(1000);
    expect(retryAfterMs("abc")).toBe(1000);
  });
});

describe("fetchCollection", () => {
  it("divide em lotes de 75", async () => {
    const sizes: number[] = [];
    const ids = Array.from({ length: 160 }, (_, i) => ({ name: `c${i}` }));
    const res = await fetchCollection(ids, {
      schedule: noLimit,
      fetch: async (_u, init) => {
        const body = JSON.parse(init!.body as string);
        sizes.push(body.identifiers.length);
        return json({ object: "list", data: [], not_found: body.identifiers });
      },
    });
    expect(sizes).toEqual([75, 75, 10]);
    expect(res.notFound).toHaveLength(160);
  });

  it("chunk", () => {
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
  });
});
