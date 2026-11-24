"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { compareOrder, deckLabel, loadDecks, removeDeck, type SavedDeck } from "@/lib/myDecks";
import { ColorPips } from "./ColorPips";

const dateFmt = new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short" });

/** Lista dos decks guardados neste browser; escolhe dois para comparar. */
export function MyDecks() {
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => setDecks(loadDecks()), []);
  if (!decks.length) return null;

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));
  const pair = picked.map((id) => decks.find((d) => d.id === id)).filter((d): d is SavedDeck => !!d);
  const [a, b] = pair.length === 2 ? compareOrder(pair[0], pair[1]).map((d) => d.id) : [];

  return (
    <section aria-labelledby="meus" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-1">
        <h2 id="meus" className="text-lg">
          Os meus decks
        </h2>
        {picked.length === 2 ? (
          <Link href={`/comparar?a=${a}&b=${b}`} className="text-sm">
            Comparar os dois selecionados →
          </Link>
        ) : (
          <span className="text-xs text-ink-2">Seleciona dois para comparar.</span>
        )}
      </div>
      <ul className="divide-y divide-rule/60">
        {decks.map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-1.5 text-sm">
            <input
              type="checkbox"
              checked={picked.includes(d.id)}
              onChange={() => toggle(d.id)}
              aria-label={`Selecionar ${deckLabel(d)}`}
            />
            <Link href={`/deck/${d.id}`} className="min-w-0 flex-1 truncate no-underline hover:underline">
              {deckLabel(d)}
              {d.name && <span className="text-ink-2"> · {d.commander}</span>}
            </Link>
            <ColorPips identity={d.identity} size={14} />
            <span className="num hidden text-xs text-ink-2 sm:inline">{dateFmt.format(new Date(d.savedAt))}</span>
            <button
              type="button"
              onClick={() => {
                setDecks(removeDeck(d.id));
                setPicked((p) => p.filter((x) => x !== d.id));
              }}
              className="text-xs text-ink-2 hover:text-bad"
              aria-label={`Tirar ${deckLabel(d)} da lista`}
            >
              tirar
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-2">Guardado só neste browser. Os decks em si ficam no site; o link de cada um funciona em qualquer lado.</p>
    </section>
  );
}
