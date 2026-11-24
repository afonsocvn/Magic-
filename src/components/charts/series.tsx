/** Uma série = um deck. "main" = o deck (ou a versão nova), "base" = a versão de comparação. */
export type Tone = "main" | "base";

export const TONE = {
  main: { stroke: "var(--accent)", fill: "var(--accent)", fillOpacity: 0.14, width: 2 },
  base: { stroke: "var(--ink-2)", fill: "var(--ink-2)", fillOpacity: 0.06, width: 1.5 },
} as const;

export function Legend({ series }: { series: { name: string; tone: Tone }[] }) {
  if (series.length < 2) return null;
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
      {series.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4"
            style={{ background: TONE[s.tone].stroke, height: TONE[s.tone].width }}
            aria-hidden
          />
          {s.name}
        </span>
      ))}
    </p>
  );
}
