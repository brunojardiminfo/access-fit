/**
 * "Entradas do mês" é só o dinheiro que caiu na conta.
 *
 * Duas coisas erravam em silêncio, e as duas apareceram numa conversa dele:
 *
 *  1. CRÉDITO DA CLIENTE entre as barras de "como entrou". O cashback de
 *     indicação é crédito que a loja deu — ninguém depositou nada. Ele ficava
 *     fora do total mas DENTRO da lista, então a soma das barras não fechava
 *     com o "Entrou", e quem lê desconfia do número certo.
 *  2. VENDA NO LINK somada no mês da venda. O link cai 31 dias depois, logo é
 *     dinheiro de dezembro, não de novembro.
 *
 * Cada teste tem um controle: o número é medido ANTES e DEPOIS de inserir o
 * lançamento, porque "a tela mostra 3.000" não prova nada se eu não sei o que
 * ela mostrava antes.
 */
import { chromium } from 'playwright';
import { execSync } from 'child_process';

const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d = '') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));
import { writeFileSync, chmodSync } from 'fs';
/**
 * Consulta no banco local de teste.
 *
 * Vai por arquivo, não por -c: a consulta passa por `su postgres`, e aspas
 * dentro de aspas dentro de aspas é exatamente onde um teste quebra por
 * motivo que não tem nada a ver com o que ele deveria medir.
 */
const sql = q => {
  const f = '/tmp/teste-entradas.sql';
  writeFileSync(f, q + '\n');
  chmodSync(f, 0o644);
  return execSync(`su postgres -c "psql -d afdemo -Atf ${f}"`).toString().trim();
};

const CLIENTE = 'cmwdsod9n0001r19npebqhe4c';
const PRODUTO = 'cmwdsnr7q003b920kv9fv4jdu';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1100, height: 1400 } });
const pg = await ctx.newPage();
const quebras = []; pg.on('pageerror', e => quebras.push(e.message));

await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]');
await pg.waitForTimeout(3500);

/** O valor do cartão "Entrou" na tela do financeiro. */
async function entrou() {
  await pg.goto(`${B}/admin/financeiro`, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1200);
  const t = await pg.evaluate(() => document.body.innerText);
  const num = r => { const m = t.match(r); return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : null; };
  return { valor: num(/ENTROU\s*\n\s*R\$\s*([\d.]+,\d{2})/i),
           vendido: num(/VENDIDO\s*\n\s*R\$\s*([\d.]+,\d{2})/i), texto: t };
}

const antes = await entrou();
checa('o financeiro abre e mostra o Entrou', antes.valor !== null, `${antes.valor}`);

// ── 1. CRÉDITO: a loja abateu, ninguém depositou ──────────────────────────
const pedidoExistente = sql(`select id from "Order" where status <> 'cancelled' order by "createdAt" desc limit 1`);
const idCredito = `teste-credito-${Date.now()}`;
sql(`insert into "Payment" (id,"orderId",amount,"paymentMethod","receivedAt",notes)
     values ('${idCredito}','${pedidoExistente}',30,'credito',now(),'teste cashback indicação')`);

const comCredito = await entrou();
checa('crédito da cliente não entra no "Entrou"',
      comCredito.valor === antes.valor, `antes ${antes.valor} · depois ${comCredito.valor}`);
checa('crédito não aparece como barra de "como entrou"',
      !/Crédito da cliente\s*\n?\s*R\$/.test(comCredito.texto.split('Vendas do mês')[0] || ''));
checa('a tela explica o crédito em vez de esconder',
      /não é dinheiro que caiu na conta/i.test(comCredito.texto));
checa('a linha do recebimento vem marcada',
      /não é dinheiro novo/i.test(comCredito.texto));

// controle: sem o ajuste, somar tudo daria 30 a mais — provo que o número que
// a tela mostra não é simplesmente a soma de todos os Payment do mês
const somaBruta = Number(sql(`select coalesce(sum(amount),0) from "Payment" p
  join "Order" o on o.id = p."orderId"
  where o.status <> 'cancelled' and p."receivedAt" >= date_trunc('month', now())
    and p."receivedAt" < date_trunc('month', now()) + interval '1 month'`));
checa('o "Entrou" é menor que a soma crua dos pagamentos do mês',
      comCredito.valor < somaBruta, `tela ${comCredito.valor} · soma crua ${somaBruta}`);

