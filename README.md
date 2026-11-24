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
  turno, mulligan grátis.
- **Onde melhorar**: lista ordenada pelos pontos da nota que cada correção
  recupera, com números concretos (cartas em falta, fontes de cor para 90 %,
  rampa ótima para os teus terrenos, trocas para baixar o CMC médio).
- **Lugar na mesa** (separador próprio): desenvolvimento de mana turno a
  turno calculado de forma exata (programação dinâmica sobre terrenos /
  rampa MV ≤ 2 / resto, testada contra enumeração exaustiva), comandante a
  tempo, interação na mão quando chega a 1.ª ameaça, comparação com um
  deck de referência (36/12) e entre lugares, gráfico da mana ao longo da
  mesa e sugestões de jogo geradas por regras fixas sobre esses números.
- Nota 0–100: contagens 40 + mana 30 + mão inicial 30, com cada parcela
  explicada na página.

## Gráficos e comparação

- **Perfil do deck** (separador Avaliação): radar com 10 eixos em escala
  0–10 (rampa, draw, interação, wipes, proteção, tutors, recursão, fecho,
  mana, velocidade; a fórmula de cada eixo está na página), dois gráficos
  de quadrantes (estilo de jogo: velocidade × interação; de que é feito:
  criaturas × velocidade), barras de tipos de carta e de símbolos vs.
  fontes por cor.
- **Fazer uma versão**: no deck, abre o editor com a lista; ao avaliar vai
  direto para `/comparar?a=<base>&b=<nova>`.
- **Comparar** (`/comparar`): cartas que saíram e entraram, nota e cada
  parcela com Δ, métricas lado a lado (verde = melhor, vermelho = pior),
  curva, radar e quadrantes das duas versões sobrepostos.
- **Os meus decks** (página inicial): lista guardada só no browser
  (localStorage), com nome para cada versão; seleciona dois para comparar.

## Versão estática (GitHub Pages, grátis)

O mesmo site, a correr todo no browser: as cartas vão num ficheiro JSON
(`data/cards.json`, ~11 MB, ~3 MB comprimido) e cada deck vai comprimido no
próprio link (`#/deck?d=…`), por isso partilhar um deck ou uma comparação é
só partilhar o link. Não precisa de servidor, base de dados nem chaves.

```bash
npm run export:static   # cartas da BD local → out-static/data
npm run build:static    # app.js + app.css + index.html → out-static
```

O workflow `.github/workflows/pages.yml` faz tudo sozinho a cada push e todos
os dias às 11:23 UTC (cartas e preços novos): importa o Scryfall, corre os
testes, exporta, constrói e publica. Para o ligar (uma vez):

1. Repositório público: *Settings → General → Danger Zone → Change visibility → Public*
   (o GitHub Pages é grátis só em repositórios públicos).
2. *Settings → Pages → Build and deployment → Source: GitHub Actions*.
3. *Actions → Publicar site → Run workflow*.

O site fica em `https://<utilizador>.github.io/Magic-/`. O GitHub suspende
tarefas diárias de repositórios sem atividade há 60 dias; nesse caso basta
voltar a correr o workflow em *Actions*.

## Estrutura

```
prisma/schema.prisma      Card, CardName, CardCategory, ImportRun, Deck
scripts/import-scryfall.ts
src/lib/scryfall/         cliente da API (ritmo, 429, cabeçalhos) e conversão das cartas
src/lib/cards/            normalização de nomes, gravação e pesquisa de cartas
src/lib/deck/             parser da decklist e validação
src/lib/deck/groups.ts    agrupar por tipo, preços e totais
src/lib/categories/       classificação das cartas (tags + regras + correções)
src/lib/math/             hipergeométrica, mana, templates, mesa, nota,
                          desenvolvimento (DP), lugares, onde melhorar, perfil
src/lib/deck/compare.ts   diferenças entre duas versões
src/components/charts/    radar, quadrantes, barras
src/components/views/     páginas do deck e da comparação (partilhadas)
src/static/               versão estática: dados, link do deck, shims do Next
scripts/export-static.ts, scripts/build-static.mjs
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
