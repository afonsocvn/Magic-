import Link from "next/link";
import { notFound } from "next/navigation";
import { ColorPips } from "@/components/ColorPips";
import { RememberDeck } from "@/components/RememberDeck";
import { SavedName } from "@/components/SavedName";
import { EvalControls } from "@/components/eval/EvalControls";
import { Improvements } from "@/components/eval/Improvements";
import { ProfileCharts } from "@/components/eval/ProfileCharts";
import { prisma } from "@/lib/db";
import { compareMetrics, compareScoreParts, diffDecks } from "@/lib/deck/compare";
import { allLines, evaluateLoadedDeck } from "@/lib/deck/evaluation";
import { deckTotal, formatPrice } from "@/lib/deck/groups";
import { loadDeck } from "@/lib/deck/load";
import { parseEvalParams, type RawParams } from "@/lib/deck/params";
import { num } from "@/lib/format";
import { CURVE_MAX } from "@/lib/math/mana";

export const dynamic = "force-dynamic";

const ID = /^[0-9a-f]{16}$/;

function Delta({ value, better, children }: { value: number; better: boolean | null; children: React.ReactNode }) {
  const color = better == null || value === 0 ? "text-ink-2" : better ? "text-ok" : "text-bad";
  return <span className={`num ${color}`}>{children}</span>;
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const a = typeof raw.a === "string" && ID.test(raw.a) ? raw.a : null;
  const b = typeof raw.b === "string" && ID.test(raw.b) ? raw.b : null;
  if (!a || !b) notFound();
  const [deckA, deckB] = await Promise.all([prisma.deck.findUnique({ where: { id: a } }), prisma.deck.findUnique({ where: { id: b } })]);
  if (!deckA || !deckB) notFound();

  const params = parseEvalParams(raw);
  const [la, lb] = await Promise.all([loadDeck(prisma, deckA.text), loadDeck(prisma, deckB.text)]);
  const [ea, eb] = [evaluateLoadedDeck(la, params), evaluateLoadedDeck(lb, params)];
  const ca = la.commander[0]?.card;
  const cb = lb.commander[0]?.card;
  const diff = diffDecks(allLines(la), allLines(lb));
  const metrics = compareMetrics(ea, eb);
  const parts = compareScoreParts(ea, eb);
  const priceA = deckTotal(allLines(la), params.currency).totalCents;
  const priceB = deckTotal(allLines(lb), params.currency).totalCents;
  const scoreDelta = eb.score.total - ea.score.total;

  return (
    <div className="space-y-10">
      {ca && <RememberDeck silent id={a} commander={ca.name} identity={ca.colorIdentity} />}
      {cb && <RememberDeck silent id={b} commander={cb.name} identity={cb.colorIdentity} baseId={a} />}

      <div className="space-y-3 border-b border-rule pb-4">
        <p className="text-xs uppercase tracking-wider text-ink-2">Comparar versões</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["A · base", a, ca, "base"],
              ["B · nova", b, cb, "main"],
            ] as const
          ).map(([label, id, c, tone]) => (
            <div key={id} className="flex items-baseline gap-3">
              <span
                className="inline-block h-0.5 w-5 shrink-0 self-center"
                style={{ background: tone === "main" ? "var(--accent)" : "var(--ink-2)" }}
                aria-hidden
              />
              <div>
                <p className="text-xs text-ink-2">{label}</p>
                <Link href={`/deck/${id}?v=avaliacao`} className="font-serif text-lg no-underline hover:underline">
                  <SavedName id={id} fallback={c?.name ?? "—"} />
                </Link>{" "}
                {c && <ColorPips identity={c.colorIdentity} size={15} />}
              </div>
            </div>
          ))}
        </div>
        {(!la.validation.ok || !lb.validation.ok) && (
          <p className="text-sm text-warn">
            {!la.validation.ok && "A versão A"} {!la.validation.ok && !lb.validation.ok && "e"} {!lb.validation.ok && "a versão B"} não{" "}
            {!la.validation.ok && !lb.validation.ok ? "são válidas" : "é válida"}: a comparação é indicativa.
          </p>
        )}
      </div>

      <EvalControls params={params} />

      <section className="grid gap-8 md:grid-cols-[14rem_1fr]">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-2">Nota</p>
          <p className="num mt-1 text-5xl leading-none">
            <span className="text-ink-2">{ea.score.total}</span> → {eb.score.total}
          </p>
          <p className="mt-2 text-sm">
            <Delta value={scoreDelta} better={scoreDelta > 0}>
              {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta < 0 ? `−${-scoreDelta}` : "igual"}
            </Delta>{" "}
            <span className="text-ink-2">{Math.abs(scoreDelta) === 1 ? "ponto" : "pontos"}</span>
          </p>
          <p className="num mt-4 text-sm text-ink-2">
            {formatPrice(priceA, params.currency)} → <span className="text-ink">{formatPrice(priceB, params.currency)}</span>
          </p>
        </div>
        <table className="w-full text-sm">
          <caption className="sr-only">Parcelas da nota</caption>
          <thead>
            <tr className="text-left text-xs text-ink-2">
              <th className="py-1 pr-3 font-normal">Parcela</th>
              <th className="py-1 pr-3 text-right font-normal">A</th>
              <th className="py-1 pr-3 text-right font-normal">B</th>
              <th className="py-1 text-right font-normal">Δ</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.key} className="border-t border-rule/60">
                <td className="py-1 pr-3">{p.label}</td>
                <td className="num py-1 pr-3 text-right text-ink-2">{num(p.a, 1)}</td>
                <td className="num py-1 pr-3 text-right">
                  {num(p.b, 1)} <span className="text-ink-2">/ {num(p.max, 1)}</span>
                </td>
                <td className="py-1 text-right">
                  <Delta value={p.delta} better={p.delta > 0}>
                    {p.delta > 0 ? `+${num(p.delta, 1)}` : p.delta < 0 ? `−${num(-p.delta, 1)}` : "="}
                  </Delta>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="trocas" className="space-y-3">
        <h2 id="trocas" className="border-b border-rule pb-1 text-lg">
          O que mudou
        </h2>
        {diff.removed.length + diff.added.length === 0 ? (
          <p className="text-sm text-ink-2">As duas listas têm as mesmas cartas.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {(
              [
                ["Saíram", diff.removed, "−"],
                ["Entraram", diff.added, "+"],
              ] as const
            ).map(([title, lines, sign]) => (
              <div key={title}>
                <h3 className="mb-1 text-base">
                  {title} <span className="num text-sm text-ink-2">{lines.reduce((s, l) => s + l.quantity, 0)}</span>
                </h3>
                <ul className="text-sm">
                  {lines.map((l) => (
                    <li key={l.card.id} className="flex gap-2 border-t border-rule/60 py-1">
                      <span className={`num w-8 ${sign === "+" ? "text-ok" : "text-bad"}`}>
                        {sign}
                        {l.quantity}
                      </span>
                      <span className="flex-1">{l.card.name}</span>
                      <span className="hidden text-xs text-ink-2 sm:inline">{l.card.typeLine.split(" — ")[0]}</span>
                    </li>
                  ))}
                  {lines.length === 0 && <li className="text-ink-2">nenhuma</li>}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="metricas" className="space-y-3">
        <h2 id="metricas" className="border-b border-rule pb-1 text-lg">
          Métricas lado a lado
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-2">
              <th className="py-1 pr-3 font-normal">Métrica</th>
              <th className="py-1 pr-3 text-right font-normal">A</th>
              <th className="py-1 pr-3 text-right font-normal">B</th>
              <th className="py-1 text-right font-normal">Δ</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.key} className="border-t border-rule/60">
                <td className="py-1 pr-3">{m.label}</td>
                <td className="num py-1 pr-3 text-right text-ink-2">{m.a}</td>
                <td className="num py-1 pr-3 text-right">{m.b}</td>
                <td className="py-1 text-right">
                  <Delta value={m.delta === "=" ? 0 : 1} better={m.better}>
                    {m.delta}
                  </Delta>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-ink-2">
          Verde = B melhor, vermelho = B pior, cinzento = sem direção clara. Terrenos: melhor é ficar mais perto do
          número de Karsten de cada versão. Mesa: {params.context.players === 2 ? "1 vs 1" : `${params.context.players} jogadores`},{" "}
          {params.context.seat}.º lugar.
        </p>
      </section>

      <section aria-labelledby="curva-cmp" className="space-y-3">
        <h2 id="curva-cmp" className="border-b border-rule pb-1 text-lg">
          Curva de mana
        </h2>
        <table className="num w-full max-w-xl text-sm">
          <thead>
            <tr className="text-xs text-ink-2">
              <th className="py-1 pr-3 text-left font-sans font-normal">MV</th>
              {ea.curve.map((_, i) => (
                <th key={i} className="py-1 text-center font-normal">
                  {i === CURVE_MAX ? `${i}+` : i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["A", ea.curve, "text-ink-2"],
                ["B", eb.curve, ""],
              ] as const
            ).map(([label, curve, cls]) => (
              <tr key={label} className={`border-t border-rule/60 ${cls}`}>
                <td className="py-1 pr-3 font-sans">{label}</td>
                {curve.map((v, i) => (
                  <td key={i} className="py-1 text-center">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-rule/60">
              <td className="py-1 pr-3 font-sans text-ink-2">Δ</td>
              {eb.curve.map((v, i) => {
                const d = v - ea.curve[i];
                return (
                  <td key={i} className={`py-1 text-center ${d === 0 ? "text-ink-2" : ""}`}>
                    {d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "·"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </section>

      <section aria-labelledby="perfil-cmp" className="space-y-4">
        <h2 id="perfil-cmp" className="border-b border-rule pb-1 text-lg">
          Perfil
        </h2>
        <ProfileCharts
          entries={[
            { name: "A · base", tone: "base", e: ea },
            { name: "B · nova", tone: "main", e: eb },
          ]}
        />
      </section>

      <Improvements items={eb.improvements} />
    </div>
  );
}
