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

## Estrutura

```
prisma/schema.prisma      Card, CardName, ImportRun, Deck
scripts/import-scryfall.ts
src/lib/scryfall/         cliente da API (ritmo, 429, cabeçalhos) e conversão das cartas
src/lib/cards/            normalização de nomes, gravação e pesquisa de cartas
src/lib/deck/             parser da decklist e validação
src/lib/deck/groups.ts    agrupar por tipo, preços e totais
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
