import { COLOR_NAMES_PT } from "@/lib/cards/normalize";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories/types";
import type { EvalParams } from "@/lib/deck/params";
import { pct, num } from "@/lib/format";
import type { Evaluation } from "@/lib/math/evaluate";
import { TEMPLATES, type Status } from "@/lib/math/templates";
import { ManaSymbol } from "../Mana";
import { EvalControls } from "./EvalControls";
import { HandHeatmap } from "./HandHeatmap";
import { ManaCurve } from "./ManaCurve";
import { StatusMark } from "./StatusMark";
import { Improvements } from "./Improvements";

const probStatus = (p: number): Status => (p >= 0.9 ? "ok" : p >= 0.75 ? "warn" : "bad");

function CardList({ cards, summary }: { cards: string[]; summary?: string }) {
  if (!cards.length) return null;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-ink-2 hover:text-ink">{summary ?? "ver cartas"}</summary>
      <p className="mt-1 leading-relaxed text-ink-2">{cards.join(" · ")}</p>
    </details>
  );
}

function H2({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="border-b border-rule pb-1 text-lg">
      {children}
    </h2>
  );
}

export function EvaluationView({ e, params, valid }: { e: Evaluation; params: EvalParams; valid: boolean }) {
  const ctx = e.context;
  const t = TEMPLATES[e.templateId];
  const r = e.cheapRamp.count;

  return (
    <div className="space-y-10">
      <EvalControls params={params} />
      {!valid && (
        <p className="text-sm text-warn">O deck não é válido: a avaliação abaixo é só indicativa.</p>
      )}

      {/* Nota */}
      <section aria-labelledby="nota" className="grid gap-6 md:grid-cols-[12rem_1fr]">
        <div>
          <h2 id="nota" className="text-xs uppercase tracking-wider text-ink-2 font-sans font-normal">
            Nota
          </h2>
          <p className="num text-6xl leading-none mt-1">
            {e.score.total}
            <span className="text-xl text-ink-2">/100</span>
          </p>
        </div>
        <table className="w-full text-sm">
          <caption className="sr-only">Como a nota foi calculada</caption>
          <tbody>
            {e.score.parts.map((p) => (
              <tr key={p.key} className="border-b border-rule/60 align-baseline">
                <td className="py-1 pr-3 whitespace-nowrap">{p.label}</td>
                <td className="num py-1 pr-3 text-right whitespace-nowrap">
                  {num(p.points, 1)} <span className="text-ink-2">/ {num(p.max, 1)}</span>
                </td>
                <td className="py-1 text-xs text-ink-2">{p.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Improvements items={e.improvements} />

      {/* Template */}
      <section aria-labelledby="contagens" className="space-y-3">
        <H2 id="contagens">Contagens vs. {t.name}</H2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-2">
              <th className="py-1 pr-3 font-normal">Categoria</th>
              <th className="py-1 pr-3 font-normal text-right">Tens</th>
              <th className="py-1 pr-3 font-normal text-right">Alvo</th>
              <th className="py-1 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {e.template.map((row) => (
              <tr key={row.key} className="border-t border-rule/60 align-top">
                <td className="py-1.5 pr-3">
                  {row.label}
                  <CardList cards={row.cards} />
                </td>
                <td className="num py-1.5 pr-3 text-right">{row.have}</td>
                <td className="num py-1.5 pr-3 text-right text-ink-2">{row.target}</td>
                <td className="py-1.5">
                  <StatusMark
                    status={row.status}
                    label={row.have === row.target ? "no alvo" : row.have > row.target ? "acima" : "abaixo"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-ink-2">
          Conta as 99 cartas (sem o comandante). Uma carta pode estar em várias categorias. As categorias vêm do Scryfall
          Tagger, de regras sobre o texto e de correções manuais; abre uma carta para ver de onde vem cada uma.
        </p>
      </section>

      {/* Mana */}
      <section aria-labelledby="mana" className="space-y-6">
        <H2 id="mana">Mana</H2>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-base">Curva de mana</h3>
            <ManaCurve curve={e.curve} />
            <p className="text-sm">
              CMC médio sem terrenos: <span className="num">{num(e.avgCmc)}</span>
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <h3 className="text-base">Número de terrenos (Karsten)</h3>
            <p className="num text-[13px] leading-relaxed">
              31,42 + 3,13 × {num(e.avgCmc)} − 0,28 × {r} = <strong>{num(e.karsten, 1)}</strong>
            </p>
            <p>
              Tens <span className="num">{e.lands}</span> terrenos
              {Math.abs(e.lands - e.karsten) < 1
                ? ", em linha com a fórmula."
                : e.lands < e.karsten
                  ? `: cerca de ${Math.round(e.karsten - e.lands)} abaixo da fórmula.`
                  : `: cerca de ${Math.round(e.lands - e.karsten)} acima da fórmula.`}
            </p>
            <p className="text-xs text-ink-2">
              Rampa conta só a de MV 0–2 ({r} {r === 1 ? "carta" : "cartas"}). MDFC com face de terreno contam como terreno.
            </p>
            <CardList cards={e.cheapRamp.cards.map((c) => `${c.name} (${c.cmc})`)} summary="ver rampa MV 0–2" />

            <h3 className="text-base pt-3">Terrenos tapped</h3>
            <p>
              <span className="num">{e.tapped.always.length}</span> entram sempre tapped,{" "}
              <span className="num">{e.tapped.conditional.length}</span> às vezes.
            </p>
            <CardList cards={e.tapped.always} summary="sempre tapped" />
            <CardList cards={e.tapped.conditional} summary="tapped com condição" />
          </div>
        </div>

        {e.colors.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-base">Fontes de cor vs. símbolos exigidos</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-2">
                    <th className="py-1 pr-3 font-normal">Cor</th>
                    <th className="py-1 pr-3 font-normal text-right">Terrenos</th>
                    <th className="py-1 pr-3 font-normal text-right">+ rampa</th>
                    <th className="py-1 pr-3 font-normal text-right">Símbolos</th>
                    <th className="py-1 pr-3 font-normal">Carta mais exigente</th>
                    <th className="py-1 font-normal text-right">P(cores a tempo)</th>
                  </tr>
                </thead>
                <tbody>
                  {e.colors.map((c) => (
                    <tr key={c.color} className="border-t border-rule/60">
                      <td className="py-1.5 pr-3">
                        <ManaSymbol symbol={c.color} /> <span className="sr-only">{COLOR_NAMES_PT[c.color]}</span>
                      </td>
                      <td className="num py-1.5 pr-3 text-right">{c.landSources}</td>
                      <td className="num py-1.5 pr-3 text-right text-ink-2">{c.rampSources}</td>
                      <td className="num py-1.5 pr-3 text-right">{c.totalPips}</td>
                      <td className="py-1.5 pr-3">
                        {c.hardest ? (
                          <>
                            {c.hardest.name}{" "}
                            <span className="text-xs text-ink-2">
                              ({c.hardest.pips}× no turno {c.hardest.turn})
                            </span>
                          </>
                        ) : (
                          <span className="text-ink-2">—</span>
                        )}
                      </td>
                      <td className="py-1.5 text-right">
                        {c.hardest && (
                          <span className="inline-flex items-center gap-2">
                            <span className="num">{pct(c.hardest.probability)}</span>
                            <StatusMark status={probStatus(c.hardest.probability)} label=" " />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-2 max-w-prose">
              Para cada carta: probabilidade de ter pelo menos tantas fontes da cor quantos os símbolos, entre as cartas
              vistas até ao turno igual ao MV (hipergeométrica sobre as 99; terrenos + rampa MV ≤ 2 dessa cor). Mostra a
              carta com a probabilidade mais baixa. Verde ≥ 90 %, amarelo ≥ 75 %.
            </p>
          </div>
        )}
      </section>

      {/* Mão inicial */}
      <section aria-labelledby="mao" className="space-y-4">
        <H2 id="mao">Mão inicial</H2>
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-3 text-sm">
            <p>
              Mão boa = 2 terrenos + 1–2 rampas, ou 3 terrenos + 0–1 rampa (rampa MV 0–2; mãos com 4+ terrenos não
              contam). Com <span className="num">{e.lands}</span> terrenos e <span className="num">{r}</span> rampas:
            </p>
            <table className="num w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-2 font-sans">
                  <th className="py-1 pr-3 font-normal">Mão</th>
                  <th className="py-1 pr-3 font-normal">Fico com</th>
                  <th className="py-1 font-normal text-right">P(boa até aqui)</th>
                </tr>
              </thead>
              <tbody>
                {e.hand.byHands.map((h) => (
                  <tr key={h.hand} className="border-t border-rule/60">
                    <td className="py-1 pr-3">{h.hand}.ª</td>
                    <td className="py-1 pr-3">{h.cardsKept} cartas</td>
                    <td className="py-1 text-right">{pct(h.probability)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="num text-[13px] text-ink-2 leading-relaxed">
              p = Σ C(L,l)·C(R,r)·C(O,7−l−r) / C(99,7) = {pct(e.hand.single)}
              <br />
              P(boa em até {e.hands}) = 1 − (1 − p)^{e.hands} = {pct(e.hand.withinN)}
            </p>
            <p>
              Para {e.lands} terrenos, a melhor rampa é <span className="num">{e.hand.bestRamp.ramp}</span> (
              <span className="num">{pct(e.hand.bestRamp.p)}</span>).{" "}
              {e.hand.bestRamp.ramp === r
                ? "Estás no ponto ótimo."
                : e.hand.bestRamp.ramp > r
                  ? `Tens ${e.hand.bestRamp.ramp - r} a menos.`
                  : `Tens ${r - e.hand.bestRamp.ramp} a mais (não faz mal, mas não ajuda a mão inicial).`}
            </p>
            <p className="text-xs text-ink-2">
              Cálculo exato com a hipergeométrica multivariada (método MustaKotka). London mulligan
              {ctx.freeMulligan ? ", com o 1.º mulligan grátis" : ""}.
            </p>
          </div>
          <HandHeatmap
            lands={e.hand.heatmap.lands}
            ramp={e.hand.heatmap.ramp}
            values={e.hand.heatmap.values}
            deck={{ lands: e.lands, ramp: r }}
            bestRamp={e.hand.bestRamp.ramp}
            max={e.hand.heatmap.max}
            hands={e.hands}
          />
        </div>
      </section>

      {/* Categorias */}
      <section aria-labelledby="categorias" className="space-y-3">
        <H2 id="categorias">Todas as categorias</H2>
        <ul className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <li key={c} className="border-t border-rule/60 pt-1.5">
              <div className="flex justify-between">
                <span>{CATEGORY_LABELS[c]}</span>
                <span className="num">{e.byCategory[c].count}</span>
              </div>
              <CardList cards={e.byCategory[c].cards} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
