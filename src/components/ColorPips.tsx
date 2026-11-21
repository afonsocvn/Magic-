import { COLOR_NAMES_PT, type Color } from "@/lib/cards/normalize";
import { ManaSymbol } from "./Mana";

/** Identidade de cor com os símbolos oficiais (SVG do Scryfall). */
export function ColorPips({ identity, size = 16 }: { identity: string; size?: number }) {
  const symbols = identity ? [...identity] : ["C"];
  const label = identity ? [...identity].map((c) => COLOR_NAMES_PT[c as Color]).join(", ") : "incolor";
  return (
    <span className="inline-flex gap-0.5 align-[-2px]" title={label} aria-label={label} role="img">
      {symbols.map((s) => (
        <ManaSymbol key={s} symbol={s} size={size} />
      ))}
    </span>
  );
}
