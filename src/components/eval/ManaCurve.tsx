/** Curva de mana: uma série, uma cor; nº de cartas numa linha por baixo do eixo. */
export function ManaCurve({ curve }: { curve: number[] }) {
  const W = 320;
  const H = 120;
  const max = Math.max(1, ...curve);
  const slot = W / curve.length;
  const bar = Math.min(22, slot * 0.55);
  const labels = curve.map((_, i) => (i === curve.length - 1 ? `${i}+` : `${i}`));

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 34}`} className="w-full max-w-md" role="img" aria-label="Curva de mana">
        {[0.5, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={H - H * f + 0.5} y2={H - H * f + 0.5} stroke="var(--rule)" strokeWidth={0.5} />
        ))}
        {curve.map((v, i) => {
          const h = (v / max) * (H - 6);
          const x = i * slot + (slot - bar) / 2;
          return (
            <g key={i}>
              <title>{`MV ${labels[i]}: ${v} ${v === 1 ? "carta" : "cartas"}`}</title>
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {v > 0 && (
                <path
                  d={`M${x},${H} V${H - h + 3} a3,3 0 0 1 3,-3 H${x + bar - 3} a3,3 0 0 1 3,3 V${H} Z`}
                  fill="var(--accent)"
                />
              )}
              <text x={i * slot + slot / 2} y={H + 14} textAnchor="middle" fontSize={10} fill="var(--ink-2)" className="num">
                {labels[i]}
              </text>
              <text x={i * slot + slot / 2} y={H + 29} textAnchor="middle" fontSize={11} fill="var(--ink)" className="num">
                {v}
              </text>
            </g>
          );
        })}
        <line x1={0} x2={W} y1={H + 0.5} y2={H + 0.5} stroke="var(--ink-2)" strokeWidth={0.75} />
      </svg>
      <figcaption className="text-xs text-ink-2">Em cima: MV · em baixo: nº de cartas</figcaption>
      <table className="sr-only">
        <tbody>
          {curve.map((v, i) => (
            <tr key={i}>
              <th>MV {labels[i]}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
