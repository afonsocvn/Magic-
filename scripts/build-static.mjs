/**
 * Constrói a versão estática (GitHub Pages) em out-static/:
 *   app.js (esbuild), app.css (Tailwind), index.html.
 * Os dados (out-static/data) vêm de `npm run export:static`.
 */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "out-static";
mkdirSync(OUT, { recursive: true });

await build({
  entryPoints: ["src/static/main.tsx"],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
  outfile: `${OUT}/app.js`,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "next/link": "./src/static/shims/next-link.tsx",
    "next/navigation": "./src/static/shims/next-navigation.ts",
  },
  logLevel: "info",
});

execFileSync("npx", ["@tailwindcss/cli", "-i", "src/app/globals.css", "-o", `${OUT}/app.css`, "--minify"], {
  stdio: "inherit",
});

writeFileSync(
  `${OUT}/index.html`,
  `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Avaliação de decks Commander</title>
<meta name="description" content="Cola a decklist e vê as cartas, os preços e uma avaliação matemática do deck.">
<link rel="stylesheet" href="app.css">
</head>
<body>
<div id="root"></div>
<noscript>Este site precisa de JavaScript.</noscript>
<script type="module" src="app.js"></script>
</body>
</html>
`,
);
writeFileSync(`${OUT}/.nojekyll`, "");
console.log("Versão estática em", OUT);
