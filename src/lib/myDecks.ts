/**
 * "Os meus decks": lista guardada só neste browser (localStorage), sem contas.
 * Pode vir vazia (navegação privada, dados limpos) — tudo funciona sem ela.
 */
export type SavedDeck = {
  id: string;
  commander: string;
  identity: string;
  name?: string;
  /** Deck de onde esta versão foi feita */
  baseId?: string;
  /** Primeira vez que foi guardado */
  createdAt: string;
  /** Última visita */
  savedAt: string;
};

const KEY = "meus-decks-v1";
const MAX = 50;

export function loadDecks(): SavedDeck[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedDeck[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function store(list: SavedDeck[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}

/** Guarda ou atualiza (mantém o nome e a base já guardados). Mais recente primeiro. */
export function upsertDeck(entry: Omit<SavedDeck, "savedAt" | "createdAt">): SavedDeck[] {
  const list = loadDecks();
  const cur = list.find((d) => d.id === entry.id);
  const now = new Date().toISOString();
  const next: SavedDeck = {
    ...cur,
    ...entry,
    name: cur?.name ?? entry.name,
    baseId: cur?.baseId ?? entry.baseId,
    createdAt: cur?.createdAt ?? cur?.savedAt ?? now,
    savedAt: now,
  };
  const out = [next, ...list.filter((d) => d.id !== entry.id)];
  store(out);
  return out;
}

export function renameDeck(id: string, name: string): SavedDeck[] {
  const out = loadDecks().map((d) => (d.id === id ? { ...d, name: name.trim() || undefined } : d));
  store(out);
  return out;
}

export function removeDeck(id: string): SavedDeck[] {
  const out = loadDecks().filter((d) => d.id !== id);
  store(out);
  return out;
}

/**
 * Ordem de comparação [base, nova]: se uma foi feita a partir da outra, essa
 * é a base; senão, a guardada primeiro.
 */
export function compareOrder(x: SavedDeck, y: SavedDeck): [SavedDeck, SavedDeck] {
  if (y.baseId === x.id) return [x, y];
  if (x.baseId === y.id) return [y, x];
  return Date.parse(x.createdAt ?? x.savedAt) <= Date.parse(y.createdAt ?? y.savedAt) ? [x, y] : [y, x];
}

export function deckLabel(d: SavedDeck): string {
  return d.name || d.commander;
}
