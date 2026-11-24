"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { deckId } from "@/lib/deck/serverSource";

export type SubmitState = { error?: string };

const MAX_LENGTH = 20_000;

export async function submitDeck(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  const text = String(form.get("decklist") ?? "").trim();
  if (!text) return { error: "Cola a decklist primeiro." };
  if (text.length > MAX_LENGTH) return { error: "O texto é demasiado longo para uma decklist de Commander." };

  const id = deckId(text);
  await prisma.deck.upsert({ where: { id }, create: { id, text }, update: {} });

  // Nova versão de um deck: vai direto para a comparação.
  const base = String(form.get("base") ?? "");
  if (/^[0-9a-f]{16}$/.test(base) && base !== id && (await prisma.deck.findUnique({ where: { id: base } }))) {
    redirect(`/comparar?a=${base}&b=${id}`);
  }
  redirect(`/deck/${id}`);
}
