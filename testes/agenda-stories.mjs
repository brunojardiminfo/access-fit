/**
 * A agenda do dia: sete passos numerados, na ordem de postar.
 *
 * O que erraria em silêncio:
 *  1. o roteiro oferecer peça de outra categoria no dia da categoria — e aí a
 *     "agenda" é só a lista antiga com outro nome;
 *  2. a memória não girar: postar e a mesma peça voltar amanhã, que é o
 *     defeito que faz a seguidora ler a loja como parada;
 *  3. o registro contar a mesma postagem duas vezes (gerou + marcou) e
 *     empurrar a peça para o fim da fila em dobro;
 *  4. a tela abrir sem o passo 1, e aí não há ordem nenhuma.
 */
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { writeFileSync, chmodSync } from 'fs';

const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d = '') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));
const sql = q => { writeFileSync('/tmp/teste-agenda.sql', q + '\n'); chmodSync('/tmp/teste-agenda.sql', 0o644);
  return execSync('su postgres -c "psql -d afdemo -Atf /tmp/teste-agenda.sql"').toString().trim(); };

// começa limpo: resto de execução anterior falsearia a rotação
sql(`delete from "StoryPost"`);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 420, height: 1200 } });
const pg = await ctx.newPage();
const quebras = []; pg.on('pageerror', e => quebras.push(e.message));

await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

const abrir = async () => {
  await pg.goto(`${B}/admin/stories`, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1300);
  return pg.evaluate(() => document.body.innerText);
};

let txt = await abrir();

// ── a tela é uma agenda, não uma lista de sugestões ──
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const hoje = DIAS[new Date(Date.now() - 3 * 3600000).getUTCDay()];
checa('a tela diz que dia é hoje', txt.includes(hoje), hoje);
checa('e diz o tema do dia', /dia de |campeãs|bastidor/i.test(txt));
// a tira da semana está em maiúsculas por CSS: innerText devolve "SEG"
const alto = txt.toUpperCase();
checa('mostra a semana inteira', DIAS.slice(1).every(d => alto.includes(d.slice(0, 3).toUpperCase())));
checa('diz quantos stories são', /\d+ stories, nesta ordem/.test(txt),
      txt.match(/\d+ stories, nesta ordem/)?.[0] || '');

// ── o roteiro tem começo, meio e fim ──
for (const e of ['ABERTURA', 'PEÇA 1', 'FECHAMENTO']) {
  checa(`tem o passo ${e}`, txt.toUpperCase().includes(e));
}
const pecas = (txt.toUpperCase().match(/PEÇA \d/g) || []).length;
checa('são quatro peças no dia', pecas === 4, `${pecas}`);

// ── as peças são da categoria do dia ──
const categorias = sql(`select string_agg(distinct c.name, ' | ')
  from "Product" p join "Category" c on c.id = p."categoryId" where p.active and p.stock > 0`);
const nomes = await pg.evaluate(() =>
  [...document.querySelectorAll('strong')].map(s => s.textContent?.trim()).filter(Boolean));
const doDia = nomes.filter(n => !n.includes(' ou '));
if (doDia.length) {
  const cats = sql(`select count(distinct c.name) from "Product" p
    join "Category" c on c.id = p."categoryId"
    where trim(p.name) in (${doDia.map(n => `'${n.replace(/'/g, "''")}'`).join(',')})`);
  // segunda a sexta é uma ou duas categorias; sábado são as campeãs, soltas
  checa('as peças do dia saem da categoria do dia', Number(cats) <= 2,
        `${cats} categoria(s) de ${categorias.split(' | ').length}`);
}

// ── abertura e fechamento saem como imagem, com o logo ──
for (const tipo of ['abertura', 'fechamento']) {
  const b = pg.locator(`button[data-passo="${tipo}"]`);
  checa(`o passo ${tipo} tem imagem própria`, await b.count() === 1, `${await b.count()} botão(ões)`);
}

// ── a memória gira: o que foi postado sai da frente ──
const primeira = doDia[0];
checa('o roteiro trouxe uma peça', !!primeira, primeira || 'nenhuma');

/*
 * O "postei" do cartão da PEÇA 1, não o primeiro da tela.
 *
 * O primeiro é o da abertura, que não tem peça nenhuma — marcá-lo gravaria
 * uma linha sem produto, e o teste mediria a rotação de coisa nenhuma.
 */
// o segundo "postei" da tela: o roteiro é abertura (1) e depois Peça 1 (2)
await pg.locator('button:has-text("postei")').nth(1).click();
await pg.waitForTimeout(1200);
const comPeca = Number(sql(`select count(*) from "StoryPost" where "productId" is not null`));
checa('marcar "postei" grava a passagem da peça', comPeca === 1, `${comPeca} linha(s) com peça`);

txt = await abrir();
const depois = await pg.evaluate(() =>
  [...document.querySelectorAll('strong')].map(s => s.textContent?.trim()).filter(Boolean));
checa('a peça postada sai da frente no dia seguinte',
      !depois.filter(n => !n.includes(' ou ')).slice(0, 1).includes(primeira),
      `antes ${primeira} · agora ${depois.filter(n => !n.includes(' ou '))[0]}`);

// ── não conta a mesma postagem duas vezes ──
const idDaPeca = sql(`select "productId" from "StoryPost" where "productId" is not null limit 1`);
const antes = Number(sql(`select count(*) from "StoryPost"`));
const r = await pg.request.post(`${B}/api/admin/stories`, {
  data: { productId: idDaPeca, slot: 2, kind: 'peca' },
  headers: { 'Content-Type': 'application/json' },
});
const corpo = await r.json();
const agora = Number(sql(`select count(*) from "StoryPost"`));
checa('gerar e marcar a mesma peça não vira duas passagens',
      agora === antes && corpo.jaRegistrado === true, `${antes} → ${agora}`);

// ── a API é só do admin ──
const semLogin = await (await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })).newContext();
const anon = await semLogin.newPage();
const bloqueado = await anon.request.post(`${B}/api/admin/stories`, {
  data: { slot: 1, kind: 'peca' }, headers: { 'Content-Type': 'application/json' },
});
checa('quem não é admin não grava nada', bloqueado.status() === 401, `HTTP ${bloqueado.status()}`);

checa('nenhum erro de JavaScript', quebras.length === 0, quebras[0] || '');

sql(`delete from "StoryPost"`);
await b.close();
console.log(ok.map(n => `✓ ${n}`).join('\n'));
if (falhou.length) console.log('\n' + falhou.map(n => `✗ ${n}`).join('\n'));
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
process.exit(falhou.length ? 1 : 0);
