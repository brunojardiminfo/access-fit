/**
 * A faixa da Black November diz a verdade, e não quebra a loja.
 *
 * O que importa aqui é que o número da faixa venha do SALE de verdade: uma
 * faixa que anuncia 50% com a loja em 30% manda a cliente procurar o que não
 * existe, e ela não volta.
 */
import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d='') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const [nome, vp] of [['desktop',{width:1400,height:900}],['celular',{width:390,height:844}]]) {
  const pg = await (await b.newContext({ viewport: vp, deviceScaleFactor: 2 })).newPage();
  const quebras = []; pg.on('pageerror', e => quebras.push(e.message));
  await pg.goto(`${B}/`, { waitUntil: 'networkidle' });
  const faixa = pg.locator('a[aria-label^="Black November"]').first();
  checa(`${nome}: a faixa aparece`, await faixa.isVisible());

  // uma linha só: duas empurram a vitrine para fora da dobra
  const alt = await faixa.evaluate(el => el.getBoundingClientRect().height);
  checa(`${nome}: cabe em uma linha`, alt < 70, `${Math.round(alt)}px`);

  const estoura = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  checa(`${nome}: sem rolagem lateral`, !estoura);

  // leva para a vitrine do SALE, que é onde a promessa se cumpre
  checa(`${nome}: leva para o SALE`, (await faixa.getAttribute('href')) === '/produtos?sale=1');
  checa(`${nome}: sem quebra de JavaScript`, quebras.length === 0, quebras[0] || '');
  await pg.screenshot({ path: `/tmp/claude-0/faixa-${nome}.png`, clip: { x:0, y:0, width: vp.width, height: Math.min(vp.height, 420) } });
}

// o número da faixa é o do banco, não um literal
const pg = await (await b.newContext({ viewport:{width:1400,height:900} })).newPage();
await pg.goto(`${B}/`, { waitUntil: 'networkidle' });
const txt = await pg.locator('a[aria-label^="Black November"]').first().innerText();
const naFaixa = Number((txt.match(/(\d+)%/) || [])[1]);
// o maior desconto que a vitrine do SALE realmente entrega. Lido do payload
// da própria página: 20% é o automático de quem entrou pela regra dos 90 dias.
const html = await (await fetch(`${B}/produtos?sale=1`)).text();
const marcados = [...html.matchAll(/saleDiscount\\":(\d+)/g)].map(m => Number(m[1]));
const temAutomatica = /saleDiscount\\":null/.test(html);
const naVitrine = Math.max(0, ...marcados, temAutomatica ? 20 : 0);
checa('o % da faixa é o maior do SALE', naFaixa === naVitrine, `faixa ${naFaixa}% · vitrine ${naVitrine}%`);
console.log('PASSOU:'); ok.forEach(o => console.log('  ✓', o));
if (falhou.length) { console.log('FALHOU:'); falhou.forEach(f => console.log('  ✗', f)); }
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
await b.close(); process.exit(falhou.length ? 1 : 0);
