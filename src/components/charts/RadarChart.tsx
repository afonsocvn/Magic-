import { num } from "@/lib/format";
import { Legend, TONE, type Tone } from "./series";

export type RadarSeries = { name: string; tone: Tone; values: Record<string, number> };

/** Radar 0–10. O anel de fora (10) é a referência. */
export function RadarChart({
  axes,
  series,
}: {
  axes: { key: string; label: string; detail?: string }[];
  series: RadarSeries[];
}) {
  const S = 360;
  const c = S / 2;
  const R = 118;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
  const pt = (i: number, v: number) =>
    [c + (Math.cos(angle(i)) * (R * v)) / 10, c + (Math.sin(angle(i)) * (R * v)) / 10] as const;
  const main = series.find((s) => s.tone === "main") ?? series[0];

  return (
    <figure className="space-y-2">
      <svg
        viewBox={`-50 -6 ${S + 100} ${S + 12}`}
        className="mx-auto w-full max-w-[30rem]"
        role="img"
        aria-label="Perfil do deck em escala 0 a 10"
      >
        {[2, 4, 6, 8, 10].map((ring) => (
          <polygon
            key={ring}
            points={axes.map((_, i) => pt(i, ring).join(",")).join(" ")}
            fill="none"
            stroke="var(--rule)"
            strokeWidth={ring === 10 ? 1 : 0.5}
          />
        ))}
        {axes.map((a, i) => {
          const [x, y] = pt(i, 10);
          return <line key={a.key} x1={c} y1={c} x2={x} y2={y} stroke="var(--rule)" strokeWidth={0.5} />;
        })}
        {[...series]
          .sort((a) => (a.tone === "main" ? 1 : -1))
          .map((s) => (
            <g key={s.name}>
              <polygon
                points={axes.map((a, i) => pt(i, s.values[a.key] ?? 0).join(",")).join(" ")}
                fill={TONE[s.tone].fill}
                fillOpacity={TONE[s.tone].fillOpacity}
                stroke={TONE[s.tone].stroke}
                strokeWidth={TONE[s.tone].width}
                strokeLinejoin="round"
              />
              {axes.map((a, i) => {
                const [x, y] = pt(i, s.values[a.key] ?? 0);
                return (
                  <g key={a.key}>
                    <title>{`${s.name} — ${a.label}: ${num(s.values[a.key] ?? 0, 1)}/10${a.detail ? ` (${a.detail})` : ""}`}</title>
                    <circle cx={x} cy={y} r={10} fill="transparent" />
                    <circle
                      cx={x}
                      cy={y}
                      r={s.tone === "main" ? 3 : 2.5}
                      fill={TONE[s.tone].stroke}
                      stroke="var(--paper)"
                      strokeWidth={1.25}
                    />
                  </g>
                );
              })}
            </g>
          ))}
        {axes.map((a, i) => {
          const [x, y] = pt(i, 11.6);
          const cos = Math.cos(angle(i));
          const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
          return (
            <text key={a.key} x={x} y={y} textAnchor={anchor} fontSize={13} fill="var(--ink)">
              <tspan>{a.label}</tspan>
              <tspan x={x} dy={15} fontSize={12.5} fill="var(--ink-2)" className="num">
                {num(main.values[a.key] ?? 0, 1)}
              </tspan>
            </text>
          );
        })}
      </svg>
      <Legend series={series} />
    </figure>
  );
}
