/**
 * A vitrine continua inteira.
 *
 * Companheiro do `nada-de-custo-em-publico.mjs`. Aquele garante que a loja
 * não conta demais; este garante que ela não passou a contar de menos.
 *
 * Existe porque o conserto do vazamento trocou `include` (traz tudo) por
 * `select` (traz o que está na lista). Esquecer um campo da lista não dá
 * erro de compilação: a peça simplesmente aparece sem a cor, sem o tamanho
 * ou sem o preço riscado — e ninguém percebe até uma cliente reclamar.
 *
 * Como rodar, com o site de pé em http://localhost:3101:
 *   node testes/vitrine-de-pe.mjs
 */

import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3101";
const ok = [], falhou = [];
const checa = (n, c, d = "") => (c ? ok : falhou).push(n + (d ? ` (${d})` : ""));

const navegador = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const pg = await (await navegador.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

const quebras = [];
pg.on("pageerror", e => quebras.push("JS: " + e.message));

const slug = (await (await fetch(`${BASE}/sitemap.xml`)).text()).match(/\/produtos\/([a-z0-9-]+)/)[1];

/**
 * A página de coleções lista COLEÇÕES, não peças: cobrar preço dela
 * reprovaria uma tela que está certa. Por isso `querPreco` é por página.
 */
const paginas = [
  { nome: "home",           rota: "/",                          marca: null,        querPreco: true },
  { nome: "vitrine",        rota: "/produtos",                  marca: null,        querPreco: true },
  { nome: "coleções",       rota: "/colecoes",                  marca: "Coleções",  querPreco: false },
  { nome: "página da peça", rota: `/produtos/${slug}`,          marca: null,        querPreco: true },
];

for (const { nome, rota, marca, querPreco } of paginas) {
  await pg.goto(`${BASE}${rota}`, { waitUntil: "networkidle", timeout: 45000 });
  await pg.waitForTimeout(1500);
  const texto = await pg.evaluate(() => document.body.innerText);
  const fotos = await pg.evaluate(() => [...document.images].filter(i => i.naturalWidth > 0).length);
  const precos = (texto.match(/R\$\s?\d/g) || []).length;

  checa(`${nome}: abre com conteúdo`, texto.length > 400, `${texto.length} caracteres`);
  checa(`${nome}: tem imagem carregada`, fotos > 0, `${fotos} fotos`);
  if (querPreco) checa(`${nome}: mostra preço`, precos > 0, `${precos} preços`);
  if (marca) checa(`${nome}: conteúdo certo`, texto.includes(marca));
}

// A peça é a tela mais sensível ao `select`: cor, tamanho e compra dependem
// de campos que seria fácil esquecer na lista.
const peca = await pg.evaluate(() => document.body.innerText);
checa("peça: mostra tamanho", /TAMANHO/i.test(peca));
checa("peça: mostra a ação de compra", /adicionar|sacola|esgotad|escolha a cor/i.test(peca));

checa("nenhuma quebra de JavaScript", quebras.length === 0, quebras.slice(0, 2).join(" | "));

console.log("PASSOU:"); ok.forEach(o => console.log("  ✓", o));
if (falhou.length) { console.log("FALHOU:"); falhou.forEach(f => console.log("  ✗", f)); }
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
await navegador.close();
process.exit(falhou.length ? 1 : 0);
