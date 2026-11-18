import { chromium } from 'playwright';
const B='http://localhost:3101';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ok=[],falhou=[];const checa=(n,c,d='')=>(c?ok:falhou).push(n+(d?` (${d})`:''));

for (const [nome,vp,escala] of [['desktop',{width:1400,height:1000},2],['celular',{width:390,height:844},2]]) {
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:escala});
  const pg=await ctx.newPage();
  await pg.goto(`${B}/login`,{waitUntil:'networkidle'});
  await pg.fill('input[type=email]','admin@accessfit.com.br');
  await pg.fill('input[type=password]',process.env.ADMIN_PW);
  await pg.click('button[type=submit]'); await pg.waitForTimeout(3500);
  await pg.goto(`${B}/admin/liquida`,{waitUntil:'networkidle'}); await pg.waitForTimeout(1200);

  // o menu inferior de celular só deve existir no celular
  const navVisivel = await pg.locator('nav.admin-bottomnav').isVisible().catch(()=>false);
  checa(`${nome}: menu inferior ${nome==='celular'?'aparece':'escondido'}`, nome==='celular'?navVisivel:!navVisivel);

  // sem rolagem horizontal
  const estoura = await pg.evaluate(()=>document.documentElement.scrollWidth > window.innerWidth+1);
  checa(`${nome}: sem rolagem lateral`, !estoura);

  // seleciona e confere que o botão Aplicar recebe o clique de verdade
  await pg.locator('.linha-liquida input[type=checkbox]').first().check();
  await pg.waitForTimeout(400);
  const btn = pg.locator('button:has-text("Aplicar")').first();
  const alcanca = await btn.evaluate(el=>{
    const r=el.getBoundingClientRect();
    const t=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
    return el.contains(t)||el===t;
  }).catch(()=>false);
  checa(`${nome}: o botão Aplicar recebe o clique`, alcanca);
  await pg.screenshot({path:`/tmp/claude-0/liq-${nome}.png`,fullPage:false});
  await ctx.close();
}
console.log('PASSOU:');ok.forEach(o=>console.log('  ✓',o));
if(falhou.length){console.log('FALHOU:');falhou.forEach(f=>console.log('  ✗',f));}
console.log(`\n${ok.length}/${ok.length+falhou.length}`);
await b.close(); process.exit(falhou.length?1:0);
