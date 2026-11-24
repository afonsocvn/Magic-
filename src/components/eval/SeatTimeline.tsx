import { num } from "@/lib/format";
import type { SeatAnalysis } from "@/lib/math/seats";

const TURNS = 6;

/**
 * Mana esperada vs. momento da mesa (cada turno de cada jogador conta 1).
 * O teu lugar a cor, os outros a cinzento, etiquetas diretas no fim das linhas.
 */
export function SeatTimeline({ seats, mySeat, players }: { seats: SeatAnalysis[]; mySeat: number; players: number }) {
  const W = 560;
  const H = 200;
  const padL = 26;
  const padB = 34;
  const padR = 30;
  const maxStep = players * TURNS;
  const maxMana = Math.ceil(Math.max(...seats.map((s) => s.development[TURNS - 1].expected)));
  const x = (step: number) => padL + ((step - 1) / (maxStep - 1)) * (W - padL - padR);
  const y = (m: number) => H - padB - (m / maxMana) * (H - padB - 8);
  const order = [...seats].sort((a, b) => (a.seat === mySeat ? 1 : b.seat === mySeat ? -1 : 0));

  return (
    <figure className="space-y-1">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[34rem]"
          role="img"
          aria-label="Mana esperada por momento da mesa, por lugar"
        >
          {Array.from({ length: maxMana + 1 }, (_, m) => (
            <g key={m}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(m) + 0.5}
                y2={y(m) + 0.5}
                stroke="var(--rule)"
                strokeWidth={m === 0 ? 0.75 : 0.5}
              />
              <text x={padL - 6} y={y(m) + 3} textAnchor="end" fontSize={10} fill="var(--ink-2)" className="num">
                {m}
              </text>
            </g>
          ))}
          {Array.from({ length: TURNS }, (_, r) => (
            <text key={r} x={x(r * players + 1)} y={H - 6} fontSize={10} fill="var(--ink-2)" className="num">
              {`volta ${r + 1}`}
            </text>
          ))}
          {order.map((s) => {
            const mine = s.seat === mySeat;
            const pts = s.development.slice(0, TURNS).map((d, t) => [x(s.globalStep[t]), y(d.expected)] as const);
            const last = pts[pts.length - 1];
            return (
              <g key={s.seat}>
                <polyline
                  points={pts.map((p) => p.join(",")).join(" ")}
                  fill="none"
                  stroke={mine ? "var(--accent)" : "var(--ink-2)"}
                  strokeOpacity={mine ? 1 : 0.45}
                  strokeWidth={mine ? 2 : 1.25}
                  strokeLinejoin="round"
                />
                {pts.map(([px, py], t) => (
                  <g key={t}>
                    <title>{`${s.seat}.º lugar, teu turno ${t + 1} (momento ${s.globalStep[t]}): ${num(s.development[t].expected)} de mana esperada`}</title>
                    <circle cx={px} cy={py} r={9} fill="transparent" />
                    <circle
                      cx={px}
                      cy={py}
                      r={mine ? 3.5 : 2.5}
                      fill={mine ? "var(--accent)" : "var(--ink-2)"}
                      fillOpacity={mine ? 1 : 0.6}
                      stroke="var(--paper)"
                      strokeWidth={1.5}
                    />
                  </g>
                ))}
                {mine && (
                  <text x={last[0]} y={last[1] - 9} textAnchor="middle" fontSize={11} fill="var(--ink)" fontWeight={600}>
                    tu
                  </text>
                )}
                <text
                  x={pts[0][0]}
                  y={pts[0][1] + 16}
                  textAnchor="middle"
                  fontSize={10.5}
                  fill={mine ? "var(--ink)" : "var(--ink-2)"}
                  fontWeight={mine ? 600 : 400}
                >
                  {s.seat}.º
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="text-xs text-ink-2">
        Mana esperada em cada um dos teus turnos, colocada no momento em que acontece na mesa (cada turno de cada
        jogador conta 1). O teu lugar a cor. Passa o rato nos pontos para ver os valores.
      </figcaption>
    </figure>
  );
}
