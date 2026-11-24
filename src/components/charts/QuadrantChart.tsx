import { Legend, TONE, type Tone } from "./series";

export type QuadrantSeries = { name: string; tone: Tone; x: number; y: number; detail: string };

/**
 * Plano com 4 quadrantes, coordenadas de −1 a 1. Com duas séries desenha
 * uma seta da base para a versão nova.
 */
export function QuadrantChart({
  title,
  xLabels,
  yLabels,
  quadrants,
  series,
}: {
  title: string;
  /** [esquerda, direita] */
  xLabels: [string, string];
  /** [baixo, cima] */
  yLabels: [string, string];
  /** [cima-esquerda, cima-direita, baixo-esquerda, baixo-direita] */
  quadrants: [string, string, string, string];
  series: QuadrantSeries[];
}) {
  const S = 300;
  const pad = 26;
  const inner = S - 2 * pad;
  const px = (v: number) => pad + ((v + 1) / 2) * inner;
  const py = (v: number) => pad + ((1 - v) / 2) * inner;
  const base = series.find((s) => s.tone === "base");
  const main = series.find((s) => s.tone === "main");
  const id = title.replace(/\W+/g, "-");

  return (
    <figure className="space-y-2">
      <figcaption className="font-serif text-base font-semibold">{title}</figcaption>
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[24rem]" role="img" aria-label={title}>
        <defs>
          <marker
            id={`arrow-${id}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-2)" />
          </marker>
        </defs>
        <rect x={pad} y={pad} width={inner} height={inner} fill="none" stroke="var(--rule)" />
        <line
          x1={px(0)}
          x2={px(0)}
          y1={pad}
          y2={S - pad}
          stroke="var(--ink-2)"
          strokeOpacity={0.5}
          strokeWidth={0.75}
        />
        <line
          x1={pad}
          x2={S - pad}
          y1={py(0)}
          y2={py(0)}
          stroke="var(--ink-2)"
          strokeOpacity={0.5}
          strokeWidth={0.75}
        />
        {(
          [
            [quadrants[0], pad + 8, pad + 16, "start"],
            [quadrants[1], S - pad - 8, pad + 16, "end"],
            [quadrants[2], pad + 8, S - pad - 8, "start"],
            [quadrants[3], S - pad - 8, S - pad - 8, "end"],
          ] as const
        ).map(([label, x, y, anchor]) => (
          <text key={label} x={x} y={y} textAnchor={anchor} fontSize={12} fill="var(--ink-2)" fontStyle="italic">
            {label}
          </text>
        ))}
        <text x={pad} y={S - 7} fontSize={11.5} fill="var(--ink-2)">
          ← {xLabels[0]}
        </text>
        <text x={S - pad} y={S - 7} textAnchor="end" fontSize={11.5} fill="var(--ink-2)">
          {xLabels[1]} →
        </text>
        <text x={14} y={S - pad} fontSize={11.5} fill="var(--ink-2)" transform={`rotate(-90 14 ${S - pad})`}>
          ← {yLabels[0]}
        </text>
        <text x={14} y={pad} fontSize={11.5} fill="var(--ink-2)" textAnchor="end" transform={`rotate(-90 14 ${pad})`}>
          {yLabels[1]} →
        </text>
        {base && main && (Math.abs(base.x - main.x) > 0.02 || Math.abs(base.y - main.y) > 0.02) && (
          <line
            x1={px(base.x)}
            y1={py(base.y)}
            x2={px(main.x)}
            y2={py(main.y)}
            stroke="var(--ink-2)"
            strokeWidth={1.25}
            markerEnd={`url(#arrow-${id})`}
          />
        )}
        {[...series]
          .sort((a) => (a.tone === "main" ? 1 : -1))
          .map((s) => (
            <g key={s.name}>
              <title>{`${s.name}: ${s.detail}`}</title>
              <circle cx={px(s.x)} cy={py(s.y)} r={14} fill="transparent" />
              <circle
                cx={px(s.x)}
                cy={py(s.y)}
                r={s.tone === "main" ? 7 : 5.5}
                fill={TONE[s.tone].stroke}
                stroke="var(--paper)"
                strokeWidth={2}
              />
            </g>
          ))}
      </svg>
      <Legend series={series} />
      {series.map((s) => (
        <p key={s.name} className="text-xs text-ink-2">
          {series.length > 1 && <span className="text-ink">{s.name}: </span>}
          {s.detail}
        </p>
      ))}
    </figure>
  );
}
