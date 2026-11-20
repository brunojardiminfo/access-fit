/**
 * Nenhuma página ou rota pública pode devolver o custo da peça.
 *
 * POR QUE ESTE TESTE EXISTE. As consultas da vitrine usavam `include`, que
 * traz a linha inteira do banco. Como o Next manda o objeto do servidor para
 * o navegador, o custo de cada peça saía no código-fonte: a home entregava o
 * de 38 peças, a lista de conjuntos o de 15, e a API da peça a linha toda.
 *
 * O conserto foi trocar por `select` explícito. Mas `select` volta a ser
 * `include` com uma linha distraída, e isso NÃO QUEBRA NADA VISÍVEL — a loja
 * continua funcionando igual, só que contando o custo de novo. É o tipo de
 * regressão que ninguém descobre olhando a tela.
 *
 * Por isso o teste não confere o código: ele abre as respostas de verdade e
 * procura os nomes proibidos. Se um dia alguém acrescentar uma coluna
 * sigilosa ao banco, basta citá-la em CAMPOS_SIGILOSOS para ela passar a ser
 * vigiada aqui também.
 *
 * Como rodar, com o site de pé em http://localhost:3101:
 *   node testes/nada-de-custo-em-publico.mjs
 *   BASE=https://www.accessfit.com.br node testes/nada-de-custo-em-publico.mjs
 */

const BASE = process.env.BASE || "http://localhost:3101";

/** Repetido aqui de propósito: o teste não deve confiar no código que testa. */
const PROIBIDOS = ["costPrice", "supplierCode"];

async function alvos() {
  // As rotas que dependem de uma peça usam uma peça real da loja, para o
  // teste não passar só porque a resposta veio vazia.
  const mapa = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const slugs = [...new Set([...mapa.matchAll(/\/produtos\/([a-z0-9-]+)/g)].map(m => m[1]))];
  const peca = slugs[0];
  if (!peca) throw new Error("nenhuma peça no sitemap — a loja está vazia?");

  return [
    ["home", "/"],
    ["vitrine", "/produtos"],
    ["vitrine filtrada", "/produtos?categoria=conjuntos"],
    ["coleções", "/colecoes"],
    ["página da peça", `/produtos/${peca}`],
    ["API da peça", `/api/produtos/${peca}`],
    ["recomendações", `/api/produtos/${peca}/recomendacoes`],
    ["complete o look", `/api/produtos/${peca}/complete-o-look`],
    ["look", `/api/look?p=${peca}`],
    ["skus", "/api/produtos/skus"],
    ["navegação", "/api/navegacao"],
    ["sitemap", "/sitemap.xml"],
  ];
}

const achados = [];
let conferidos = 0;

for (const [nome, rota] of await alvos()) {
  let corpo;
  try {
    const r = await fetch(`${BASE}${rota}`);
    corpo = await r.text();
    if (r.status >= 500) { achados.push(`${nome}: respondeu ${r.status}`); continue; }
  } catch (e) {
    achados.push(`${nome}: não respondeu (${e.message})`);
    continue;
  }
  conferidos++;
  for (const campo of PROIBIDOS) {
    const vezes = corpo.split(campo).length - 1;
    if (vezes > 0) achados.push(`${nome} (${rota}) devolve "${campo}" ${vezes}×`);
  }
}

console.log(`conferidas ${conferidos} respostas públicas em ${BASE}`);
if (achados.length) {
  console.log("\nVAZAMENTO:");
  achados.forEach(a => console.log("  ✗", a));
  process.exit(1);
}
console.log("✓ nenhuma resposta pública contém", PROIBIDOS.join(" nem "));
