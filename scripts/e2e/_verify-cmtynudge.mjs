// _verify-cmtynudge.mjs — ADOPCIÓN A2: la PUERTA a Comunidad desde «Hoy» (2026-07-25).
// Dato que lo motiva: 23 personas en el directorio del gym, 6 con perfil → 17 nunca pasaron del
// opt-in. La prueba social de A1 solo la ve quien YA abrió la pestaña; esta tarjeta invita desde
// «Hoy», que sí visitan a diario. Verifica los candados del motor puro `communityNudgeEligible`
// (nunca a quien ya tiene perfil · nunca a un cuarto vacío · solo tras entreno real · silencio
// que se respeta), que la tarjeta NO empuja el entreno bajo el pliegue, que cede el turno al
// banner «Comparte AVI» y que un apodo hostil se escapa. Sin login ni red: la SONDA se inyecta
// en localStorage y `cmtyAdoptionProbe` se espía. Aserciones duras (exit 1) + shots claro/oscuro.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8799, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9309', '--user-data-dir=' + process.env.TEMP + '/cmtynudge-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9309/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderCommunityNudge==='function' && typeof communityNudgeEligible==='function' && typeof communityProbeStale==='function' && !document.getElementById('avi-loading')`);
await sleep(2000);

// La sonda REAL pega a Supabase; aquí se espía para no tocar la red y para poder afirmar CUÁNDO
// se dispara (stale sí, fresca no). Se sustituye la global (script clásico → propiedad de window).
await ev(`(()=>{window.__probes=0;window.cmtyAdoptionProbe=async()=>{window.__probes++;};return typeof cmtyAdoptionProbe;})()`);

// Base: asesorado con historial en días PASADOS (para que «Hoy» no colapse en «ya entrenaste»).
// n = sesiones FINALIZADAS. probe = la sonda cacheada tal cual la escribiría la capa de red.
const RESET = (n, probe) => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  try{ localStorage.removeItem('ax_cmtynudge'); localStorage.removeItem('ax_sharesnooze'); }catch(e){}
  localStorage.setItem('ax_cmty_probe', ${JSON.stringify(JSON.stringify(probe))});
  window.__probes=0;
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const client={id:'ct1',name:'Camilo',sex:'M',level:'Intermedio',goal:'Ganar músculo',days:3,
    routines:[{id:'r1',day:days[new Date().getDay()],name:'Empuje',restSec:90,exercises:[{id:'e1',name:'Sentadilla',muscle:'Pierna',type:'peso_reps',sets:4,reps:'10'}]}],
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

const gym = (h) => ({ handle: h, avatar_url: null, is_private: true });
const FRESH = list => ({ hasProfile: false, peers: list.length, list, at: Date.now() });
const PEERS3 = FRESH([gym('Samuel'), gym('Astrid'), gym('Natalia')]);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const cardState = `(()=>{const el=document.getElementById('cn-cmty-nudge');const sh=document.getElementById('cn-share');
  const t=el?el.innerText.replace(/\\s+/g,' ').trim():'';const btns=el?[...el.querySelectorAll('button')].map(b=>b.textContent.trim()):[];
  return {disp:el?el.style.display:'?',len:el?el.innerHTML.trim().length:-1,txt:t,btns:btns,
          share:sh?sh.style.display:'?',nudgeOn:(typeof CMTY!=='undefined')?!!CMTY.nudgeOn:null};})()`;

// N1: engagement insuficiente (2 finalizadas) → la puerta NO se abre todavía.
console.log('  setup(2, 3 peers):', await ev(RESET(2, PEERS3))); await sleep(400);
const n1 = await ev(cardState);
check('N1 con 2 sesiones finalizadas la tarjeta NO sale', n1.disp === 'none' && n1.len === 0 && n1.nudgeOn === false, JSON.stringify(n1));

// N2: 3 finalizadas + 3 personas visibles → tarjeta con nombres reales y 2 acciones.
console.log('  setup(3, 3 peers):', await ev(RESET(3, PEERS3))); await sleep(400);
const n2 = await ev(cardState);
check('N2 con 3 sesiones y 3 personas → tarjeta con nombres del gym + «Ver a mi gente» + «Ahora no»',
  n2.disp === 'block' && /Astrid/.test(n2.txt) && /de tu gym ya están aquí/.test(n2.txt) &&
  n2.btns.some(b => /Ver a mi gente/.test(b)) && n2.btns.some(b => /Ahora no/.test(b)) && n2.nudgeOn === true, JSON.stringify(n2));

// N2-bis: con la puerta abierta, el banner «Comparte AVI» CEDE el turno (no se apilan 2 pedidos).
check('N2-bis el banner «Comparte AVI» cede el turno mientras la puerta está abierta', n2.share === 'none', JSON.stringify({ share: n2.share }));

// N3: la tarjeta va al FINAL de «Hoy» — jamás por encima del entreno (R1.6).
const n3 = await ev(`(()=>{const p=document.getElementById('cn-today');const ids=[...p.children].map(c=>c.id);
  return {ids:ids,nudge:ids.indexOf('cn-cmty-nudge'),body:ids.indexOf('cn-today-body'),share:ids.indexOf('cn-share'),head:ids.indexOf('cn-today-head')};})()`);
check('N3 la tarjeta va DESPUÉS del entreno y antes de «Comparte AVI» (no empuja el entreno)',
  n3.nudge > n3.body && n3.nudge > n3.head && n3.share > n3.nudge, JSON.stringify(n3));

// Shots con la tarjeta a la vista (vive al final de «Hoy», dentro de un scroller interno).
const shotIV = async n => {
  await ev(`(()=>{const c=document.getElementById('cn-cmty-nudge');if(c)c.scrollIntoView({block:'center'});})()`);
  await sleep(350);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n);
};
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300); await shotIV('cmty-nudge-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(300); await shotIV('cmty-nudge-oscuro');
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300);

