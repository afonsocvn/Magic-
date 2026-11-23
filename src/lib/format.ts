const pctFmt = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const numFmt = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 });

/** 0.8912 → "89,1 %" */
export function pct(x: number): string {
  return `${pctFmt.format(x * 100)} %`;
}

export function num(x: number, digits = 2): string {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: digits }).format(x);
}

export { numFmt };
