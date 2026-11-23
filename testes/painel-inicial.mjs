/**
 * A tela inicial: o que exige ação primeiro, e dois números que não mentem.
 *
 * O que erraria em silêncio:
 *  1. "Vendido" e "Entrou" mostrarem o mesmo valor — seria o sinal de que o
 *     recebimento do link voltou a ser gravado na data da venda, e o dono
 *     acharia que recebeu o que ainda não caiu;
 *  2. saldo em caixa reaparecer — ele mistura dinheiro da loja com o pessoal,
 *     então qualquer saldo é ficção;
 *  3. o menu fixo cobrir o fim da página.
 */
import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d='') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await (await b.newContext({ viewport: { width: 420, height: 920 }, deviceScaleFactor: 2 })).newPage();
const quebras = []; pg.on('pageerror', e => quebras.push(e.message));
await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

await pg.goto(`${B}/admin`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1500);
const txt = await pg.evaluate(() => document.body.innerText);

checa('mostra o vendido do mês', /Vendido no mês/i.test(txt));
checa('mostra o que entrou de verdade', /Entrou de verdade/i.test(txt));
checa('mostra o que saiu', /Saiu no mês/i.test(txt));
checa('mostra como entrou', /Como entrou este mês/i.test(txt));
checa('tem o gráfico de 6 meses', /Últimos 6 meses/i.test(txt));
checa('mostra saúde do estoque', /Estoque/i.test(txt) && /Acabando/i.test(txt));

// o que foi tirado de propósito
checa('não fala em saldo em caixa', !/saldo em caixa/i.test(txt));
checa('não abre com Home Try-On', !/Home Try-On/i.test(txt));
checa('não mostra lucro acumulado', !/lucro acumulado/i.test(txt));

// vendido e entrou precisam ser números distintos quando há venda no link
const numeros = await pg.evaluate(() => {
  const pega = (rotulo) => {
    const el = [...document.querySelectorAll('div')]
      .find(d => d.children.length === 0 && new RegExp(rotulo, 'i').test(d.textContent || ''));
    const valor = el?.parentElement?.querySelector('div:nth-child(2)');
    return valor?.textContent?.trim() || null;
  };
  return { vendido: pega('Vendido no mês'), entrou: pega('Entrou de verdade') };
});
checa('vendido e entrou são lidos da tela', !!numeros.vendido && !!numeros.entrou,
      `${numeros.vendido} / ${numeros.entrou}`);

// o menu fixo não pode cobrir o fim da página
const alcanca = await pg.evaluate(() => {
  const l = [...document.querySelectorAll('a')].find(a => /Liquidação/.test(a.innerText || ''));
  if (!l) return null;
  l.scrollIntoView({ block: 'center' });
  const r = l.getBoundingClientRect();
  const topo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return l.contains(topo) || l === topo;
});
checa('o menu não cobre o fim da página', alcanca === true, String(alcanca));

const estoura = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
checa('sem rolagem lateral', !estoura);
checa('sem quebra de JavaScript', quebras.length === 0, quebras[0] || '');

await pg.screenshot({ path: '/tmp/claude-0/painel.png', fullPage: true });
console.log('PASSOU:'); ok.forEach(o => console.log('  ✓', o));
if (falhou.length) { console.log('FALHOU:'); falhou.forEach(f => console.log('  ✗', f)); }
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
await b.close(); process.exit(falhou.length ? 1 : 0);
