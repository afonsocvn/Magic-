"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EvalParams } from "@/lib/deck/params";

const selectCls = "border border-rule bg-paper px-1.5 py-0.5 text-sm";

export function EvalControls({ params }: { params: EvalParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { context: ctx } = params;

  const set = (changes: Record<string, string | null>) => {
    const sp = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v == null) sp.delete(k);
      else sp.set(k, v);
    }
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  return (
    <form className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" onSubmit={(e) => e.preventDefault()}>
      <label className="flex items-center gap-2">
        <span className="text-ink-2">Template</span>
        <select className={selectCls} value={params.template} onChange={(e) => set({ t: e.target.value })}>
          <option value="cz">Command Zone</option>
          <option value="ct">Commander Template</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-ink-2">Mesa</span>
        <select
          className={selectCls}
          value={ctx.players}
          // mudar o nº de jogadores repõe as regras por omissão
          onChange={(e) => set({ j: e.target.value, l: String(Math.min(ctx.seat, Number(e.target.value))), c1: null, mg: null })}
        >
          <option value="2">1 vs 1</option>
          <option value="3">3 jogadores</option>
          <option value="4">4 jogadores</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-ink-2">Lugar</span>
        <select className={selectCls} value={ctx.seat} onChange={(e) => set({ l: e.target.value })}>
          {Array.from({ length: ctx.players }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}.º{i === 0 ? " (começa)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-ink-2">Mãos até desistir</span>
        <select className={selectCls} value={params.hands} onChange={(e) => set({ n: e.target.value })}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5">
        <input type="checkbox" checked={ctx.firstPlayerDraws} onChange={(e) => set({ c1: e.target.checked ? "1" : "0" })} />
        <span className="text-ink-2">quem começa compra</span>
      </label>
      <label className="flex items-center gap-1.5">
        <input type="checkbox" checked={ctx.freeMulligan} onChange={(e) => set({ mg: e.target.checked ? "1" : "0" })} />
        <span className="text-ink-2">1.º mulligan grátis</span>
      </label>
    </form>
  );
}
