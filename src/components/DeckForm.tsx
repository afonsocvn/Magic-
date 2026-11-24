"use client";

import { useActionState } from "react";
import { submitDeck, type SubmitState } from "@/app/actions";

const PLACEHOLDER = `// COMMANDER
1 Atraxa, Praetors' Voice (2X2) 190

1 Sol Ring (TRC) 499
1 Arcane Signet
1 Swords to Plowshares
…`;

export function DeckForm({ initialText = "", baseId }: { initialText?: string; baseId?: string }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitDeck, {});

  return (
    <form action={action} className="space-y-3">
      {baseId && <input type="hidden" name="base" value={baseId} />}
      <label htmlFor="decklist" className="block text-sm text-ink-2">
        Decklist
      </label>
      <textarea
        id="decklist"
        name="decklist"
        defaultValue={initialText}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        rows={22}
        className="num block w-full resize-y border border-rule bg-paper-2/40 px-3 py-2 text-[13px] leading-relaxed placeholder:text-ink-2/60 focus:border-ink focus:outline-none"
      />
      {state.error && (
        <p role="alert" className="text-sm text-bad">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="border border-ink bg-ink px-4 py-1.5 text-sm text-paper hover:bg-accent hover:border-accent disabled:opacity-60"
        >
          {pending ? "A verificar…" : baseId ? "Avaliar e comparar" : "Avaliar deck"}
        </button>
        <span className="text-xs text-ink-2">Nada é guardado além do texto da lista.</span>
      </div>
    </form>
  );
}