// N4: quien YA tiene perfil no vuelve a ver la invitación — y el banner de compartir recupera su
// turno (la cesión es condicional, no una muerte silenciosa del otro banner).
console.log('  setup(9, ya tiene perfil):', await ev(RESET(9, { hasProfile: true, peers: 0, list: [], at: Date.now() }))); await sleep(400);
const n4 = await ev(cardState);
check('N4 a quien YA tiene perfil no se le invita (y «Comparte AVI» recupera su turno)',
  n4.disp === 'none' && n4.len === 0 && n4.share === 'block', JSON.stringify(n4));

// N5: cero personas visibles → no se manda a nadie a un cuarto vacío.
console.log('  setup(9, 0 peers):', await ev(RESET(9, FRESH([])))); await sleep(400);
const n5 = await ev(cardState);
check('N5 sin nadie a quien ver, la tarjeta NO sale (cuarto vacío)', n5.disp === 'none' && n5.len === 0, JSON.stringify(n5));

// N6: «Ahora no» oculta, pospone ~30 días y devuelve el turno al banner de compartir.
console.log('  setup(9, 3 peers):', await ev(RESET(9, PEERS3))); await sleep(400);
await ev(`dismissCmtyNudge(); renderShareBanner(DB.clients[0]);`); await sleep(250);
const n6 = await ev(`(()=>{const el=document.getElementById('cn-cmty-nudge');const sh=document.getElementById('cn-share');
  const s=parseInt(localStorage.getItem('ax_cmtynudge'))||0;return {disp:el?el.style.display:'?',len:el?el.innerHTML.trim().length:-1,
  days:Math.round((s-Date.now())/86400000),share:sh?sh.style.display:'?'};})()`);
check('N6 «Ahora no» oculta, pospone ~30 días y devuelve el turno a «Comparte AVI»',
  n6.disp === 'none' && n6.len === 0 && n6.days >= 29 && n6.days <= 31 && n6.share === 'block', JSON.stringify(n6));

// N6-bis: el silencio se respeta en el siguiente render, y se vence solo.
await ev(`renderClientToday(DB.clients[0]);`); await sleep(300);
const n6b = await ev(cardState);
await ev(`(()=>{localStorage.setItem('ax_cmtynudge',String(Date.now()-86400000));renderClientToday(DB.clients[0]);})()`); await sleep(300);
const n6c = await ev(cardState);
check('N6-bis el silencio persiste al repintar y vence solo al expirar', n6b.disp === 'none' && n6c.disp === 'block', JSON.stringify({ silencio: n6b.disp, vencido: n6c.disp }));

