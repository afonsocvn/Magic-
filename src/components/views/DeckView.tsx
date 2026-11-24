import Link from "next/link";
import { CardGrid } from "@/components/CardGrid";
import { ColorPips } from "@/components/ColorPips";
import { RememberDeck } from "@/components/RememberDeck";
import { ValidationReport } from "@/components/ValidationReport";
import { EvaluationView } from "@/components/eval/EvaluationView";
import { SeatView } from "@/components/eval/SeatView";
import { deckTotal, formatPrice, mergeLines, type Currency } from "@/lib/deck/groups";
import type { LoadedDeck } from "@/lib/deck/load";
import type { EvalParams } from "@/lib/deck/params";
import { toViewCard, toViewGroups, type ViewGroup } from "@/lib/deck/view";
import type { Evaluation } from "@/lib/math/evaluate";

export type DeckTab = "cartas" | "avaliacao" | "mesa";

export type DeckLinks = Record<DeckTab, string> & Record<Currency, string> & { version: string; edit: string };

const dateFmt = new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" });

/** Página de um deck (servidor e versão estática usam a mesma). */
export function DeckView({
  deckKey,
  deckText,
  loaded,
  evaluation,
  tab,
  params,
  links,
  pricesDate,
}: {
  /** Id do deck (servidor) ou chave da lista (versão estática) */
  deckKey: string;
  /** Texto da lista (versão estática guarda-o em "Os meus decks") */
  deckText?: string;
  loaded: LoadedDeck;
  evaluation: Evaluation | null;
  tab: DeckTab;
  params: EvalParams;
  links: DeckLinks;
  pricesDate: Date | null;
}) {
  const currency = params.currency;
  const commanderLines = mergeLines(loaded.commander.map((r) => ({ card: r.card, quantity: r.entry.quantity })));
  const mainLines = loaded.main.map((r) => ({ card: r.card, quantity: r.entry.quantity }));
  const total = deckTotal([...commanderLines, ...mainLines], currency);
  const commander = commanderLines[0]?.card;

  const groups: ViewGroup[] =
    tab === "cartas"
      ? [
          ...(commanderLines.length
            ? [
                {
                  key: "commander",
                  label: commanderLines.length > 1 ? "Comandantes" : "Comandante",
                  count: commanderLines.reduce((s, l) => s + l.quantity, 0),
                  totalCents: 0,
                  cards: commanderLines.map((l) =>
                    toViewCard(l.card, l.quantity, currency, loaded.classification.get(l.card.id)),
                  ),
                },
              ]
            : []),
          ...toViewGroups(mainLines, currency, loaded.classification),
        ]
      : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-rule pb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-2">Comandante</p>
          <h1 className="text-2xl">
            {commander ? commander.name : "—"} {commander && <ColorPips identity={commander.colorIdentity} size={18} />}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link href={links.version}>Fazer uma versão</Link>
            <Link href={links.edit} className="text-ink-2">
              Editar lista
            </Link>
            {commander && (
              <RememberDeck id={deckKey} text={deckText} commander={commander.name} identity={commander.colorIdentity} />
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-ink-2">Preço total</p>
          <p className="num text-2xl">{formatPrice(total.totalCents, currency)}</p>
          <nav aria-label="Moeda" className="num space-x-2 text-sm">
            {(["eur", "usd"] as const).map((c) =>
              c === currency ? (
                <span key={c} aria-current="true" className="underline decoration-accent underline-offset-4">
                  {c.toUpperCase()}
                </span>
              ) : (
                <Link key={c} href={links[c]} className="text-ink-2 no-underline hover:text-ink">
                  {c.toUpperCase()}
                </Link>
              ),
            )}
          </nav>
        </div>
      </div>

      <ValidationReport result={loaded.validation} />

      <nav aria-label="Secções" className="flex gap-6 border-b border-rule text-sm">
        {(
          [
            ["cartas", "Cartas"],
            ["avaliacao", "Avaliação"],
            ["mesa", "Lugar na mesa"],
          ] as const
        ).map(([v, label]) =>
          v === tab ? (
            <span key={v} aria-current="page" className="-mb-px border-b-2 border-accent pb-2 font-medium">
              {label}
            </span>
          ) : (
            <Link key={v} href={links[v]} className="pb-2 text-ink-2 no-underline hover:text-ink">
              {label}
            </Link>
          ),
        )}
      </nav>

      {evaluation && tab === "mesa" ? (
        <SeatView e={evaluation} params={params} valid={loaded.validation.ok} />
      ) : evaluation && tab === "avaliacao" ? (
        <EvaluationView e={evaluation} params={params} valid={loaded.validation.ok} />
      ) : (
        <>
          <p className="max-w-prose text-xs text-ink-2">
            Preços de referência do Scryfall ({currency === "eur" ? "Cardmarket" : "TCGplayer"}; edição escolhida pelo
            Scryfall ou, se essa não tiver preço, a impressão mais barata)
            {pricesDate && <>, atualizados a {dateFmt.format(pricesDate)}</>}. Podem ter até 24 h.
            {total.missing > 0 && (
              <>
                {" "}
                {total.missing === 1 ? "1 carta não tem" : `${total.missing} cartas não têm`} preço em{" "}
                {currency.toUpperCase()} e não {total.missing === 1 ? "conta" : "contam"} para o total.
              </>
            )}
          </p>
          <CardGrid groups={groups} currency={currency} />
        </>
      )}
    </div>
  );
}
