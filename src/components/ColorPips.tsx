import { COLOR_NAMES_PT, type Color } from "@/lib/cards/normalize";

/** Símbolos de mana oficiais (SVG servido pelo Scryfall). */
export function ColorPips({ identity, size = 16 }: { identity: string; size?: number }) {
  const symbols = identity ? [...identity] : ["C"];
  const label = identity ? [...identity].map((c) => COLOR_NAMES_PT[c as Color]).join(", ") : "incolor";
  return (
    <span className="inline-flex gap-0.5 align-[-2px]" title={label} aria-label={label}>
      {symbols.map((s) => (
        // eslint-disable-next-line @next/next/no-img-element -- imagem externa do Scryfall, sem otimização
        <img key={s} src={`https://svgs.scryfall.io/card-symbols/${s}.svg`} alt="" width={size} height={size} />
      ))}
    </span>
  );
}
