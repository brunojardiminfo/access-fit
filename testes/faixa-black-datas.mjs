// A janela de datas, sem navegador: é lógica pura e é onde o erro dói mais.
import { blackNovemberAtiva, chamadaDePrazo, diasRestantes, PERIODO } from '../src/lib/blackNovember.ts';
const casos = [
  ['2026-11-19T20:00:00-03:00', false, null],
  ['2026-11-20T00:01:00-03:00', true,  '20 a 30 de novembro'],
  ['2026-11-26T12:00:00-03:00', true,  '20 a 30 de novembro'],
  ['2026-11-28T12:00:00-03:00', true,  'últimos 3 dias'],
  ['2026-11-30T12:00:00-03:00', true,  'último dia'],
  ['2026-11-30T22:30:00-03:00', true,  'último dia'],
  ['2026-12-01T00:30:00-03:00', false, null],
  ['2026-12-05T12:00:00-03:00', false, null],
];
let ok=0, mau=[];
for (const [iso, ativa, texto] of casos) {
  const d = new Date(iso);
  const a = blackNovemberAtiva(d);
  const t = a ? chamadaDePrazo(d) : null;
  if (a === ativa && t === texto) ok++;
  else mau.push(`${iso} → ativa=${a} texto=${t} (esperado ${ativa}/${texto})`);
}
console.log(`datas: ${ok}/${casos.length}`);
mau.forEach(m => console.log('  ✗', m));
process.exit(mau.length ? 1 : 0);
