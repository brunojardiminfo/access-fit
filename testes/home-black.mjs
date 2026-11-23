/**
 * A vitrine da Black November na home, com o preço já abaixado.
 *
 * Dois riscos:
 *  1. a cliente ver o preço de tabela no cartão e desistir antes de clicar —
 *     o desconto tem que estar no cartão, não só na página da peça;
 *  2. a seção virar uma segunda lista igual à do SALE, empilhada, porque as
 *     peças são as mesmas. Por isso é a MESMA seção vestida de outro jeito.
 */
import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d='') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const [nome, vp] of [['desktop', { width: 1366, height: 1000 }], ['celular', { width: 390, height: 844 }]]) {
  const pg = await (await b.newContext({ viewport: vp, deviceScaleFactor: 2 })).newPage();
  const quebras = []; pg.on('pageerror', e => quebras.push(e.message));
  await pg.goto(`${B}/`, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);

  const corpo = await pg.evaluate(() => document.body.innerText);
  checa(`${nome}: a seção se chama Black November`, corpo.includes('BLACK NOVEMBER'));
  checa(`${nome}: o SALE não aparece duas vezes`, !/🔥 SALE/.test(corpo));

  // cada cartão da seção mostra o preço COM desconto e o de tabela riscado
  const cartoes = await pg.evaluate(() => {
    const sec = [...document.querySelectorAll('section')]
      .find(s => /BLACK NOVEMBER/.test(s.innerText || ''));
    if (!sec) return null;
    return [...sec.querySelectorAll('a[href^="/produtos/"]')].map(a => {
      const txts = [...a.querySelectorAll('*')].filter(e => e.children.length === 0 && /R\$/.test(e.textContent || ''));
      return {
        nome: a.innerText.trim().split('\n')[0],
        precos: txts.map(e => e.textContent.trim()),
        riscados: txts.filter(e => getComputedStyle(e).textDecorationLine.includes('line-through')).length,
      };
    });
  });
  checa(`${nome}: a seção tem peças`, cartoes && cartoes.length > 0, `${cartoes?.length ?? 0}`);

  const semRiscado = (cartoes || []).filter(c => c.riscados === 0);
  checa(`${nome}: toda peça mostra o preço antigo riscado`, semRiscado.length === 0,
        semRiscado.map(c => c.nome).join(', '));

  // o preço cobrado tem que ser MENOR que o de tabela — não só "tem dois preços"
  const virou = (s) => Number(s.replace(/[^\d,]/g, '').replace(',', '.'));
  const invertidos = (cartoes || []).filter(c => {
    const vs = c.precos.map(virou).filter(n => n > 0);
    return vs.length >= 2 && Math.min(...vs) === vs[0] ? false : vs.length >= 2 && vs[0] >= Math.max(...vs);
  });
  checa(`${nome}: o preço em destaque é o menor`, invertidos.length === 0,
        invertidos.map(c => `${c.nome}: ${c.precos.join(' / ')}`).join(' | '));

  const estoura = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  checa(`${nome}: sem rolagem lateral`, !estoura);
  checa(`${nome}: sem quebra de JavaScript`, quebras.length === 0, quebras[0] || '');

  await pg.screenshot({ path: `/tmp/claude-0/home-black-${nome}.png`, fullPage: false });
}

console.log('PASSOU:'); ok.forEach(o => console.log('  ✓', o));
if (falhou.length) { console.log('FALHOU:'); falhou.forEach(f => console.log('  ✗', f)); }
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
await b.close(); process.exit(falhou.length ? 1 : 0);
