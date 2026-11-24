/**
 * A enquete sai pronta: duas peças da mesma categoria, numeradas 1 e 2.
 *
 * O que erraria em silêncio, e já errou em telas parecidas:
 *  1. o botão aparecer e o arquivo não sair (canvas "sujo" pela foto de outro
 *     domínio — o toBlob falha sem fazer barulho);
 *  2. a imagem sair com uma peça só, ou com a mesma peça dos dois lados;
 *  3. o par ser de categorias diferentes, que é "legging ou top": pergunta
 *     sem resposta;
 *  4. o par dançar a cada F5, e a pauta do dia deixar de ser planejável.
 *
 * O teste baixa o arquivo de verdade e mede os pixels dele, porque "o botão
 * não deu erro" não é o mesmo que "saiu uma imagem".
 */
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { writeFileSync, chmodSync, readFileSync } from 'fs';

const B = process.env.BASE || 'http://localhost:3101';
const SAIDA = process.env.SAIDA || '/tmp/enquete.jpg';
const ok = [], falhou = [];
const checa = (n, c, d = '') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));
const sql = q => { writeFileSync('/tmp/teste-enquete.sql', q + '\n'); chmodSync('/tmp/teste-enquete.sql', 0o644);
  return execSync('su postgres -c "psql -d afdemo -Atf /tmp/teste-enquete.sql"').toString().trim(); };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 420, height: 920 }, acceptDownloads: true });
const pg = await ctx.newPage();
const quebras = []; pg.on('pageerror', e => quebras.push(e.message));

await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

await pg.goto(`${B}/admin/stories`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1500);

// o botão do passo da enquete, marcado no HTML: contar "o quinto Gerar
// imagem" quebraria no dia em que o dia tivesse três peças em vez de quatro
const botao = pg.locator('button[data-passo="enquete"]');
checa('a tela oferece a imagem da enquete', await botao.count() > 0);

const texto = await pg.evaluate(() => document.body.innerText);
checa('e diz quais são as duas peças', / ou /.test(texto), texto.match(/.{0,60} ou .{0,30}/)?.[0] || '');

// ── o par é de uma categoria só, e é peça diferente ──
const duo = await pg.evaluate(() => {
  const el = [...document.querySelectorAll('span')].find(s => s.textContent?.trim() === 'ou');
  const linha = el?.parentElement?.textContent || '';
  return linha.split(' ou ').map(s => s.trim());
});
checa('são duas peças, não a mesma repetida', duo.length === 2 && duo[0] && duo[0] !== duo[1], duo.join(' | '));

if (duo.length === 2) {
  const mesma = sql(`select count(distinct c.name) from "Product" p
    join "Category" c on c.id = p."categoryId"
    where trim(p.name) in ('${duo[0].replace(/'/g, "''")}','${duo[1].replace(/'/g, "''")}')`);
  checa('as duas são da mesma categoria', Number(mesma) === 1, `${mesma} categoria(s)`);
}

// ── o arquivo sai de verdade ──
const espera = pg.waitForEvent('download', { timeout: 30000 });
await botao.first().click();
const arquivo = await espera.catch(() => null);
checa('clicar gera o arquivo', !!arquivo, arquivo ? await arquivo.suggestedFilename() : 'nenhum download');

if (arquivo) {
  await arquivo.saveAs(SAIDA);
  const bytes = readFileSync(SAIDA);
  checa('o arquivo tem imagem dentro', bytes.length > 60000, `${Math.round(bytes.length / 1024)} KB`);

  // lê largura e altura no cabeçalho do JPEG: "o botão não deu erro" não é o
  // mesmo que "saiu uma imagem no formato do story"
  let i = 2, larg = 0, alt = 0;
  while (i < bytes.length - 9) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marca = bytes[i + 1];
    if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) {
      alt = bytes.readUInt16BE(i + 5); larg = bytes.readUInt16BE(i + 7); break;
    }
    i += 2 + bytes.readUInt16BE(i + 2);
  }
  checa('está no formato do story (1080×1920)', larg === 1080 && alt === 1920, `${larg}×${alt}`);
}

// ── o par não dança entre dois F5: pauta do dia tem que dar para planejar ──
const antes = duo.join('|');
await pg.reload({ waitUntil: 'networkidle' }); await pg.waitForTimeout(1200);
const depois = await pg.evaluate(() => {
  const el = [...document.querySelectorAll('span')].find(s => s.textContent?.trim() === 'ou');
  return (el?.parentElement?.textContent || '').split(' ou ').map(s => s.trim()).join('|');
});
checa('o par é o mesmo depois do F5', antes === depois, `${antes} → ${depois}`);

checa('nenhum erro de JavaScript', quebras.length === 0, quebras[0] || '');

await b.close();
console.log(ok.map(n => `✓ ${n}`).join('\n'));
if (falhou.length) console.log('\n' + falhou.map(n => `✗ ${n}`).join('\n'));
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
process.exit(falhou.length ? 1 : 0);
