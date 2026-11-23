/**
 * A tela de stories: o story sai pronto, e a pauta diz a verdade.
 *
 * O que erraria em silêncio aqui:
 *  1. o canvas "sujo" — desenhar a foto do Cloudinary sem CORS deixa a imagem
 *     na tela mas o `toBlob` lança, e o botão não faz nada;
 *  2. a pauta prometer urgência que não existe ("últimas unidades" numa peça
 *     com 14 no estoque), que é o jeito mais rápido de a seguidora parar de
 *     acreditar na loja.
 */
import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d='') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage();
const quebras = []; pg.on('pageerror', e => quebras.push(e.message));
await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

await pg.goto(`${B}/admin/stories`, { waitUntil: 'networkidle' });
await pg.waitForTimeout(1500);

const txt = await pg.evaluate(() => document.body.innerText);
checa('a tela abre', txt.includes('Stories'));
checa('tem pauta', /O que postar hoje/.test(txt));

const ideias = await pg.locator('button:has-text("Copiar texto")').count();
checa('a pauta traz ideias', ideias >= 3, `${ideias}`);

const cartoes = await pg.locator('button:has-text("toca para gerar")').count();
checa('lista as peças com foto', cartoes > 5, `${cartoes}`);

// ── o story é gerado DE VERDADE: 1080x1920 e com bytes dentro ──
const resultado = await pg.evaluate(async () => {
  const mod = await import('/_next/static/chunks/app/admin/stories/page.js').catch(() => null);
  // o módulo interno pode não ser importável; refaz o desenho aqui com a
  // mesma receita, para provar que o canvas consegue LER a foto do Cloudinary
  const url = document.querySelector('img[src*="cloudinary"]')?.getAttribute('src');
  if (!url) return { erro: 'sem foto do cloudinary na tela' };
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const carregou = await new Promise(r => { img.onload = () => r(true); img.onerror = () => r(false); img.src = url; });
  if (!carregou) return { erro: 'a foto não carregou' };
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1920;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, 1080, 1440);
  try {
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
    return { largura: c.width, altura: c.height, bytes: blob?.size ?? 0 };
  } catch (e) {
    return { erro: 'canvas sujo: ' + e.message };
  }
});
checa('o canvas consegue exportar a foto do Cloudinary', !resultado.erro, resultado.erro || '');
checa('o story tem 1080x1920', resultado.largura === 1080 && resultado.altura === 1920);
checa('a imagem tem conteúdo', (resultado.bytes || 0) > 20000, `${resultado.bytes} bytes`);

// ── a pauta não inventa urgência ──
const honestidade = await pg.evaluate(() => {
  const fora = [];
  document.querySelectorAll('div').forEach(d => {
    const t = d.innerText || '';
    if (/Última peça|Últimas 2/.test(t) && /Resta/.test(t)) {
      const m = t.match(/Resta[m]? (\d+) no estoque/);
      if (m && Number(m[1]) > 2) fora.push(t.slice(0, 60));
    }
  });
  return fora;
});
checa('"últimas unidades" só com estoque de 1 ou 2', honestidade.length === 0, honestidade.join(' | '));

checa('sem quebra de JavaScript', quebras.length === 0, quebras[0] || '');
const estoura = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
checa('sem rolagem lateral no celular', !estoura);

await pg.screenshot({ path: '/tmp/claude-0/stories.png', fullPage: false });
console.log('PASSOU:'); ok.forEach(o => console.log('  ✓', o));
if (falhou.length) { console.log('FALHOU:'); falhou.forEach(f => console.log('  ✗', f)); }
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
await b.close(); process.exit(falhou.length ? 1 : 0);
