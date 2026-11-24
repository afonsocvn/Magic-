import { ManaSymbol } from "@/components/Mana";
import { COLOR_NAMES_PT } from "@/lib/cards/normalize";
import { num } from "@/lib/format";
import type { Evaluation } from "@/lib/math/evaluate";
import { HBarChart } from "../charts/HBarChart";
import { QuadrantChart } from "../charts/QuadrantChart";
import { RadarChart } from "../charts/RadarChart";
import type { Tone } from "../charts/series";

export type ProfileEntry = { name: string; tone: Tone; e: Evaluation };

const pctInt = (x: number) => `${Math.round(x * 100)} %`;

/** Perfil visual de um deck, ou de dois sobrepostos (base a cinzento, nova a cor). */
export function ProfileCharts({ entries }: { entries: ProfileEntry[] }) {
  const main = entries.find((x) => x.tone === "main") ?? entries[0];
  const series = entries.map(({ name, tone }) => ({ name, tone }));
  const axes = main.e.style.radar;

  const typeKeys = [...new Set(entries.flatMap((x) => x.e.style.types.map((t) => t.key)))];
  const typeLabel = (k: string) => entries.flatMap((x) => x.e.style.types).find((t) => t.key === k)!.label;
  const typeCount = (x: ProfileEntry, k: string) => x.e.style.types.find((t) => t.key === k)?.count ?? 0;

  const colorKeys = main.e.style.colors.map((c) => c.color);

  return (
    <div className="space-y-10">
      <div className="grid items-start gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <h3 className="text-base">Perfil (0–10)</h3>
          <RadarChart
            axes={axes}
            series={entries.map((x) => ({
              name: x.name,
              tone: x.tone,
              values: Object.fromEntries(x.e.style.radar.map((a) => [a.key, a.value])),
            }))}
          />
          <details className="text-xs text-ink-2">
            <summary className="cursor-pointer hover:text-ink">como se calcula cada eixo</summary>
            <ul className="mt-1 space-y-0.5">
              {axes.map((a) => (
                <li key={a.key}>
                  <span className="text-ink">{a.label}</span> {num(a.value, 1)}: {a.detail}
                </li>
              ))}
              <li>O anel de fora (10) é a referência; menos de 10 = abaixo dela.</li>
            </ul>
          </details>
        </div>
        <QuadrantChart
          title="Estilo de jogo"
          xLabels={["lento", "rápido"]}
          yLabels={["proativo", "reativo"]}
          quadrants={["Controlo", "Tempo", "Battlecruiser", "Aggro / Turbo"]}
          series={entries.map((x) => ({
            name: x.name,
            tone: x.tone,
            x: x.e.style.playstyle.x,
            y: x.e.style.playstyle.y,
            detail: `${x.e.style.playstyle.xDetail}; ${x.e.style.playstyle.yDetail}`,
          }))}
        />
        <QuadrantChart
          title="De que é feito"
          xLabels={["feitiços e artefactos", "criaturas"]}
          yLabels={["lento", "rápido"]}
          quadrants={["Spells rápidos", "Criaturas rápidas", "Spells lentos", "Criaturas grandes"]}
          series={entries.map((x) => ({
            name: x.name,
            tone: x.tone,
            x: x.e.style.composition.x,
            y: x.e.style.composition.y,
            detail: `${x.e.style.composition.xDetail}; ${x.e.style.composition.yDetail}`,
          }))}
        />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-base">Tipos de carta</h3>
          <HBarChart
            series={series}
            rows={typeKeys.map((k) => ({
              key: k,
              label: typeLabel(k),
              values: entries.map((x) => typeCount(x, k)),
              texts: entries.map((x) => `${typeCount(x, k)}`),
            }))}
          />
          <p className="text-xs text-ink-2">
            As 99 cartas sem o comandante; MDFC com face de terreno contam como terreno.
          </p>
        </div>
        {colorKeys.length > 1 && (
          <div className="space-y-2">
            <h3 className="text-base">Cores: símbolos vs. fontes</h3>
            {entries.map((x) => (
              <div key={x.name} className="space-y-1">
                {entries.length > 1 && <p className="text-xs text-ink-2">{x.name}</p>}
                <HBarChart
                  max={1}
                  series={[
                    { name: "símbolos exigidos", tone: "base" },
                    { name: "fontes de mana", tone: "main" },
                  ]}
                  rows={x.e.style.colors.map((c) => ({
                    key: c.color,
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <ManaSymbol symbol={c.color} /> {COLOR_NAMES_PT[c.color]}
                      </span>
                    ),
                    values: [c.pipShare, c.sourceShare],
                    texts: [`${pctInt(c.pipShare)} (${c.pips})`, `${pctInt(c.sourceShare)} (${c.sources})`],
                  }))}
                />
              </div>
            ))}
            <p className="text-xs text-ink-2">
              Percentagem de cada cor nos símbolos de custo e nas fontes (terrenos + rampa MV ≤ 2). Uma cor com mais
              símbolos do que fontes costuma falhar a tempo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
