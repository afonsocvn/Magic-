import { defaultContext, type TableContext } from "@/lib/math/table";
import type { TemplateId } from "@/lib/math/templates";
import type { Currency } from "./groups";

export type EvalParams = { currency: Currency; template: TemplateId; context: TableContext; hands: number };

export type RawParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Lê as opções da avaliação do URL (?t=ct&j=2&l=2&n=4&c1=0&mg=1&moeda=usd). */
export function parseEvalParams(raw: RawParams): EvalParams {
  const players = ([2, 3, 4] as const).find((p) => String(p) === one(raw.j)) ?? 4;
  const ctx = defaultContext(players, Number(one(raw.l)) || 1);
  const c1 = one(raw.c1);
  const mg = one(raw.mg);
  if (c1 === "0" || c1 === "1") ctx.firstPlayerDraws = c1 === "1";
  if (mg === "0" || mg === "1") ctx.freeMulligan = mg === "1";
  const n = Number(one(raw.n));
  return {
    currency: one(raw.moeda) === "usd" ? "usd" : "eur",
    template: one(raw.t) === "ct" ? "ct" : "cz",
    context: ctx,
    hands: Number.isInteger(n) && n >= 1 && n <= 7 ? n : 4,
  };
}
