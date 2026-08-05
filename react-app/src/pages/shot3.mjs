import { chromium } from '@playwright/test';
const OUT='/private/tmp/claude-501/-Users-peterpan-Claude-Libo/adeb7ae0-68f8-4e0a-94e4-5a5c6cdb0576/scratchpad/shots';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const p=await ctx.newPage();
await p.goto('http://localhost:4181/',{waitUntil:'networkidle',timeout:45000});
await p.waitForTimeout(1000);
await p.screenshot({path:`${OUT}/fix-0.png`});
// precise colour of the third loop line at full reveal
await p.evaluate(()=>document.getElementById('the-loop')?.scrollIntoView());
await p.waitForTimeout(1200);
const info = await p.evaluate(()=>{
  const el=document.querySelector('.rh-reveal--muted');
  if(!el) return {found:false};
  const ch=el.querySelector('.scroll-reveal__char');
  return {found:true, containerText:el.getAttribute('aria-label'),
          charColor: ch?getComputedStyle(ch).color:null,
          p: getComputedStyle(el).getPropertyValue('--p').trim(),
          textVar: getComputedStyle(el).getPropertyValue('--text').trim()};
});
console.log('loop line 3:', JSON.stringify(info));
await p.screenshot({path:`${OUT}/fix-loop.png`});
await b.close();
