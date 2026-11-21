/**
 * A venda montada no admin puxa o preço de hoje sozinha.
 *
 * O teste anterior conferia só que a LISTA DE BUSCA mostrava o "-40%". Isso
 * não é a mesma pergunta: o que importa é o valor que entra no campo do item,
 * porque é ele que vira preço na nota. Dava para a lista mostrar o desconto e
 * o campo receber o preço cheio, e ninguém perceber.
 */
import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d='') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await (await b.newContext({ viewport: { width: 1400, height: 1100 } })).newPage();
await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

// a peça e o desconto vêm do banco, não escritos aqui
const PECA = process.env.PECA, PRECO = Number(process.env.PRECO), DESC = Number(process.env.DESC);
const esperado = Math.round(PRECO * (100 - DESC)) / 100;

await pg.goto(`${B}/admin/pedidos/novo`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1200);

await pg.locator('input[placeholder*="rodut" i]').first().fill(PECA);
await pg.waitForTimeout(1800);

const opcao = pg.locator(`text="${PECA}"`).last();
await opcao.click();
await pg.waitForTimeout(900);

const campo = pg.locator('input[placeholder*="preço" i]').first();
const valor = Number(await campo.inputValue());

checa('o campo recebe o preço COM desconto', Math.abs(valor - esperado) < 0.02,
      `campo ${valor} · esperado ${esperado} (tabela ${PRECO}, -${DESC}%)`);
checa('não é o preço de tabela', Math.abs(valor - PRECO) > 0.02, `tabela é ${PRECO}`);

// ── a ponta final: o que o campo mostra é o que o banco guarda ──
// Campo certo e nota errada seria possível: bastaria o servidor reler o preço
// de tabela ao gravar. Só o pedido criado de verdade responde isso — e a
// primeira versão deste teste "criou" um pedido que nunca existiu, e eu quase
// dei por conferido lendo um pedido antigo.
const cliente = process.env.CLIENTE_ID;
if (cliente) {
  const criado = await pg.request.post(`${B}/api/admin/pedidos`, {
    data: {
      userId: cliente,
      items: [{ productId: process.env.PECA_ID, description: PECA, price: valor, quantity: 1,
                size: process.env.TAMANHO || undefined, color: process.env.COR || undefined }],
      paymentMethod: 'pix', paymentStatus: 'pending', amountPaid: 0,
      notes: 'teste automatico - venda-puxa-sale',
    },
  });
  checa('o pedido é aceito pelo servidor', criado.ok(), `HTTP ${criado.status()}`);
  if (criado.ok()) {
    const pedido = await criado.json();
    const gravado = pedido?.items?.[0]?.price ?? pedido?.subtotal;
    checa('o banco guarda o preço com desconto', Math.abs(Number(gravado) - esperado) < 0.02,
          `gravado ${gravado} · esperado ${esperado}`);
    console.log('pedido de teste:', pedido.id);
  }
}

console.log('PASSOU:'); ok.forEach(o => console.log('  ✓', o));
if (falhou.length) { console.log('FALHOU:'); falhou.forEach(f => console.log('  ✗', f)); }
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
await b.close(); process.exit(falhou.length ? 1 : 0);
