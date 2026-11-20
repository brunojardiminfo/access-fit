/**
 * O filtro "sem foto" no admin de produtos.
 *
 * O caso que importa é o do cadastro com `[""]` dentro: o campo tem uma
 * entrada, mas vazia. Por comprimento ele passaria por "tem foto" e a peça
 * ficaria de fora justamente da lista feita para achá-la.
 */
import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d='') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await (await b.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })).newPage();
await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

await pg.goto(`${B}/admin/produtos`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1000);

const botao = pg.locator('button:has-text("Sem foto")').first();
checa('o botão aparece', await botao.isVisible());

const rotulo = await botao.innerText();
const prometido = Number((rotulo.match(/\((\d+)\)/) || [])[1]);
checa('o botão traz um número', prometido > 0, rotulo.trim());

const antes = await pg.locator('tbody tr').count();
await botao.click();
await pg.waitForTimeout(500);
const depois = await pg.locator('tbody tr').count();

// o número do botão é uma promessa: o clique tem que entregar exatamente ele
checa('o clique entrega o que o botão promete', depois === prometido, `${depois} linhas · prometia ${prometido}`);
checa('filtra de fato', depois < antes, `${antes} → ${depois}`);

// toda linha listada está mesmo sem foto: miniatura marcada, nenhuma <img>
const comImagem = await pg.locator('tbody tr img').count();
checa('nenhuma das listadas tem foto', comImagem === 0, `${comImagem} miniaturas com imagem`);
const marcadas = await pg.locator('tbody tr [title="Sem foto cadastrada"]').count();
checa('todas vêm marcadas na miniatura', marcadas === depois, `${marcadas}/${depois}`);

// combina com os outros filtros em vez de disputar com eles
await pg.fill('input[placeholder*="Buscar"]', 'zzzznaoexiste');
await pg.waitForTimeout(400);
checa('soma com a busca', (await pg.locator('tbody tr').count()) === 1, 'linha de "nenhum produto"');
await pg.fill('input[placeholder*="Buscar"]', '');
await pg.waitForTimeout(400);

// e o botão desliga
await botao.click();
await pg.waitForTimeout(400);
checa('desliga e volta tudo', (await pg.locator('tbody tr').count()) === antes);

await pg.screenshot({ path: '/tmp/claude-0/sem-foto.png', clip: { x:0, y:0, width:1400, height:700 } });
console.log('PASSOU:'); ok.forEach(o => console.log('  ✓', o));
if (falhou.length) { console.log('FALHOU:'); falhou.forEach(f => console.log('  ✗', f)); }
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
await b.close(); process.exit(falhou.length ? 1 : 0);
