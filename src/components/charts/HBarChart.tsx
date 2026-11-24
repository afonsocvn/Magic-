import type { ReactNode } from "react";
import { Legend, TONE, type Tone } from "./series";

export type HBarRow = { key: string; label: ReactNode; values: number[]; texts: string[] };

/** Barras horizontais; uma barra por série em cada linha, valor escrito à direita. */
export function HBarChart({
  rows,
  series,
  max,
}: {
  rows: HBarRow[];
  series: { name: string; tone: Tone }[];
  max?: number;
}) {
  const top = max ?? Math.max(1, ...rows.flatMap((r) => r.values));
  return (
    <figure className="space-y-2">
      <Legend series={series} />
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm">
            <div className="truncate">{r.label}</div>
            <div className="space-y-1">
              {series.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2" title={`${s.name}: ${r.texts[i]}`}>
                  <div className="h-2.5 flex-1">
                    <div
                      className="h-full rounded-r-[3px]"
                      style={{
                        width: `${Math.max(0, (r.values[i] / top) * 100)}%`,
                        background: TONE[s.tone].stroke,
                        opacity: s.tone === "base" ? 0.55 : 1,
                      }}
                    />
                  </div>
                  <span className="num w-20 shrink-0 text-right text-xs text-ink-2">{r.texts[i]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}
