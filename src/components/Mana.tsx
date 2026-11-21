/* eslint-disable @next/next/no-img-element -- SVG externo do Scryfall, não precisa de otimização */
import { parseManaSymbols, splitSymbols, symbolFile } from "@/lib/cards/mana";

export function ManaSymbol({ symbol, size = 15 }: { symbol: string; size?: number }) {
  return (
    <img
      src={`https://svgs.scryfall.io/card-symbols/${symbolFile(symbol)}.svg`}
      alt={`{${symbol}}`}
      title={`{${symbol}}`}
      width={size}
      height={size}
      className="inline-block align-[-2px]"
    />
  );
}

export function ManaCost({ cost, size }: { cost: string | null; size?: number }) {
  const symbols = parseManaSymbols(cost);
  if (!symbols.length) return null;
  return (
    <span className="inline-flex gap-px whitespace-nowrap">
      {symbols.map((s, i) => (
        <ManaSymbol key={i} symbol={s} size={size} />
      ))}
    </span>
  );
}

/** Oracle text com símbolos e parágrafos; texto do reminder em itálico. */
export function OracleText({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="space-y-2">
      {text.split("\n").map((para, i) => (
        <p key={i}>
          {splitSymbols(para).map((part, j) =>
            "symbol" in part ? (
              <ManaSymbol key={j} symbol={part.symbol} size={14} />
            ) : (
              <Reminder key={j} text={part.text} />
            ),
          )}
        </p>
      ))}
    </div>
  );
}

function Reminder({ text }: { text: string }) {
  const parts = text.split(/(\([^)]*\))/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("(") ? (
          <i key={i} className="text-ink-2">
            {p}
          </i>
        ) : (
          p
        ),
      )}
    </>
  );
}