// N7: apodo hostil → texto ESCAPADO, sin ejecutar nada (mismo candado que A1).
const XSS = FRESH([gym('<img src=x onerror=window.__xss=1>'), gym('Samuel')]);
console.log('  setup(9, xss):', await ev(RESET(9, XSS))); await sleep(400);
const n7 = await ev(`(()=>{const el=document.getElementById('cn-cmty-nudge');return {html:el?el.innerHTML:'',xss:!!window.__xss,imgs:el?el.querySelectorAll('img[onerror]').length:-1};})()`);
check('N7 un apodo hostil se escapa (sin <img onerror> inyectado ni ejecución)',
  !n7.xss && n7.imgs === 0 && /&lt;img/.test(n7.html), JSON.stringify({ xss: n7.xss, imgs: n7.imgs }));

// N8: «Ver a mi gente» lleva de verdad a la pestaña Comunidad (con su pestaña marcada).
console.log('  setup(9, 3 peers) nav:', await ev(RESET(9, PEERS3))); await sleep(400);
await ev(`(()=>{window.__rc=0;window.renderCommunity=()=>{window.__rc++;};})()`);
await ev(`cmtyNudgeGo()`); await sleep(400);
const n8 = await ev(`(()=>{const p=document.getElementById('cn-community');const tab=document.querySelector('.cntab[onclick*="cn-community"]');
  return {panel:!!(p&&p.classList.contains('on')),tab:!!(tab&&tab.classList.contains('on')),rc:window.__rc};})()`);
check('N8 «Ver a mi gente» abre la pestaña Comunidad (panel + pestaña marcada + render)',
  n8.panel && n8.tab && n8.rc >= 1, JSON.stringify(n8));

// N9: la sonda pega a la red 1×/día — fresca no dispara, vieja sí.
console.log('  setup(9, sonda fresca):', await ev(RESET(9, PEERS3))); await sleep(400);
const p1 = await ev(`window.__probes`);
await ev(`(()=>{const p=JSON.parse(localStorage.getItem('ax_cmty_probe'));p.at=Date.now()-30*3600000;localStorage.setItem('ax_cmty_probe',JSON.stringify(p));renderClientToday(DB.clients[0]);})()`); await sleep(400);
const p2 = await ev(`window.__probes`);
check('N9 la sonda no pega a la red con caché fresca y sí cuando caduca (24h)', p1 === 0 && p2 >= 1, JSON.stringify({ fresca: p1, caducada: p2 }));

// N10: sin sonda (primer arranque) → nada se pinta y se pide la sonda; nunca se invita a ciegas.
await ev(`(()=>{localStorage.removeItem('ax_cmty_probe');window.__probes=0;renderClientToday(DB.clients[0]);})()`); await sleep(400);
const n10 = await ev(`(()=>{const el=document.getElementById('cn-cmty-nudge');return {disp:el?el.style.display:'?',probes:window.__probes};})()`);
check('N10 sin sonda no se invita a ciegas, pero se va a buscar el dato', n10.disp === 'none' && n10.probes >= 1, JSON.stringify(n10));

// N11: la píldora flotante «Instalar app» NO puede tapar el CTA. Se mide con hit-testing REAL en
// el viewport de 390×844 (`elementFromPoint`), no con una captura full-page: `position:fixed`
// miente con `captureBeyondViewport` y ya generó una falsa alarma en A1.
console.log('  setup(9, 3 peers) hit-test:', await ev(RESET(9, PEERS3))); await sleep(400);
const n11 = await ev(`(()=>{
  const c=document.getElementById('cn-cmty-nudge'); if(c)c.scrollIntoView({block:'center'});
  const btn=[...document.querySelectorAll('#cn-cmty-nudge button')].find(b=>/Ver a mi gente/.test(b.textContent));
  if(!btn) return {err:'sin boton'};
  const r=btn.getBoundingClientRect();
  const hit=document.elementFromPoint(Math.round(r.left+r.width/2), Math.round(r.top+r.height/2));
  const bn=document.getElementById('install-banner');
  const br=(bn&&getComputedStyle(bn).display!=='none')?bn.getBoundingClientRect():null;
  return {btn:[Math.round(r.top),Math.round(r.bottom)], banner:br?[Math.round(br.top),Math.round(br.bottom)]:null,
          hitEsBoton:!!(hit&&(hit===btn||btn.contains(hit))), solapa:!!(br&&br.top<r.bottom&&br.bottom>r.top)};})()`);
check('N11 el banner «Instalar app» no tapa «Ver a mi gente» (hit-test real 390×844)',
  n11.hitEsBoton === true && n11.solapa === false, JSON.stringify(n11));

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── RESULTADOS «PUERTA A COMUNIDAD» (A2, adopción) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('shots en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
