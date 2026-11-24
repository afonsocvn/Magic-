"use client";

import { useEffect, useState } from "react";
import { loadDecks } from "@/lib/myDecks";

/** Nome que deste a este deck em "Os meus decks" (se houver); senão o texto de reserva. */
export function SavedName({ id, fallback }: { id: string; fallback: string }) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => setName(loadDecks().find((d) => d.id === id)?.name ?? null), [id]);
  return (
    <>
      {name ?? fallback}
      {name && <span className="font-sans text-sm text-ink-2"> · {fallback}</span>}
    </>
  );
}
