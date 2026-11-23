/**
 * O financeiro enxuto, o cupom com mínimo e o menu agrupado.
 *
 * O que erraria em silêncio:
 *  1. o mínimo do cupom existir só na tela — quem monta o pedido no admin
 *     passaria por cima e o desconto sairia abaixo do piso;
 *  2. o menu "Mais" esconder uma tela sem deixar caminho até ela;
 *  3. "saldo em caixa" voltar ao financeiro.
 */
import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d='') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 420, height: 920 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage();
const quebras = []; pg.on('pageerror', e => quebras.push(e.message));
await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

// ── FINANCEIRO ──
await pg.goto(`${B}/admin/financeiro`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1500);
const fin = await pg.evaluate(() => document.body.innerText);
checa('financeiro mostra Vendido', /Vendido/i.test(fin));
checa('financeiro mostra Entrou', /Entrou/i.test(fin));
checa('financeiro mostra Saiu', /Saiu/i.test(fin));
checa('financeiro mostra Em aberto', /Em aberto/i.test(fin));
for (const a of ['Vendas', 'Saídas', 'Cartão']) checa(`tem a aba ${a}`, fin.includes(a));
const abas = await pg.locator('button').filter({ hasText: /Vendas|Saídas|Cartão/ }).count();
checa('são três abas, não cinco', abas === 3, `${abas}`);
checa('não fala em saldo em caixa', !/saldo em caixa/i.test(fin));

await pg.locator('button:has-text("Saídas")').click(); await pg.waitForTimeout(800);
checa('a aba Saídas carrega o lançamento de despesa',
      /despesa|lançar|gasto/i.test(await pg.evaluate(() => document.body.innerText)));

// ── CUPOM COM MÍNIMO: o servidor recusa, não só a tela ──
const cupom = `TESTEMIN${Date.now() % 10000}`;
const criado = await pg.request.post(`${B}/api/admin/cupons`, {
  data: { code: cupom, discount: 10, type: 'percent', minValue: 200 },
  headers: { 'Content-Type': 'application/json' },
});
checa('cria cupom com valor mínimo', criado.ok(), `HTTP ${criado.status()}`);

const abaixo = await pg.request.get(`${B}/api/cupom?code=${cupom}&base=150`);
checa('recusa abaixo do mínimo', abaixo.status() === 400, `HTTP ${abaixo.status()}`);
const erro = await abaixo.json();
checa('o erro diz quanto falta', /Faltam/i.test(erro.error || ''), erro.error);

const acima = await pg.request.get(`${B}/api/cupom?code=${cupom}&base=250`);
checa('aceita acima do mínimo', acima.ok(), `HTTP ${acima.status()}`);

// o pedido do admin confere de novo, com os itens na mão
const pedido = await pg.request.post(`${B}/api/admin/pedidos`, {
  data: {
    userId: process.env.CLIENTE_ID,
    items: [{ productId: process.env.PECA_ID, description: 'teste', price: 50, quantity: 1 }],
    paymentMethod: 'pix', paymentStatus: 'pending', amountPaid: 0,
    couponCode: cupom, notes: 'teste automatico - minimo cupom',
  },
  headers: { 'Content-Type': 'application/json' },
});
checa('o servidor do pedido recusa abaixo do mínimo', pedido.status() === 400, `HTTP ${pedido.status()}`);
const erroPedido = await pedido.json();
checa('e explica o porquê', /a partir de/i.test(erroPedido.error || ''), erroPedido.error);

// ── MENU ──
await pg.goto(`${B}/admin`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1200);
const naBarra = await pg.locator('nav.admin-bottomnav a').count();
checa('a barra de baixo tem poucos itens', naBarra <= 6, `${naBarra} itens`);
const semRolagem = await pg.locator('nav.admin-bottomnav').evaluate(n => n.scrollWidth <= n.clientWidth + 2);
checa('a barra de baixo não rola de lado', semRolagem);

await pg.locator('nav.admin-bottomnav button:has-text("Mais")').click();
await pg.waitForTimeout(700);
const painel = await pg.evaluate(() => document.body.innerText);
// o innerText devolve em MAIÚSCULAS por causa do text-transform do título
const semCaso = painel.toLowerCase();
for (const g of ['catálogo', 'clientes', 'crescer', 'sistema'])
  checa(`o painel tem o grupo ${g}`, semCaso.includes(g));
for (const t of ['Liquidação', 'Parceiras', 'Caderno', 'Marketing']) checa(`${t} continua alcançável`, painel.includes(t));

checa('sem quebra de JavaScript', quebras.length === 0, quebras[0] || '');
await pg.screenshot({ path: '/tmp/claude-0/menu.png' });

console.log('PASSOU:'); ok.forEach(o => console.log('  ✓', o));
if (falhou.length) { console.log('FALHOU:'); falhou.forEach(f => console.log('  ✗', f)); }
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
await b.close(); process.exit(falhou.length ? 1 : 0);
