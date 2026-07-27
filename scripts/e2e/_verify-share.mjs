// _verify-share.mjs — banner "Comparte AVI" (v370, idea Camilo #4, crecimiento orgánico): en "Hoy"
// aparece un banner ocasional para invitar a alguien, SOLO tras engagement real (≥3 sesiones
// finalizadas) y descartable (snooze 45d). Comparte con navigator.share nativo o WhatsApp (elige
// contacto). Sin login (sintetiza el asesorado). Aserciones duras (exit 1) + shots claro/oscuro.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8795, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9304', '--user-data-dir=' + process.env.TEMP + '/share-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9304/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
async function shot(n) {
  const h = await ev(`Math.max(document.body.scrollHeight, 844)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(350);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n, `(${h}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderShareBanner==='function' && typeof shareBannerEligible==='function' && !document.getElementById('avi-loading')`);
await sleep(2000);

// Base: asesorado con historial; nº de sesiones finalizadas lo controlamos por test. Días PASADOS
// (no hoy) para que la vista "Hoy" no colapse en "ya entrenaste" y el banner se vea con el entreno.
const RESET = n => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));
  try{ localStorage.removeItem('ax_sharesnooze'); }catch(e){}
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const client={id:'ct1',name:'Camilo',sex:'M',level:'Intermedio',goal:'Ganar músculo',days:3,
    routines:[{id:'r1',day:days[new Date().getDay()],name:'Empuje',restSec:90,exercises:[{id:'e1',name:'Sentadilla',muscle:'Pierna',type:'Compuesto',sets:4,reps:'10'}]}],
    habits:{water:{},steps:{}}};
  DB.clients=[client];
  const mk=(daysAgo)=>{const d=new Date();d.setDate(d.getDate()-daysAgo);d.setHours(18,0,0,0);const iso=d.toISOString();
    return {id:'h'+daysAgo,sessionId:'s'+daysAgo,routineId:'rX',routineName:'Empuje',date:iso,startedAt:iso,finishedAt:iso,totalVol:4000,doneSets:12,totalSets:12,exercises:[]};};
  const N=${n}; const hist=[]; for(let i=0;i<N;i++)hist.push(mk(2+i*2));
  DB.history={ct1:hist};
  CUR.clientId='ct1'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayWorking=null;
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

// SH1: 2 sesiones finalizadas → el banner NO aparece (aún no ganó su valor).
console.log('  setup(2):', await ev(RESET(2))); await sleep(400);
const sh1 = await ev(`(()=>{const el=document.getElementById('cn-share');return {disp:el?el.style.display:'?',html:el?el.innerHTML.trim().length:-1};})()`);
check('SH1 con 2 sesiones finalizadas el banner NO sale', sh1.disp === 'none' && sh1.html === 0, JSON.stringify(sh1));

// SH2: 3 sesiones finalizadas → banner visible con copy + Compartir + ✕.
console.log('  setup(3):', await ev(RESET(3))); await sleep(400);
const sh2 = await ev(`(()=>{const el=document.getElementById('cn-share');const t=el?el.innerText.replace(/\\s+/g,' ').trim():'';const btns=el?[...el.querySelectorAll('button')].map(b=>b.textContent.trim()):[];return {disp:el?el.style.display:'?',hasCopy:/Te sirve AVI/.test(t),share:btns.some(b=>/Compartir/.test(b)),dismiss:btns.some(b=>/✕/.test(b))};})()`);
check('SH2 con 3 sesiones finalizadas → banner visible (copy + Compartir + ✕)', sh2.disp === 'block' && sh2.hasCopy && sh2.share && sh2.dismiss, JSON.stringify(sh2));

// Captura con el banner llevado a la vista (vive al final de "Hoy", en un scroller interno).
const shotIV = async n => {
  await ev(`(()=>{const c=document.getElementById('cn-share');if(c)c.scrollIntoView({block:'center'});})()`);
  await sleep(350);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n);
};
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300); await shotIV('share-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(300); await shotIV('share-oscuro');
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300);

// SH3: snooze en el futuro → oculto aunque sea elegible.
await ev(`(()=>{localStorage.setItem('ax_sharesnooze',String(Date.now()+10*86400000));renderShareBanner(DB.clients[0]);})()`); await sleep(300);
const sh3 = await ev(`(()=>{const el=document.getElementById('cn-share');return {disp:el?el.style.display:'?'};})()`);
check('SH3 con snooze vigente el banner NO sale (aunque tenga 3 sesiones)', sh3.disp === 'none', JSON.stringify(sh3));

// SH4: "✕" (dismissShare) → oculta y pospone ~45 días.
console.log('  setup(3) again:', await ev(RESET(3))); await sleep(300);
await ev(`dismissShare()`); await sleep(200);
const sh4 = await ev(`(()=>{const el=document.getElementById('cn-share');const s=parseInt(localStorage.getItem('ax_sharesnooze'))||0;const days=(s-Date.now())/86400000;return {disp:el?el.style.display:'?',days:Math.round(days)};})()`);
check('SH4 "✕" oculta y pospone ~45 días', sh4.disp === 'none' && sh4.days >= 44 && sh4.days <= 46, JSON.stringify(sh4));

// SH5: "Compartir" con navigator.share disponible → comparte el enlace real y pospone.
console.log('  setup(3) share:', await ev(RESET(3))); await sleep(300);
await ev(`(()=>{window.__shared=null;navigator.share=async(d)=>{window.__shared=d;};})()`);
await ev(`shareApp()`); await sleep(300);
const sh5 = await ev(`(()=>{const s=parseInt(localStorage.getItem('ax_sharesnooze'))||0;return {url:(window.__shared||{}).url||'',hasText:!!((window.__shared||{}).text),snoozed:s>Date.now()};})()`);
check('SH5 "Compartir" (navigator.share) envía el enlace de AVI y pospone', /kronos-apex\.github\.io\/apex-app/.test(sh5.url) && sh5.hasText && sh5.snoozed, JSON.stringify(sh5));

// SH6: sin navigator.share → cae a WhatsApp (wa.me/?text con el enlace) y pospone.
console.log('  setup(3) wa:', await ev(RESET(3))); await sleep(300);
await ev(`(()=>{window.__opened=null;try{delete navigator.share;}catch(e){}navigator.share=undefined;window.open=(u)=>{window.__opened=u;return null;};})()`);
await ev(`shareApp()`); await sleep(300);
const sh6 = await ev(`(()=>{const s=parseInt(localStorage.getItem('ax_sharesnooze'))||0;return {opened:window.__opened||'',snoozed:s>Date.now()};})()`);
check('SH6 sin share nativo → abre WhatsApp (wa.me/?text con el enlace) y pospone', /wa\.me\/\?text=/.test(sh6.opened) && /kronos-apex/.test(decodeURIComponent(sh6.opened)) && sh6.snoozed, JSON.stringify(sh6));

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── RESULTADOS «COMPARTE AVI» (v370) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('shots en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
