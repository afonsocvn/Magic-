import type { EvalParams } from "@/lib/deck/params";
import { pct } from "@/lib/format";
import type { Evaluation } from "@/lib/math/evaluate";
import { atLeastMana } from "@/lib/math/development";
import { REFERENCE, THREAT_TURN } from "@/lib/math/seats";
import { opponentTurnsBefore } from "@/lib/math/table";
import { EvalControls } from "./EvalControls";
import { SeatTimeline } from "./SeatTimeline";

function H2({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="border-b border-rule pb-1 text-lg">
      {children}
    </h2>
  );
}

export function SeatView({ e, params, valid }: { e: Evaluation; params: EvalParams; valid: boolean }) {
  const ctx = e.context;
  const me = e.seats[ctx.seat - 1];
  const cmv = e.profile.commanderMv;

  return (
    <div className="space-y-10">
      <EvalControls params={params} />
      {!valid && <p className="text-sm text-warn">O deck não é válido: a análise abaixo é só indicativa.</p>}

      <section aria-labelledby="lugar" className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <h2 id="lugar" className="text-lg">
            {ctx.seat}.º lugar de {ctx.players}
          </h2>
          <ul className="space-y-1 text-sm text-ink-2">
            {e.seatAdvice.facts.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          <h3 className="pt-2 text-base">Como jogar</h3>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed marker:text-accent">
            {e.seatAdvice.howToPlay.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-base md:pt-9">Como o deck reage</h3>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed marker:text-ink-2">
            {e.seatAdvice.deckReaction.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="tempo" className="space-y-3">
        <H2 id="tempo">Mana ao longo da mesa, por lugar</H2>
        <SeatTimeline seats={e.seats} mySeat={ctx.seat} players={ctx.players} />
      </section>

      <section aria-labelledby="comparar" className="space-y-3">
        <H2 id="comparar">Todos os lugares, com este deck</H2>
        <div className="overflow-x-auto">
          <table className="num w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-left font-sans text-xs text-ink-2">
                <th className="py-1 pr-3 font-normal">Lugar</th>
                <th className="py-1 pr-3 font-normal">Compra no T1</th>
                <th className="py-1 pr-3 text-right font-normal">Adversários antes do teu T3</th>
                <th className="py-1 pr-3 text-right font-normal">4 de mana (≥ 50 %)</th>
                {cmv != null && <th className="py-1 pr-3 text-right font-normal">Comandante no turno {cmv}</th>}
                <th className="py-1 text-right font-normal">Interação na 1.ª ameaça</th>
              </tr>
            </thead>
            <tbody>
              {e.seats.map((s) => (
                <tr key={s.seat} className={`border-t border-rule/60 ${s.seat === ctx.seat ? "font-semibold" : ""}`}>
                  <td className="py-1.5 pr-3">
                    {s.seat}.º{s.seat === ctx.seat && <span className="ml-2 font-sans text-xs font-normal text-accent">tu</span>}
                  </td>
                  <td className="py-1.5 pr-3 font-sans">{s.drawsFirstTurn ? "sim" : "não"}</td>
                  <td className="py-1.5 pr-3 text-right">{opponentTurnsBefore({ ...ctx, seat: s.seat }, 3)}</td>
                  <td className="py-1.5 pr-3 text-right">
                    {s.fourManaTurn != null ? `turno ${s.fourManaTurn} (momento ${s.globalStep[s.fourManaTurn - 1]})` : "—"}
                  </td>
                  {cmv != null && (
                    <td className="py-1.5 pr-3 text-right">{s.commander?.onCurve != null ? pct(s.commander.onCurve) : "—"}</td>
                  )}
                  <td className="py-1.5 text-right">
                    {s.firstThreat
                      ? `${pct(s.firstThreat.interactionProbability)} (após ${s.firstThreat.yourTurnsBefore} ${s.firstThreat.yourTurnsBefore === 1 ? "turno" : "turnos"})`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="turnos" className="space-y-3">
        <H2 id="turnos">O teu lugar, turno a turno</H2>
        <div className="overflow-x-auto">
          <table className="num w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-left font-sans text-xs text-ink-2">
                <th className="py-1 pr-3 font-normal">Teu turno</th>
                <th className="py-1 pr-3 text-right font-normal">Momento da mesa</th>
                <th className="py-1 pr-3 text-right font-normal">Cartas vistas</th>
                <th className="py-1 pr-3 text-right font-normal">Terreno em todos os turnos</th>
                <th className="py-1 pr-3 text-right font-normal">Mana esperada</th>
                <th className="py-1 pr-3 text-right font-normal">Referência</th>
                <th className="py-1 text-right font-normal">Interação na mão</th>
              </tr>
            </thead>
            <tbody>
              {me.development.slice(0, 6).map((d, i) => (
                <tr key={d.turn} className="border-t border-rule/60">
                  <td className="py-1 pr-3">{d.turn}</td>
                  <td className="py-1 pr-3 text-right">{me.globalStep[i]}</td>
                  <td className="py-1 pr-3 text-right">{e.landDrops[i]?.cardsSeen ?? "—"}</td>
                  <td className="py-1 pr-3 text-right">{pct(d.allLandDrops)}</td>
                  <td className="py-1 pr-3 text-right">
                    {d.expected.toFixed(2).replace(".", ",")}
                    <span className="text-ink-2"> · ≥{d.turn}: {pct(atLeastMana(d, d.turn))}</span>
                  </td>
                  <td className="py-1 pr-3 text-right text-ink-2">{me.reference[i].expected.toFixed(2).replace(".", ",")}</td>
                  <td className="py-1 text-right">{i < 4 ? pct(me.interactionBy[i]) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="pressupostos" className="space-y-2 text-xs text-ink-2 max-w-prose">
        <h2 id="pressupostos" className="text-sm text-ink">
          Pressupostos do modelo
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Cálculo exato (programação dinâmica sobre terrenos, rampa MV ≤ 2 e resto), sem simulação. Fica-se com a mão
            de 7, joga-se 1 terreno por turno e lança-se toda a rampa possível.
          </li>
          <li>
            Cada rampa custa {e.profile.rampCost} (o MV médio da tua rampa barata, arredondado) e dá 1 de mana a partir do
            turno seguinte. Sol Ring e afins dão mais na realidade: os valores são conservadores.
          </li>
          <li>
            Interação = cartas de remoção, board wipe ou counter ({e.profile.interaction} no deck). Ameaça = cada
            adversário joga algo que exige resposta no seu turno {THREAT_TURN}.
          </li>
          <li>
            Referência = um deck com {REFERENCE.lands} terrenos e {REFERENCE.ramp} rampas baratas no mesmo lugar. A cor
            das cartas e os efeitos dos adversários não entram.
          </li>
          <li>
            As sugestões de jogo são regras fixas sobre estes números, não uma previsão de quem ganha. As taxas de vitória
            por lugar só se medem com dados de jogos reais.
          </li>
        </ul>
      </section>
    </div>
  );
}
