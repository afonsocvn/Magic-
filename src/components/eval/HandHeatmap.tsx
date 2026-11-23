"use client";

import { useState } from "react";
import { pct } from "@/lib/format";

type Props = {
  lands: number[];
  ramp: number[];
  values: number[][];
  deck: { lands: number; ramp: number };
  bestRamp: number;
  max: { lands: number; ramp: number; p: number };
  hands: number;
};

/**
 * Heatmap terrenos × rampa (MV 0–2): uma só cor, do claro (pior) ao escuro
 * (melhor). Contorno = o deck; ponto = a melhor rampa para os terrenos do deck.
 */
export function HandHeatmap({ lands, ramp, values, deck, bestRamp, max, hands }: Props) {
  const flat = values.flat();
  const lo = Math.min(...flat);
  const hi = Math.max(...flat);
  const [hover, setHover] = useState<{ L: number; R: number; p: number } | null>(null);
  const deckIdx = { i: lands.indexOf(deck.lands), j: ramp.indexOf(deck.ramp) };
  const shown = hover ?? (deckIdx.i >= 0 && deckIdx.j >= 0 ? { L: deck.lands, R: deck.ramp, p: values[deckIdx.i][deckIdx.j] } : null);
  const rows = [...lands.keys()].reverse(); // mais terrenos em cima

  const fill = (p: number) => {
    // escala não linear: realça a zona perto do máximo
    const t = Math.pow((p - lo) / (hi - lo || 1), 2.2);
    return `color-mix(in oklch, var(--accent) ${Math.round(6 + t * 94)}%, var(--paper))`;
  };

  return (
    <figure className="space-y-2">
      <p className="num text-sm h-5" aria-live="polite">
        {shown && (
          <>
            {shown.L} terrenos · {shown.R} rampa → <strong>{pct(shown.p)}</strong>
            <span className="text-ink-2"> em até {hands} {hands === 1 ? "mão" : "mãos"}</span>
          </>
        )}
      </p>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[22rem] gap-px"
          style={{ gridTemplateColumns: `2rem repeat(${ramp.length}, minmax(0, 1fr))` }}
          onMouseLeave={() => setHover(null)}
        >
          {rows.map((i) => (
            <div key={i} className="contents">
              <div className="num pr-1 text-right text-[10px] leading-none text-ink-2 self-center">
                {lands[i] % 2 === 0 ? lands[i] : ""}
              </div>
              {ramp.map((R, j) => {
                const p = values[i][j];
                const isDeck = i === deckIdx.i && j === deckIdx.j;
                const isBest = lands[i] === deck.lands && R === bestRamp;
                return (
                  <div
                    key={j}
                    onMouseEnter={() => setHover({ L: lands[i], R, p })}
                    title={`${lands[i]} terrenos, ${R} rampa: ${pct(p)}`}
                    className={`relative aspect-square ${isDeck ? "outline-2 outline-ink z-10" : ""}`}
                    style={{ background: fill(p) }}
                  >
                    {isBest && <span className="absolute inset-0 m-auto size-1.5 rounded-full bg-paper ring-1 ring-ink" />}
                  </div>
                );
              })}
            </div>
          ))}
          <div />
          {ramp.map((R) => (
            <div key={R} className="num pt-1 text-center text-[10px] text-ink-2">
              {R % 2 === 0 ? R : ""}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-2">
        <span>Vertical: terrenos · horizontal: rampa MV 0–2</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-3 outline-2 outline-ink" /> o teu deck
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full bg-paper ring-1 ring-ink" /> melhor rampa para os teus terrenos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="num">{pct(lo)}</span>
          <span
            className="inline-block h-2 w-16"
            style={{ background: "linear-gradient(to right, color-mix(in oklch, var(--accent) 6%, var(--paper)), var(--accent))" }}
          />
          <span className="num">{pct(hi)}</span>
        </span>
        <span>
          máximo: {max.lands}/{max.ramp}
        </span>
      </figcaption>
    </figure>
  );
}
