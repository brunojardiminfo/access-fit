/**
 * A parceria: a venda conta, o cashback bate, e o link dela não entrega a loja.
 *
 * Os três pontos onde isto erraria em silêncio:
 *
 *  1. a venda da Black November (sem cupom, só marcada) não contar;
 *  2. a venda antiga (só com cupom, sem marcação) sumir ao cadastrar a parceira;
 *  3. o link sem senha mostrar nome de cliente ou peça — não é dela, e um link
 *     que escapa de um grupo levaria junto a lista de clientes da loja.
 */
import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d='') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));
const moeda = v => Math.round(v * 100) / 100;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

const api = (m, corpo) => pg.request.fetch(`${B}/api/admin/parceiras`, {
  method: m, data: corpo, headers: { 'Content-Type': 'application/json' },
});

// cadastra com o MESMO código do cupom que já existe nos pedidos antigos
const criada = await api('POST', {
  nome: 'Isa Teste', codigo: process.env.CODIGO, telefone: '51999999999',
  comissao: 5, userId: process.env.CLIENTE_ID,
});
checa('cadastra a parceira', criada.ok(), `HTTP ${criada.status()}`);
const p0 = await criada.json();

// código duplicado é recusado: dois crachás iguais quebrariam o relatório
const repetida = await api('POST', { nome: 'Outra', codigo: process.env.CODIGO, comissao: 5 });
checa('recusa código repetido', repetida.status() === 409, `HTTP ${repetida.status()}`);

const ler = async () => {
  const r = await pg.request.get(`${B}/api/admin/parceiras`);
  return (await r.json()).parceiras.find(x => x.id === p0.id);
};

const antes = await ler();
checa('vendas antigas com o cupom já entram', antes.pedidos >= Number(process.env.PEDIDOS_COM_CUPOM),
      `${antes.pedidos} pedidos · esperado ao menos ${process.env.PEDIDOS_COM_CUPOM}`);
checa('o cashback é 5% do vendido', Math.abs(antes.cashbackGerado - moeda(antes.vendido * 0.05)) < 0.02,
      `${antes.cashbackGerado} de ${antes.vendido}`);

// marca um pedido SEM cupom — é o caso da Black November
const marcar = await pg.request.fetch(`${B}/api/admin/pedidos/${process.env.PEDIDO_SEM_CUPOM}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  data: { parceiraId: p0.id },
});
checa('marca o pedido na parceira', marcar.ok(), `HTTP ${marcar.status()}`);
const depois = await ler();
checa('a venda sem cupom passa a contar', depois.pedidos === antes.pedidos + 1,
      `${antes.pedidos} → ${depois.pedidos}`);
checa('o vendido subiu junto', depois.vendido > antes.vendido,
      `${antes.vendido} → ${depois.vendido}`);

// creditar: o valor sai da conta do servidor, e o saldo dela aparece
const cred = await api('PUT', { id: p0.id, acao: 'creditar' });
checa('credita o cashback', cred.ok(), `HTTP ${cred.status()}`);
const { creditado } = await cred.json();
const comCredito = await ler();
checa('o valor creditado é o cashback gerado', Math.abs(creditado - depois.cashbackGerado) < 0.02,
      `creditou ${creditado} · gerado ${depois.cashbackGerado}`);
checa('não sobra nada a creditar', comCredito.aCreditar === 0, `restou ${comCredito.aCreditar}`);
checa('o saldo dela na loja subiu', comCredito.saldoNaLoja >= creditado,
      `saldo ${comCredito.saldoNaLoja}`);

// creditar de novo não duplica
const denovo = await api('PUT', { id: p0.id, acao: 'creditar' });
checa('não credita duas vezes', denovo.status() === 400, `HTTP ${denovo.status()}`);

// ── o link dela, aberto sem sessão nenhuma ──
const anon = await (await b.newContext()).newPage();
await anon.goto(`${B}/parceira/${p0.token}`, { waitUntil: 'networkidle' });
const texto = await anon.evaluate(() => document.body.innerText);
checa('o link abre sem senha', texto.includes('Isa Teste'));
checa('mostra o código dela', texto.includes(process.env.CODIGO));
checa('mostra o saldo', /R\$/.test(texto));

// o que NÃO pode estar ali
const cliente = process.env.NOME_CLIENTE || '';
checa('não expõe nome de cliente', !texto.includes(cliente), cliente);
checa('não expõe peça comprada', !texto.includes(process.env.NOME_PECA || 'zzz'));

// token errado não abre
const r404 = await anon.goto(`${B}/parceira/naoexiste123`, { waitUntil: 'domcontentloaded' });
checa('token inválido não abre', r404.status() === 404, `HTTP ${r404.status()}`);

console.log('PASSOU:'); ok.forEach(o => console.log('  ✓', o));
if (falhou.length) { console.log('FALHOU:'); falhou.forEach(f => console.log('  ✗', f)); }
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
await b.close(); process.exit(falhou.length ? 1 : 0);
