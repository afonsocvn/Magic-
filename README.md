# Avaliação de decks Commander

Cola uma decklist de Commander e vê as cartas, os preços e uma avaliação
matemática do deck (mana, rampa, draw, remoção…).

Stack: Next.js (App Router) · TypeScript · Tailwind · Prisma + SQLite · Vitest.

## Começar

```bash
npm install
cp .env.example .env
npx prisma migrate dev      # cria prisma/dev.db
npm run import:scryfall     # descarrega e importa ~35 000 cartas (~1–3 min)
npm run db:seed             # carrega as correções de categorias
npm run dev
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | testes (Vitest) |
| `npm run import:scryfall` | importa o bulk `oracle_cards`; salta se não mudou desde a última vez |
| `npm run import:scryfall -- --force` | importa mesmo que o bulk não tenha mudado |
| `npm run import:scryfall -- --file x.jsonl.gz` | importa de um ficheiro local |
| `npm run import:scryfall -- --no-fill-prices` | não preenche preços em falta |
| `npm run import:scryfall -- --tags-only` | só atualiza as categorias (tags do Scryfall Tagger) |
| `npm run db:seed` | carrega `data/category-overrides.json` para a tabela `CardCategory` |

O Scryfall gera o bulk a cada 12 h: basta correr o import **uma vez por dia**
(cron, GitHub Action, Vercel Cron… ainda por decidir).

Se a tua rede usa um proxy HTTPS, o `fetch` do Node só o usa com
`NODE_USE_ENV_PROXY=1` (Node ≥ 22.21).

## Dados das cartas

- O import guarda, por carta: nome, custo, CMC, tipo, oracle text, cores,
  identidade de cor, mana produzida, legalidades, *game changer*, preços
  (EUR e USD, em cêntimos), links das imagens e faces.
- Imagens: só o link (`*.scryfall.io`), nunca o ficheiro.
- Cartas que faltem na base de dados são pedidas ao `/cards/collection`
  (lotes de 75, 2 pedidos/s, respeita o 429) e guardadas.
- O preço é o da impressão escolhida pelo Scryfall para o bulk, não o da
  edição exata indicada na lista. Quando essa impressão não tem preço
  (ex.: terrenos básicos de um set novo), o import lê o bulk `default_cards`
  e usa a impressão mais barata (`--no-fill-prices` desliga isto).
- O import completo demora ~3 min (35 000 cartas + preços em falta).

## Avaliação matemática

**Categorias** (terreno, rampa, draw, remoção pontual, board wipe, counter,
proteção, tutor, recursão, wincon), por ordem de prioridade:

1. Correções manuais em `data/category-overrides.json` (ganham sempre).
2. Tags do [Scryfall Tagger](https://tagger.scryfall.com) (bulk oficial
   `oracle_tags`), mapeadas em `src/lib/categories/tags.ts`.
3. Regras sobre o oracle text (`src/lib/categories/classify.ts`): dorks e
   rocks são rampa, procurar terrenos é rampa e não tutor, terrenos nunca
   são rampa, MDFC com face de terreno é terreno; para cartas sem tags há
   regras de reserva.

**Métricas** (`src/lib/math/`, tudo funções puras com testes):

- Contagens vs. template Command Zone (38/10/12/12/6) ou Commander
  Template (36/12/10/10), com semáforo.
- Curva, CMC médio sem terrenos, Karsten
  (31,42 + 3,13 × CMC médio − 0,28 × rampa MV 0–2), terrenos tapped.
- Fontes de cor: P(≥ k fontes entre as cartas vistas até ao turno = MV).
- Mão inicial (MustaKotka): hipergeométrica multivariada exata com
  terrenos / rampa MV 0–2 / resto; London mulligan 1 − (1 − p)^n;
  heatmap 28–45 × 0–20.
- Contexto de mesa (1vs1, 3 ou 4 jogadores, lugar): cartas vistas por
  turno, mulligan grátis, jogadas de terreno.
- Nota 0–100: contagens 40 + mana 30 + mão inicial 30, com cada parcela
  explicada na página.

## Estrutura

```
prisma/schema.prisma      Card, CardName, CardCategory, ImportRun, Deck
scripts/import-scryfall.ts
src/lib/scryfall/         cliente da API (ritmo, 429, cabeçalhos) e conversão das cartas
src/lib/cards/            normalização de nomes, gravação e pesquisa de cartas
src/lib/deck/             parser da decklist e validação
src/lib/deck/groups.ts    agrupar por tipo, preços e totais
src/lib/categories/       classificação das cartas (tags + regras + correções)
src/lib/math/             hipergeométrica, mana, templates, mesa, nota
data/category-overrides.json
src/components/           grelha de cartas, modal, símbolos de mana
src/app/                  páginas (colar deck, resultado)
tests/                    Vitest
```

## Migrar para Postgres

Mudar `provider` em `prisma/schema.prisma` para `postgresql`, apontar
`DATABASE_URL` para o Postgres, apagar `prisma/migrations` e correr
`npx prisma migrate dev --name init`. O esquema não usa nada exclusivo de SQLite.

---

Dados e imagens das cartas: [Scryfall](https://scryfall.com). Magic: The
Gathering é propriedade da Wizards of the Coast; este projeto não é afiliado
com a Wizards of the Coast nem com o Scryfall.
