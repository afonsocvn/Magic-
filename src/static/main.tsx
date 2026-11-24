/**
 * Versão estática do site (GitHub Pages): tudo corre no browser, com as
 * cartas em data/cards.json. Rotas no hash:
 *   #/                      colar a decklist
 *   #/deck?d=<lista>        um deck (a lista vai comprimida no link)
 *   #/comparar?a=…&b=…      duas versões
 */
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { MyDecks } from "@/components/MyDecks";
import { HomeAside, SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CompareView } from "@/components/views/CompareView";
import { DeckView, type DeckLinks, type DeckTab } from "@/components/views/DeckView";
import { evaluateLoadedDeck } from "@/lib/deck/evaluation";
import { loadDeck, type LoadedDeck } from "@/lib/deck/load";
import { parseEvalParams } from "@/lib/deck/params";
import { decodeDeck, deckKey, encodeDeck } from "./codec";
import { loadCardDb, staticSource, type CardDb } from "./source";

function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const h = hash.replace(/^#/, "") || "/";
  const [path, query = ""] = h.split("?");
  return { path: path || "/", params: new URLSearchParams(query) };
}

const deckHref = (text: string, extra = "") => `#/deck?d=${encodeDeck(text)}${extra}`;

function withParams(path: string, params: URLSearchParams, changes: Record<string, string | null>) {
  const sp = new URLSearchParams(params);
  for (const [k, v] of Object.entries(changes)) {
    if (v == null) sp.delete(k);
    else sp.set(k, v);
  }
  return `#${path}?${sp.toString()}`;
}

function Loading({ text }: { text: string }) {
  return <p className="py-16 text-center text-sm text-ink-2">{text}</p>;
}

function Problem({ text }: { text: string }) {
  return (
    <div className="space-y-3 py-16 text-center text-sm">
      <p className="text-bad">{text}</p>
      <a href="#/">Voltar ao início</a>
    </div>
  );
}

function Home({ params }: { params: URLSearchParams }) {
  const from = params.get("from");
  const base = params.get("base");
  const initial = useMemo(() => (from ? decodeDeck(from) ?? "" : ""), [from]);
  const baseText = useMemo(() => (base ? decodeDeck(base) : null), [base]);
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setText(initial), [initial]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return setError("Cola a decklist primeiro.");
    if (t.length > 20_000) return setError("O texto é demasiado longo para uma decklist de Commander.");
    window.scrollTo(0, 0);
    window.location.hash =
      baseText && encodeDeck(baseText) !== encodeDeck(t)
        ? `#/comparar?a=${encodeDeck(baseText)}&b=${encodeDeck(t)}`
        : deckHref(t);
  };

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_17rem]">
      <section>
        <h1 className="mb-1 text-2xl">{baseText ? "Nova versão do deck" : "Colar a decklist"}</h1>
        <p className="mb-6 max-w-prose text-ink-2">
          {baseText ? (
            "Muda as cartas que quiseres. Ao avaliar, vês esta versão lado a lado com a anterior."
          ) : (
            <>
              Uma carta por linha. O comandante vai debaixo de <code className="num text-ink">{"// COMMANDER"}</code>.
            </>
          )}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="decklist" className="block text-sm text-ink-2">
            Decklist
          </label>
          <textarea
            id="decklist"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"// COMMANDER\n1 Atraxa, Praetors' Voice (2X2) 190\n\n1 Sol Ring (TRC) 499\n1 Arcane Signet\n1 Swords to Plowshares\n…"}
            spellCheck={false}
            rows={22}
            className="num block w-full resize-y border border-rule bg-paper-2/40 px-3 py-2 text-[13px] leading-relaxed placeholder:text-ink-2/60 focus:border-ink focus:outline-none"
          />
          {error && (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          )}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="border border-ink bg-ink px-4 py-1.5 text-sm text-paper hover:border-accent hover:bg-accent"
            >
              {baseText ? "Avaliar e comparar" : "Avaliar deck"}
            </button>
            <span className="text-xs text-ink-2">A lista fica só no link e no teu browser.</span>
          </div>
        </form>
        <div className="mt-12">
          <MyDecks
            deckHref={(d) => (d.text ? deckHref(d.text) : null)}
            compareHref={(a, b) => (a.text && b.text ? `#/comparar?a=${encodeDeck(a.text)}&b=${encodeDeck(b.text)}` : null)}
          />
        </div>
      </section>
      <HomeAside />
    </div>
  );
}

