"use client";
/* eslint-disable @next/next/no-img-element -- imagens servidas pelo Scryfall, sem otimização local */

import { useEffect, useRef, useState } from "react";
import { formatPrice, type Currency } from "@/lib/deck/groups";
import type { ViewCard, ViewGroup } from "@/lib/deck/view";
import { ManaCost, OracleText } from "./Mana";

const SOURCE_LABEL: Record<string, string> = { tagger: "Scryfall Tagger", regra: "regra", "correção": "correção manual" };

export function CardGrid({ groups, currency }: { groups: ViewGroup[]; currency: Currency }) {
  const [open, setOpen] = useState<ViewCard | null>(null);

  return (
    <>
      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`g-${g.key}`}>
            <div className="flex items-baseline justify-between border-b border-rule pb-1 mb-4">
              <h2 id={`g-${g.key}`} className="text-lg">
                {g.label} <span className="num text-sm text-ink-2">{g.count}</span>
              </h2>
              {g.key !== "commander" && (
                <span className="num text-sm text-ink-2">{formatPrice(g.totalCents, currency)}</span>
              )}
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {g.cards.map((card) => (
                <li key={card.id}>
                  <CardTile card={card} currency={currency} onOpen={() => setOpen(card)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <CardDialog card={open} currency={currency} onClose={() => setOpen(null)} />
    </>
  );
}

function CardImage({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div
        className={`aspect-[488/680] rounded-[4.5%/3.2%] border border-rule bg-paper-2 p-3 font-serif text-sm ${className}`}
      >
        {alt}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      width={488}
      height={680}
      className={`block h-auto w-full aspect-[488/680] rounded-[4.5%/3.2%] bg-paper-2 ${className}`}
    />
  );
}

function CardTile({ card, currency, onOpen }: { card: ViewCard; currency: Currency; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group block w-full text-left" aria-haspopup="dialog">
      <div className="relative">
        <CardImage
          src={card.faces[0].image}
          alt={card.name}
          className="transition-transform duration-150 group-hover:-translate-y-0.5"
        />
        {card.quantity > 1 && (
          <span className="num absolute right-1.5 top-[11%] bg-ink px-1.5 text-xs text-paper">×{card.quantity}</span>
        )}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-ink-2 group-hover:text-ink">{card.name}</span>
        <span className="num shrink-0">{formatPrice(card.price, currency)}</span>
      </div>
    </button>
  );
}

function CardDialog({ card, currency, onClose }: { card: ViewCard | null; currency: Currency; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [face, setFace] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (card) {
      setFace(0);
      if (!d.open) d.showModal();
    } else if (d.open) d.close();
  }, [card]);

  const hasBackImage = !!card && card.faces.length > 1 && card.faces[1].image !== card.faces[0].image;
  const other: Currency = currency === "eur" ? "usd" : "eur";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[min(56rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto border border-rule bg-paper text-ink p-0 backdrop:bg-black/60"
    >
      {card && (
        <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,22rem)_1fr]">
          <div>
            <CardImage src={card.faces[hasBackImage ? face : 0].imageLarge} alt={card.faces[face]?.name ?? card.name} />
            {hasBackImage && (
              <div className="mt-2 flex gap-3 text-sm">
                {card.faces.map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFace(i)}
                    className={i === face ? "underline decoration-accent underline-offset-4" : "text-ink-2 hover:text-ink"}
                  >
                    {i === 0 ? "Frente" : "Verso"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl leading-tight">{card.name}</h2>
              <button type="button" onClick={() => ref.current?.close()} className="text-ink-2 hover:text-ink" aria-label="Fechar">
                Fechar
              </button>
            </div>

            {card.faces.map((f, i) => (
              <div key={i} className={i > 0 ? "border-t border-rule pt-4" : ""}>
                {card.faces.length > 1 && (
                  <p className="flex items-center justify-between gap-2 font-serif font-semibold">
                    {f.name} <ManaCost cost={f.manaCost} />
                  </p>
                )}
                {card.faces.length === 1 && <ManaCost cost={f.manaCost} size={17} />}
                <p className="mt-1 text-ink-2">{f.typeLine}</p>
                <div className="mt-2 leading-relaxed">
                  <OracleText text={f.oracleText} />
                </div>
              </div>
            ))}

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-rule pt-4">
              <dt className="text-ink-2">Preço</dt>
              <dd className="num">
                {formatPrice(card.price, currency)}
                <span className="text-ink-2">
                  {" "}
                  · {formatPrice(other === "eur" ? card.priceEur : card.priceUsd, other)}
                </span>
              </dd>
              {card.quantity > 1 && (
                <>
                  <dt className="text-ink-2">Cópias</dt>
                  <dd className="num">{card.quantity}</dd>
                </>
              )}
              <dt className="text-ink-2">Categorias</dt>
              <dd>
                {card.categories.length
                  ? card.categories.map((c, i) => (
                      <span key={c.label}>
                        {i > 0 && ", "}
                        {c.label}
                        <span className="text-ink-2 text-xs"> ({SOURCE_LABEL[c.source] ?? c.source})</span>
                      </span>
                    ))
                  : <span className="text-ink-2">nenhuma</span>}
              </dd>
              {card.gameChanger && (
                <>
                  <dt className="text-ink-2">Game Changer</dt>
                  <dd>sim (conta para o bracket)</dd>
                </>
              )}
            </dl>

            <a
              href={`https://scryfall.com/search?q=${encodeURIComponent(`!"${card.name}"`)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm"
            >
              Ver no Scryfall
            </a>
          </div>
        </div>
      )}
    </dialog>
  );
}
