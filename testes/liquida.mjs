/**
 * A liquidação em lote nunca vende abaixo do custo.
 *
 * O teto é a única coisa que não pode falhar nesta tela: um desconto em lote
 * que passe do custo transforma queima de estoque em prejuízo silencioso,
 * peça por peça, sem ninguém conferir.
 */
import { chromium } from 'playwright';
const B = 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d='') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

await pg.goto(`${B}/admin/liquida`, { waitUntil: 'networkidle', timeout: 45000 });
await pg.waitForTimeout(1200);
const txt = () => pg.evaluate(() => document.body.innerText);
let t = await txt();
checa('a tela abre', t.includes('Liquidação'));
checa('mostra dinheiro parado', /dinheiro parado/i.test(t));
checa('lista peças', (await pg.locator('.linha-liquida').count()) > 5,
      `${await pg.locator('.linha-liquida').count()} linhas`);

// A ordem precisa ser pelo dinheiro parado × tempo, não pela data
const ordem = await pg.evaluate(() => [...document.querySelectorAll('.linha-liquida')].slice(0, 6).map(l => {
  const m = l.innerText.match(/R\$\s*([\d.]+),(\d\d)/);
  const d = l.innerText.match(/(\d+)\s*dias/);
  return { reais: m ? parseFloat(m[1].replace(/\./g, '') + '.' + m[2]) : 0, dias: d ? +d[1] : 0 };
}));
const pesos = ordem.map(o => o.reais * o.dias);
checa('ordenado pelo peso do encalhe', pesos.every((v, i) => i === 0 || pesos[i-1] >= v - 0.5),
      pesos.map(p => Math.round(p)).join(' ≥ '));

// ── O teste que importa: aplicar um desconto absurdo em TUDO ──
const antes = await pg.evaluate(async b => {
  const r = await fetch(b + '/api/admin/liquida', { method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ['__inexistente__'], desconto: 150 }) });
  return r.status;
}, B);
checa('recusa desconto acima de 90%', antes === 400, 'status ' + antes);

const ids = await pg.evaluate(() => [...document.querySelectorAll('input[type=checkbox]')].length);
await pg.click('text=marcar todas');
await pg.waitForTimeout(400);
pg.on('dialog', d => d.accept());
await pg.fill('input[aria-label="Desconto em porcentagem"]', '80');
await pg.waitForTimeout(300);
await pg.click('text=/Aplicar 80%/');
await pg.waitForTimeout(4000);

console.log('peças na tela:', ids);
await b.close();

// Confere no banco: nenhuma peça pode ter ficado abaixo do custo
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const pecas = await prisma.product.findMany({
  where: { active: true, onSale: true, costPrice: { not: null } },
  select: { name: true, price: true, costPrice: true, saleDiscount: true },
});
const furadas = pecas.filter(p => p.price * (100 - (p.saleDiscount || 0)) / 100 < p.costPrice - 0.005);
checa('nenhuma peça abaixo do custo depois de 80% em lote',
      furadas.length === 0,
      furadas.length ? furadas.slice(0,3).map(f => `${f.name} ${f.saleDiscount}%`).join(', ') : `${pecas.length} em liquidação`);
checa('o lote de fato aplicou desconto', pecas.length > 5, `${pecas.length} peças`);
await prisma.$disconnect();

console.log('PASSOU:'); ok.forEach(o => console.log('  ✓', o));
if (falhou.length) { console.log('FALHOU:'); falhou.forEach(f => console.log('  ✗', f)); }
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
process.exit(falhou.length ? 1 : 0);
