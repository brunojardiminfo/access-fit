import { chromium } from 'playwright';
const SP=process.env.SP;
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
// contraste WCAG entre duas cores
const lum = ([r,g,b2]) => { const f=c=>{c/=255; return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4;}; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b2); };
const parse = s => (s.match(/\d+/g)||[0,0,0]).slice(0,3).map(Number);
const razao = (a,c) => { const l1=lum(parse(a)), l2=lum(parse(c)); const [x,y]=l1>l2?[l1,l2]:[l2,l1]; return ((x+0.05)/(y+0.05)); };
for (const [url,nome] of [['/produtos/peca-teste-50','produto'],['/sobre','sobre'],['/checkout','checkout']]) {
  const ctx = await b.newContext({viewport:{width:390,height:844}, isMobile:true, deviceScaleFactor:2});
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:3101'+url,{waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(2200);
  const r = await pg.evaluate(()=>{
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const amostras = [];
    for (const sel of ['h1','h2','p','a','button','.cartao-peca p','.cartao-peca span']) {
      document.querySelectorAll(sel).forEach(e=>{
        const cs=getComputedStyle(e); const t=(e.textContent||'').trim();
        if (!t || t.length>60 || e.offsetParent===null) return;
        // acha o fundo efetivo subindo na árvore
        let p=e, fundo='rgba(0, 0, 0, 0)';
        while(p && fundo==='rgba(0, 0, 0, 0)'){ fundo=getComputedStyle(p).backgroundColor; p=p.parentElement; }
        amostras.push({ txt:t.slice(0,28), cor:cs.color, fundo });
      });
    }
    return { bodyBg, amostras: amostras.slice(0,40) };
  });
  const ruins = r.amostras.filter(a=>razao(a.cor,a.fundo)<4.5);
  console.log(`\n--- ${nome} ---`);
  console.log('        fundo do body:', r.bodyBg);
  console.log('        amostras de texto:', r.amostras.length, '| contraste abaixo de 4.5:', ruins.length);
  ruins.slice(0,5).forEach(a=>console.log(`          ${razao(a.cor,a.fundo).toFixed(1)}:1  "${a.txt}"  ${a.cor} sobre ${a.fundo}`));
  await pg.screenshot({ path:`${SP}/escuro-${nome}.png` });
  await ctx.close();
}
await b.close();
