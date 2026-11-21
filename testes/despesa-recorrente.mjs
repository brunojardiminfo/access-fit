/**
 * Assinatura mensal aparece uma vez por mês, não doze vezes num mês.
 *
 * O defeito: as doze linhas nasciam com a data do lançamento e só o
 * vencimento mudava. Como os relatórios somam por `date`, R$ 113 viravam
 * R$ 1.356 em novembro e R$ 0 nos outros onze meses.
 *
 * O teste mede o mês ANTES e DEPOIS da correção — um teste que só conferisse
 * "a rota respondeu 200" passaria com o banco ainda errado.
 */
import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3101';
const ok = [], falhou = [];
const checa = (n, c, d='') => (c ? ok : falhou).push(n + (d ? ` (${d})` : ''));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await (await b.newContext()).newPage();
await pg.goto(`${B}/login`, { waitUntil: 'networkidle' });
await pg.fill('input[type=email]', 'admin@accessfit.com.br');
await pg.fill('input[type=password]', process.env.ADMIN_PW);
await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);

const mes = async (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const de = `${ym}-01`;
  const ate = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 0)).toISOString().slice(0, 10);
  const r = await pg.request.get(`${B}/api/admin/despesas?from=${de}&to=${ate}`);
  return (await r.json()).total;
};

const novAntes = await mes('2026-11');
const dezAntes = await mes('2026-12');

// o aviso enxerga o problema antes de mexer em nada
const diag = await (await pg.request.get(`${B}/api/admin/despesas/alinhar`)).json();
checa('encontra os lançamentos no mês errado', diag.quantas >= 11, `${diag.quantas} linhas`);

const corr = await pg.request.post(`${B}/api/admin/despesas/alinhar`);
checa('a correção responde', corr.ok(), `HTTP ${corr.status()}`);

const novDepois = await mes('2026-11');
const dezDepois = await mes('2026-12');

const ASSIN = Number(process.env.ASSINATURA);
checa('novembro deixa de acumular o ano inteiro', novDepois < novAntes,
      `${novAntes} → ${novDepois}`);
checa('a diferença é exatamente 11 meses da assinatura',
      Math.abs((novAntes - novDepois) - ASSIN * 11) < 0.02,
      `caiu ${Math.round((novAntes - novDepois) * 100) / 100}, esperado ${ASSIN * 11}`);
checa('dezembro passa a ter a cobrança do mês',
      Math.abs((dezDepois - dezAntes) - ASSIN) < 0.02,
      `${dezAntes} → ${dezDepois}`);

// idempotente: rodar de novo não move mais nada
const denovo = await (await pg.request.post(`${B}/api/admin/despesas/alinhar`)).json();
checa('rodar de novo não mexe em nada', denovo.corrigidas === 0, `${denovo.corrigidas}`);
checa('e o mês não muda na segunda', (await mes('2026-11')) === novDepois);

// nenhum valor sumiu nem foi somado: o total do ano é o mesmo
const totalDepois = (await (await pg.request.get(`${B}/api/admin/despesas`)).json()).total;
checa('o total geral não mudou', Math.abs(totalDepois - Number(process.env.TOTAL_ANTES)) < 0.02,
      `${process.env.TOTAL_ANTES} → ${totalDepois}`);

console.log('PASSOU:'); ok.forEach(o => console.log('  ✓', o));
if (falhou.length) { console.log('FALHOU:'); falhou.forEach(f => console.log('  ✗', f)); }
console.log(`\n${ok.length}/${ok.length + falhou.length}`);
await b.close(); process.exit(falhou.length ? 1 : 0);
