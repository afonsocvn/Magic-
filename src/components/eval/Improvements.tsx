import { num } from "@/lib/format";
import type { Improvement } from "@/lib/math/improvements";

export function Improvements({ items }: { items: Improvement[] }) {
  return (
    <section aria-labelledby="melhorar" className="space-y-3">
      <h2 id="melhorar" className="border-b border-rule pb-1 text-lg">
        Onde melhorar
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-2">Nada a apontar com estas métricas.</p>
      ) : (
        <ol className="divide-y divide-rule/60">
          {items.map((it) => (
            <li key={it.key} className="grid grid-cols-[4.5rem_1fr] gap-x-4 py-2 text-sm">
              <span className="num pt-px text-right text-ink-2">
                {it.gain != null ? `+${num(it.gain, 1)} pts` : (it.tag ?? "")}
              </span>
              <div>
                <p className="font-medium">{it.title}</p>
                <p className="text-ink-2">{it.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-ink-2">
        Ordenado pelos pontos da nota que cada ponto recupera. «mesa» = depende do lugar escolhido; «cor» = outra cor abaixo de 90 % (só a pior entra na nota).
        Os alvos podem chocar entre si (ex.: template vs. Karsten): os dois números estão à vista para decidires.
      </p>
    </section>
  );
}