function useLoaded(db: CardDb, text: string | null) {
  const [state, setState] = useState<{ text: string; loaded: LoadedDeck; key: string } | null>(null);
  useEffect(() => {
    if (!text) return;
    let alive = true;
    Promise.all([loadDeck(staticSource(db), text), deckKey(text)]).then(([loaded, key]) => {
      if (alive) setState({ text, loaded, key });
    });
    return () => {
      alive = false;
    };
  }, [db, text]);
  return state && state.text === text ? state : null;
}

function Deck({ db, params }: { db: CardDb; params: URLSearchParams }) {
  const code = params.get("d") ?? "";
  const text = useMemo(() => decodeDeck(code), [code]);
  const state = useLoaded(db, text);
  if (!text) return <Problem text="Este link não tem uma decklist válida." />;
  if (!state) return <Loading text="A avaliar o deck…" />;

  const raw = Object.fromEntries(params.entries());
  const evalParams = parseEvalParams(raw);
  const tab: DeckTab = raw.v === "avaliacao" || raw.v === "mesa" ? raw.v : "cartas";
  const evaluation = tab !== "cartas" ? evaluateLoadedDeck(state.loaded, evalParams) : null;
  const href = (changes: Record<string, string | null>) => withParams("/deck", params, changes);
  const links: DeckLinks = {
    cartas: href({ v: null }),
    avaliacao: href({ v: "avaliacao" }),
    mesa: href({ v: "mesa" }),
    eur: href({ moeda: null }),
    usd: href({ moeda: "usd" }),
    version: `#/?from=${code}&base=${code}`,
    edit: `#/?from=${code}`,
  };
  return (
    <DeckView
      deckKey={state.key}
      deckText={state.text}
      loaded={state.loaded}
      evaluation={evaluation}
      tab={tab}
      params={evalParams}
      links={links}
      pricesDate={db.meta.bulkUpdatedAt ? new Date(db.meta.bulkUpdatedAt) : null}
    />
  );
}

function Compare({ db, params }: { db: CardDb; params: URLSearchParams }) {
  const [ca, cb] = [params.get("a") ?? "", params.get("b") ?? ""];
  const ta = useMemo(() => decodeDeck(ca), [ca]);
  const tb = useMemo(() => decodeDeck(cb), [cb]);
  const sa = useLoaded(db, ta);
  const sb = useLoaded(db, tb);
  if (!ta || !tb) return <Problem text="Este link de comparação está incompleto." />;
  if (!sa || !sb) return <Loading text="A comparar as duas versões…" />;
  const evalParams = parseEvalParams(Object.fromEntries(params.entries()));
  return (
    <CompareView
      a={sa.key}
      b={sb.key}
      la={sa.loaded}
      lb={sb.loaded}
      params={evalParams}
      links={{ a: deckHref(sa.text, "&v=avaliacao"), b: deckHref(sb.text, "&v=avaliacao") }}
      texts={{ a: sa.text, b: sb.text }}
    />
  );
}

function App() {
  const { path, params } = useHash();
  const [db, setDb] = useState<CardDb | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCardDb().then(setDb, (e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path, params.get("d"), params.get("a"), params.get("b")]); // eslint-disable-line react-hooks/exhaustive-deps

  let page: React.ReactNode;
  if (path === "/" || path === "") page = <Home params={params} />;
  else if (error) page = <Problem text={error} />;
  else if (!db) page = <Loading text="A carregar a base de cartas (cerca de 3 MB, só da primeira vez)…" />;
  else if (path === "/deck") page = <Deck db={db} params={params} />;
  else if (path === "/comparar") page = <Compare db={db} params={params} />;
  else page = <Problem text="Página não encontrada." />;

  const updated = db?.meta.bulkUpdatedAt
    ? `Cartas e preços de ${new Intl.DateTimeFormat("pt-PT", { dateStyle: "short" }).format(new Date(db.meta.bulkUpdatedAt))}.`
    : undefined;

  return (
    <div className="flex min-h-screen flex-col antialiased">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{page}</main>
      <SiteFooter note={updated} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