// ── 2. LINK: dinheiro de 31 dias adiante ──────────────────────────────────
const pedido = await pg.request.post(`${B}/api/admin/pedidos`, {
  data: {
    userId: CLIENTE,
    items: [{ productId: PRODUTO, quantity: 1, size: 'M', color: 'Preto', price: 100 }],
    paymentMethod: 'link', paymentStatus: 'paid', amountPaid: 100,
  },
  headers: { 'Content-Type': 'application/json' },
});
checa('cria a venda no link', pedido.ok(), `HTTP ${pedido.status()}`);
// a rota devolve o pedido direto, não embrulhado em { order }
const order = await pedido.json().catch(() => ({}));
checa('o pedido criado volta com id', !!order?.id, JSON.stringify(Object.keys(order || {})).slice(0, 80));

if (order?.id) {
  const dias = Number(sql(`select round(extract(epoch from (p."receivedAt" - o."createdAt"))/86400)
    from "Payment" p join "Order" o on o.id = p."orderId" where p."orderId" = '${order.id}'`));
  checa('o recebimento do link é marcado 31 dias à frente', dias === 31, `${dias} dias`);

  const comLink = await entrou();
  checa('venda no link não entra no mês da venda',
        comLink.valor === comCredito.valor, `antes ${comCredito.valor} · depois ${comLink.valor}`);
  // o par do teste acima: o link fica fora do "Entrou" mas DENTRO do "Vendido".
  // Sem esta linha, um bug que simplesmente ignorasse a venda passaria.
  checa('mas a venda entra no Vendido do mês',
        comLink.vendido === Math.round((comCredito.vendido + 100) * 100) / 100,
        `antes ${comCredito.vendido} · depois ${comLink.vendido}`);
  checa('a tela avisa que o link cai no mês seguinte',
        /link cai 31 dias depois/i.test(comLink.texto));
}

// ── 3. O aviso de correção diz QUAIS, com nome e as duas datas ────────────
const idTorto = `teste-torto-${Date.now()}`;
const alvo = sql(`select id from "Order" where status <> 'cancelled' order by "createdAt" desc limit 1`);
sql(`insert into "Payment" (id,"orderId",amount,"paymentMethod","receivedAt",notes)
     select '${idTorto}', o.id, 236, 'link', o."createdAt", 'teste desalinhado'
       from "Order" o where o.id = '${alvo}'`);

const aviso = await pg.request.get(`${B}/api/admin/financeiro/alinhar-recebimentos`);
const dados = await aviso.json();
checa('o aviso encontra o recebimento no mês errado', dados.quantos >= 1, `${dados.quantos}`);
checa('e diz de quem é', (dados.exemplos || []).some(e => e.cliente && e.cliente !== 'sem nome'),
      JSON.stringify((dados.exemplos || [])[0] || {}));
checa('e as duas datas, a de hoje e a certa',
      (dados.exemplos || []).some(e => e.de && e.para && e.de !== e.para));

const telaAviso = await entrou();
checa('o aviso na tela lista as linhas, não só a contagem',
      /recebimento\(s\)/i.test(telaAviso.texto) && /→/.test(telaAviso.texto));

// ── 4. A tela inicial conta a mesma história ───────────────────────────────
await pg.goto(`${B}/admin`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1200);
const painel = await pg.evaluate(() => document.body.innerText);
checa('o painel inicial também explica o crédito',
      /não é dinheiro que caiu na conta/i.test(painel));
checa('o painel não fala em saldo em caixa', !/saldo em caixa/i.test(painel));

// ── limpeza: os lançamentos de teste saem do banco ────────────────────────
sql(`delete from "Payment" where id in ('${idCredito}','${idTorto}')`);
if (order?.id) {
  sql(`delete from "Payment" where "orderId" = '${order.id}'`);
  sql(`delete from "OrderItem" where "orderId" = '${order.id}'`);
  sql(`delete from "Order" where id = '${order.id}'`);
}
const sobrou = Number(sql(`select count(*) from "Payment" where notes like 'teste %'`));
checa('o teste não deixa lixo no banco', sobrou === 0, `${sobrou} sobraram`);

checa('nenhum erro de JavaScript', quebras.length === 0, quebras[0] || '');

await b.close();
console.log(ok.map(n => `✓ ${n}`).join('\n'));
if (falhou.length) console.log('\n' + falhou.map(n => `✗ ${n}`).join('\n'));
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
process.exit(falhou.length ? 1 : 0);
