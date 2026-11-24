/**
 * O link do WhatsApp no lugar do "copiar texto" que não servia.
 *
 * O que erraria em silêncio: link errado não dá erro, só silêncio — a cliente
 * cai num número que não é o da loja, ou numa mensagem sem o nome da peça, e
 * ninguém fica sabendo. Por isso o teste lê o link copiado de verdade e
 * confere número E conteúdo da mensagem.
 */
import { chromium } from 'playwright';

const B = process.env.BASE || 'http://localhost:3101';
const NUMERO = '5551986596705';
const ok = [], falhou = [];
const checa = (n, c, d = '') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({
  viewport: { width: 420, height: 920 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const pg = await ctx.newPage();
const quebras = []; pg.on('pageerror', e => quebras.push(e.message));

await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

await pg.goto(`${B}/admin/stories`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1500);

const botoes = pg.locator('button:has-text("Copiar link do WhatsApp")');
checa('a tela oferece o link do WhatsApp', await botoes.count() > 0, `${await botoes.count()} botões`);

// o cartão da manhã é de peça: ali o texto já está na imagem, o botão tem que
// ser o do link e não o "copiar texto"
const manha = pg.locator('div').filter({ hasText: /☀️ Manhã/ }).last();
checa('no story de peça não sobra o "copiar texto"',
      (await manha.locator('button:has-text("Copiar texto")').count()) === 0);

await botoes.first().click();
await pg.waitForTimeout(600);
const link = await pg.evaluate(() => navigator.clipboard.readText());

checa('copia um link de WhatsApp', link.startsWith('https://wa.me/'), link.slice(0, 40));
checa('para o número da loja, não outro', link.includes(NUMERO), link.slice(0, 40));

const msg = decodeURIComponent((link.split('text=')[1] || ''));
checa('a mensagem já vem escrita', msg.length > 20, msg);
checa('e nomeia a peça — é o que faz ele saber do que ela fala',
      /vi a .+ no story|saber mais sobre a .+ e a /i.test(msg), msg);

// o texto continua onde faz falta: story sem imagem gerada
const texto = pg.locator('button:has-text("Copiar texto")');
checa('o "copiar texto" fica onde não há imagem (bastidor/conversa)',
      await texto.count() > 0, `${await texto.count()} restantes`);

checa('nenhum erro de JavaScript', quebras.length === 0, quebras[0] || '');

await b.close();
console.log(ok.map(n => `✓ ${n}`).join('\n'));
if (falhou.length) console.log('\n' + falhou.map(n => `✗ ${n}`).join('\n'));
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
process.exit(falhou.length ? 1 : 0);
