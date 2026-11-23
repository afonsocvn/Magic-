import type { Status } from "@/lib/math/templates";

const LABEL: Record<Status, string> = { ok: "no alvo", warn: "perto", bad: "abaixo" };
const COLOR: Record<Status, string> = { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad" };

/** Semáforo: quadrado pequeno + texto (a cor nunca vai sozinha). */
export function StatusMark({ status, label }: { status: Status; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`inline-block size-2.5 ${COLOR[status]}`} aria-hidden />
      <span className="text-xs text-ink-2">{label ?? LABEL[status]}</span>
    </span>
  );
}
