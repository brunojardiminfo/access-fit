/**
 * Cadastrar parceira sem digitar o que o banco já sabe.
 *
 * O risco que isto corta: o código digitado com um caractere diferente do
 * cupom real ("ISA 10", "isa10") cria um crachá que não casa com venda
 * nenhuma — e a parceira fica zerada sem ninguém entender por quê.
 */
import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d='') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await (await b.newContext({ viewport: { width: 1300, height: 1000 }, deviceScaleFactor: 2 })).newPage();
await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

await pg.goto(`${B}/admin/parceiras`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1200);
await pg.click('button:has-text("Nova parceira")');
await pg.waitForTimeout(500);

const selects = pg.locator('select');
const selCliente = selects.nth(0), selCupom = selects.nth(1);

// escolhe a opção cujo texto contém o nome — o rótulo traz telefone junto
const escolher = async (sel, texto) => {
  const valor = await sel.locator('option', { hasText: texto }).first().getAttribute('value');
  await sel.selectOption(valor);
};

// o cupom vem do banco, não digitado
const opcoes = await selCupom.locator('option').allInnerTexts();
checa('os cupons do banco aparecem na lista', opcoes.some(o => o.includes(process.env.CUPOM)),
      opcoes.filter(o => !o.startsWith('—')).join(' | '));
checa('mostra o desconto de cada cupom', opcoes.some(o => /\d+%/.test(o)));

// escolher a cliente preenche nome e telefone
await escolher(selCliente, process.env.CLIENTE);
await pg.waitForTimeout(500);
const nome = await pg.locator('input[placeholder*="Nome" i]').inputValue();
const fone = await pg.locator('input[placeholder*="WhatsApp" i]').inputValue();
checa('o nome vem da cliente', nome.includes(process.env.CLIENTE.split(' ')[0]), `"${nome}"`);
checa('o WhatsApp vem da cliente', fone.replace(/\D/g,'') === process.env.FONE, `"${fone}"`);

// não sobrescreve ajuste feito à mão
await pg.locator('input[placeholder*="Nome" i]').fill('Isa');
await selCliente.selectOption({ index: 2 });
await pg.waitForTimeout(400);
checa('não apaga o nome que eu ajustei',
      (await pg.locator('input[placeholder*="Nome" i]').inputValue()) === 'Isa');

// cadastra escolhendo o cupom
await escolher(selCliente, process.env.CLIENTE);
await selCupom.selectOption(process.env.CUPOM);
await pg.waitForTimeout(400);
await pg.click('button:has-text("Cadastrar")');
await pg.waitForTimeout(2500);

const corpo = await pg.evaluate(() => document.body.innerText);
checa('a parceira aparece na lista', corpo.includes('Isa'), '');
checa('com o código escolhido', corpo.includes(process.env.CUPOM));

// o mesmo cupom não pode ser oferecido a uma segunda parceira
await pg.reload({ waitUntil: 'networkidle' });
await pg.waitForTimeout(1000);
await pg.click('button:has-text("Nova parceira")');
await pg.waitForTimeout(500);
const depois = await pg.locator('select').nth(1).locator('option').allInnerTexts();
checa('cupom já usado some da lista', !depois.some(o => o.startsWith(process.env.CUPOM)),
      depois.filter(o => !o.startsWith('—')).join(' | '));

await pg.screenshot({ path: '/tmp/claude-0/parceira-form.png', clip: { x:0, y:0, width:1300, height:760 } });
console.log('PASSOU:'); ok.forEach(o => console.log('  ✓', o));
if (falhou.length) { console.log('FALHOU:'); falhou.forEach(f => console.log('  ✗', f)); }
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
await b.close(); process.exit(falhou.length ? 1 : 0);
