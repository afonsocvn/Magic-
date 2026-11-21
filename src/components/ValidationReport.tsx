import type { ValidationResult } from "@/lib/deck/validate";

export function ValidationReport({ result }: { result: ValidationResult }) {
  return (
    <section aria-labelledby="validacao" className="space-y-3">
      <h2 id="validacao" className="sr-only">
        Validação
      </h2>
      {result.ok ? (
        <p className="flex items-center gap-2 text-sm">
          <span className="inline-block size-2.5 bg-ok" aria-hidden />
          Deck válido para Commander: <span className="num">{result.totalCards}</span> cartas.
        </p>
      ) : (
        <div className="border-l-2 border-bad pl-4 space-y-3">
          <p className="text-sm font-medium text-bad">
            {result.errors.length === 1 ? "1 problema" : `${result.errors.length} problemas`} na decklist
          </p>
          <ul className="space-y-3 text-sm">
            {result.errors.map((e, i) => (
              <li key={i}>
                <p>{e.message}</p>
                {e.cards && (
                  <ul className="mt-1 text-ink-2 num text-[12.5px] columns-1 sm:columns-2 gap-8">
                    {e.cards.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.warnings.map((w, i) => (
        <p key={i} className="flex items-center gap-2 text-sm text-ink-2">
          <span className="inline-block size-2.5 bg-warn" aria-hidden />
          {w.message}
        </p>
      ))}
    </section>
  );
}
