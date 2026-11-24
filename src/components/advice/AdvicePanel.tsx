"use client";
/* eslint-disable @next/next/no-img-element -- imagens do Scryfall */

import { useCallback, useEffect, useRef, useState } from "react";
import { formatPrice, type Currency } from "@/lib/deck/groups";
import type { AdviceResponse } from "@/lib/advice/service";

type Props = {
  deckId: string;
  params: Record<string, string>;
  currency: Currency;
  initialPlan: string;
  valid: boolean;
};

const dateFmt = new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" });

export function AdvicePanel({ deckId, params, currency, initialPlan, valid }: Props) {
  const [plan, setPlan] = useState(initialPlan);
  const [data, setData] = useState<AdviceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const call = useCallback(
    async (onlyCached: boolean, planText: string) => {
      const res = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, plan: planText, params, onlyCached }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `Erro ${res.status}`);
      return json as AdviceResponse | null;
    },
    [deckId, params],
  );

  // Mostrar a análise em cache, se já existir para este deck + plano + opções.
  useEffect(() => {
    call(true, initialPlan)
      .then((r) => r && setData(r))
      .catch(() => {});
  }, [call, initialPlan]);

  async function analyse() {
    setError(null);
    setLoading(true);
    setElapsed(0);
    timer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    try {
      setData(await call(false, plan));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (timer.current) clearInterval(timer.current);
      setLoading(false);
    }
  }

  const a = data?.advice;

  return (
    <div className="space-y-10">
      <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-3">
          <label htmlFor="plan" className="block text-sm">
            Plano do deck <span className="text-ink-2">(opcional)</span>
          </label>
          <textarea
            id="plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="ex.: deathtouch nos feitiços + pings funcionam como board wipes"
            className="block w-full resize-y border border-rule bg-paper-2/40 px-3 py-2 text-sm placeholder:text-ink-2/60 focus:border-ink focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={analyse}
              disabled={loading || !valid}
              className="border border-ink bg-ink px-4 py-1.5 text-sm text-paper hover:border-accent hover:bg-accent disabled:opacity-60"
            >
              {loading ? `A analisar… ${elapsed}s` : data ? "Analisar de novo" : "Analisar com o Claude"}
            </button>
            {loading && <span className="text-xs text-ink-2">Pode demorar um a dois minutos.</span>}
            {!valid && <span className="text-xs text-bad">Corrige primeiro os problemas da decklist.</span>}
          </div>
          {error && (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          )}
        </div>
        <p className="text-xs text-ink-2 md:border-l md:border-rule md:pl-6">
          O Claude lê as 100 cartas com o oracle text, as métricas da avaliação e o plano que escreveres, e devolve uma
          análise. As sugestões são confirmadas na base de dados: só aparecem cartas que existem, são legais e respeitam
          a identidade de cor. Cada análise nova usa a API da Anthropic (custa uns cêntimos); a resposta fica guardada
          para este deck, plano e opções.
        </p>
      </section>

      {a && data && (
        <>
          <section aria-labelledby="adv-plano" className="space-y-4">
            <h2 id="adv-plano" className="border-b border-rule pb-1 text-lg">
              Plano e sinergias
            </h2>
            <p className="max-w-prose leading-relaxed">{a.plan}</p>
            <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {a.synergies.map((s, i) => (
                <li key={i} className="border-t border-rule/60 pt-2 text-sm">
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-0.5 text-xs text-ink-2">{s.cards.join(" · ")}</p>
                  <p className="mt-1 leading-relaxed">{s.explanation}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <h2 className="border-b border-rule pb-1 text-lg">Pontos fortes</h2>
              <ul className="space-y-3 text-sm">
                {a.strengths.map((s, i) => (
                  <li key={i}>
                    <p className="font-medium">{s.title}</p>
                    <p className="leading-relaxed text-ink-2">{s.explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h2 className="border-b border-rule pb-1 text-lg">Pontos fracos</h2>
              <ul className="space-y-3 text-sm">
                {a.weaknesses.map((w, i) => (
                  <li key={i}>
                    <p className="font-medium">
                      {w.title} <span className="ml-1 text-xs font-normal text-accent">{w.area}</span>
                    </p>
                    <p className="leading-relaxed text-ink-2">{w.explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-labelledby="adv-fracas" className="space-y-3">
            <h2 id="adv-fracas" className="border-b border-rule pb-1 text-lg">
              Cartas mais fracas
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {a.weakestCards.map((w, i) => (
                  <tr key={i} className="border-b border-rule/60 align-baseline">
                    <td className="w-1/3 py-1.5 pr-4">{w.name}</td>
                    <td className="py-1.5 text-ink-2">{w.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="adv-sug" className="space-y-4">
            <h2 id="adv-sug" className="border-b border-rule pb-1 text-lg">
              Sugestões <span className="num text-sm text-ink-2">{a.suggestions.length}</span>
            </h2>
            <ul className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {a.suggestions.map((s) => {
                const price = currency === "eur" ? s.card.priceEurCents : s.card.priceUsdCents;
                return (
                  <li key={s.card.id} className="grid grid-cols-[6.5rem_1fr] gap-3 text-sm">
                    {s.card.image ? (
                      <img
                        src={s.card.image}
                        alt={s.name}
                        loading="lazy"
                        width={488}
                        height={680}
                        className="h-auto w-full rounded-[4.5%/3.2%] bg-paper-2"
                      />
                    ) : (
                      <div className="aspect-[488/680] border border-rule bg-paper-2" />
                    )}
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium leading-tight">{s.name}</p>
                      <p className="num text-xs">{formatPrice(price, currency)}</p>
                      <p className="text-xs text-ink-2">
                        para: <span className="text-accent">{s.fills}</span>
                        {s.replaces && <> · sai: {s.replaces}</>}
                      </p>
                      <p className="leading-snug">{s.reason}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {a.rejected.length > 0 && (
              <p className="text-xs text-ink-2">
                {a.rejected.length === 1 ? "1 sugestão descartada" : `${a.rejected.length} sugestões descartadas`} pela
                verificação: {a.rejected.map((r) => `${r.name} (${r.reason})`).join(", ")}.
              </p>
            )}
          </section>

          <p className="text-xs text-ink-2">
            Análise de {data.model}, {dateFmt.format(new Date(data.createdAt))}
            {data.cached ? " (guardada)" : ""}. Pode ter erros: confirma as cartas antes de as comprar.
          </p>
        </>
      )}
    </div>
  );
}
