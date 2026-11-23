import Link from "next/link";
import { notFound } from "next/navigation";
import { CardGrid } from "@/components/CardGrid";
import { ColorPips } from "@/components/ColorPips";
import { ValidationReport } from "@/components/ValidationReport";
import { prisma } from "@/lib/db";
import { deckTotal, formatPrice, mergeLines, type Currency } from "@/lib/deck/groups";
import { loadDeck } from "@/lib/deck/load";
import { parseEvalParams, type RawParams } from "@/lib/deck/params";
import { EvaluationView } from "@/components/eval/EvaluationView";
import { evaluateDeck } from "@/lib/math/evaluate";
import type { EvalCard } from "@/lib/math/mana";
import type { DeckCard } from "@/lib/cards/types";
import type { Classification } from "@/lib/categories/classify";
import { toViewCard, toViewGroups, type ViewGroup } from "@/lib/deck/view";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" });

export default async function DeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const evalParams = parseEvalParams(raw);
  const currency: Currency = evalParams.currency;
  const tab = raw.v === "avaliacao" ? "avaliacao" : "cartas";
  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck) notFound();

  const [loaded, lastImport] = await Promise.all([
    loadDeck(prisma, deck.text),
    prisma.importRun.findFirst({ where: { status: "ok" }, orderBy: { finishedAt: "desc" } }),
  ]);

  const commanderLines = mergeLines(loaded.commander.map((r) => ({ card: r.card, quantity: r.entry.quantity })));
  const mainLines = loaded.main.map((r) => ({ card: r.card, quantity: r.entry.quantity }));
  const allLines = [...commanderLines, ...mainLines];
  const total = deckTotal(allLines, currency);
  const commander = commanderLines[0]?.card;

  const groups: ViewGroup[] = [
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
  ];

  const toEval = (card: DeckCard, quantity: number): EvalCard => ({
    ...card,
    quantity,
    categories: (loaded.classification.get(card.id) as Classification).categories,
  });
  const evaluation =
    tab === "avaliacao"
      ? evaluateDeck({
          deck: mergeLines(mainLines).map((l) => toEval(l.card, l.quantity)),
          commander: commander ? toEval(commander, 1) : null,
          identity: commander?.colorIdentity ?? "",
          templateId: evalParams.template,
          context: evalParams.context,
          hands: evalParams.hands,
        })
      : null;

  const moedaHref = (c: Currency) => {
    const sp = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"));
    if (c === "eur") sp.delete("moeda");
    else sp.set("moeda", c);
    const q = sp.toString();
    return `/deck/${id}${q ? `?${q}` : ""}`;
  };
  const tabHref = (v: "cartas" | "avaliacao") => {
    const sp = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"));
    if (v === "cartas") sp.delete("v");
    else sp.set("v", v);
    const q = sp.toString();
    return `/deck/${id}${q ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-rule pb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-2">Comandante</p>
          <h1 className="text-2xl">
            {commander ? commander.name : "—"} {commander && <ColorPips identity={commander.colorIdentity} size={18} />}
          </h1>
          <Link href={`/?from=${id}`} className="text-sm">
            Editar lista
          </Link>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-ink-2">Preço total</p>
          <p className="num text-2xl">{formatPrice(total.totalCents, currency)}</p>
          <nav aria-label="Moeda" className="num text-sm space-x-2">
            {(["eur", "usd"] as const).map((c) =>
              c === currency ? (
                <span key={c} aria-current="true" className="underline decoration-accent underline-offset-4">
                  {c.toUpperCase()}
                </span>
              ) : (
                <Link key={c} href={moedaHref(c)} className="text-ink-2 no-underline hover:text-ink">
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
          ] as const
        ).map(([v, label]) =>
          v === tab ? (
            <span key={v} aria-current="page" className="-mb-px border-b-2 border-accent pb-2 font-medium">
              {label}
            </span>
          ) : (
            <Link key={v} href={tabHref(v)} className="pb-2 text-ink-2 no-underline hover:text-ink">
              {label}
            </Link>
          ),
        )}
      </nav>

      {evaluation ? (
        <EvaluationView e={evaluation} params={evalParams} valid={loaded.validation.ok} />
      ) : (
        <>
          <p className="text-xs text-ink-2 max-w-prose">
            Preços de referência do Scryfall ({currency === "eur" ? "Cardmarket" : "TCGplayer"}; edição escolhida pelo
            Scryfall ou, se essa não tiver preço, a impressão mais barata)
            {lastImport?.finishedAt && <>, atualizados a {dateFmt.format(lastImport.finishedAt)}</>}. Podem ter até 24
            h.
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
