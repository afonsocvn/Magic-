"use client";

import { useEffect, useState } from "react";
import { loadDecks, renameDeck, upsertDeck } from "@/lib/myDecks";

/** Guarda este deck em "Os meus decks" e deixa dar-lhe um nome. */
export function RememberDeck({
  id,
  commander,
  identity,
  baseId,
  silent,
}: {
  id: string;
  commander: string;
  identity: string;
  baseId?: string;
  /** Só guarda, sem mostrar o campo do nome */
  silent?: boolean;
}) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    upsertDeck({ id, commander, identity, baseId });
    setName(loadDecks().find((d) => d.id === id)?.name ?? "");
  }, [id, commander, identity, baseId]);

  if (silent) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-ink-2">Nome</span>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
        onBlur={() => {
          renameDeck(id, name);
          setSaved(true);
        }}
        placeholder="ex.: versão com mais wipes"
        maxLength={60}
        className="w-56 border-b border-rule bg-transparent px-1 py-0.5 text-sm placeholder:text-ink-2/60 focus:border-ink focus:outline-none"
      />
      {saved && <span className="text-xs text-ink-2">guardado</span>}
    </label>
  );
}
