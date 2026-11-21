/**
 * A nota que vai para a cliente é legível, e cobra o preço de hoje.
 *
 * Dois defeitos reais que apareceram numa nota enviada de verdade:
 *
 *  - as linhas alternadas da tabela tinham fundo branco escrito à mão
 *    (#fdfaf5) num tema escuro: texto claro sobre fundo claro, item invisível.
 *    Metade dos produtos da nota sumiu, e o total não fechava com o que dava
 *    para ler.
 *  - a venda montada no admin usava sempre o preço de tabela, sem consultar o
 *    SALE: a nota cobrava um preço que a vitrine não pratica.
 *
 * O contraste é MEDIDO, não conferido a olho: foi olhando que o defeito
 * passou.
 */
import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d='') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage();
await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

// um pedido com vários itens, que é onde o zebrado aparece
const pedidoId = process.env.PEDIDO_ID;
await pg.goto(`${B}/nota/${pedidoId}`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1200);

const linhas = await pg.locator('tbody tr').count();
checa('a nota lista os itens', linhas >= 2, `${linhas} linhas`);

// contraste WCAG entre o texto da célula e o fundo que realmente está atrás
const medidas = await pg.evaluate(() => {
  const lum = ([r,g,b]) => { const f = c => { c/=255; return c<=.03928 ? c/12.92 : Math.pow((c+.055)/1.055,2.4); };
    return .2126*f(r)+.7152*f(g)+.0722*f(b); };
  const rgb = s => (s.match(/\d+/g)||[0,0,0]).slice(0,3).map(Number);
  // sobe a árvore até achar um fundo que não seja transparente
  const fundo = el => { let n = el; while (n) { const c = getComputedStyle(n).backgroundColor;
      if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return rgb(c); n = n.parentElement; } return [255,255,255]; };
  return [...document.querySelectorAll('tbody tr td')].map(td => {
    const a = lum(rgb(getComputedStyle(td).color)), c = lum(fundo(td));
    const razao = (Math.max(a,c)+.05)/(Math.min(a,c)+.05);
    return { texto: td.innerText.trim().slice(0,28), razao: Math.round(razao*100)/100 };
  });
});
const pior = medidas.reduce((m, x) => x.razao < m.razao ? x : m, medidas[0]);
// 4.5 é o mínimo da WCAG para texto normal
checa('todo item da nota é legível', pior.razao >= 4.5, `pior: "${pior.texto}" com ${pior.razao}:1`);
checa('nenhuma célula quase invisível', medidas.every(m => m.razao >= 2), `${medidas.filter(m => m.razao < 2).length} abaixo de 2:1`);

await pg.screenshot({ path: '/tmp/claude-0/nota.png', fullPage: true });

// ── o preço que o admin monta é o de hoje, não o de tabela ──
await pg.goto(`${B}/admin/pedidos/novo`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1000);
const busca = pg.locator('input[placeholder*="rodut" i]').first();
await busca.fill(process.env.PECA_EM_SALE || 'a');
await pg.waitForTimeout(1500);
const primeiro = pg.locator('[style*="cursor"] >> text=/-\\d+%/').first();
const temRiscado = await primeiro.count() > 0;
checa('a busca mostra o desconto do SALE', temRiscado);

console.log('PASSOU:'); ok.forEach(o => console.log('  ✓', o));
if (falhou.length) { console.log('FALHOU:'); falhou.forEach(f => console.log('  ✗', f)); }
console.log('\ncontrastes:', medidas.map(m => m.razao).join(' '));
console.log(`${ok.length}/${ok.length + falhou.length}`);
await b.close(); process.exit(falhou.length ? 1 : 0);
