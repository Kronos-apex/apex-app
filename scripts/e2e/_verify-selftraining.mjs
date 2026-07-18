// _verify-selftraining.mjs — "Mi entrenamiento" en el panel del coach (v369, FIX v371, idea Camilo #3):
// Camilo entrena con "Mi entrenamiento" (COACH_SELF), guardado en SU PROPIA fila (COACH_OWN_ROW), NO
// en un cliente. La tarjeta #h-mytraining del Inicio lee de ahí — sin marcar nada — y muestra
// racha/semana/último + acceso a "Mi entrenamiento". Sin login (sintetiza el panel + COACH_OWN_ROW).
// Aserciones duras (exit 1) + shots. (v369 leía de un cliente marcado → nunca salía para Camilo.)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8796, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9303', '--user-data-dir=' + process.env.TEMP + '/self-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9303/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
async function shotFull(n) {
  const h = await ev(`(()=>{
    const mn=document.querySelector('#s-coach .main'); if(mn){mn.style.overflow='visible';mn.style.height='auto';mn.style.flex='none';}
    const cs=document.getElementById('s-coach'); if(cs){cs.style.height='auto';cs.style.maxHeight='none';cs.style.overflow='visible';}
    document.querySelectorAll('.coach-topbar').forEach(e=>{e.style.position='static';});
    return Math.max(document.getElementById('s-coach').scrollHeight, 844);
  })()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: Math.min(h, 1600), deviceScaleFactor: 2, mobile: true });
  await sleep(400);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n, `(${Math.min(h, 1600)}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && typeof myTrainingSummary==='function' && typeof renderMyTrainingCard==='function' && !document.getElementById('avi-loading')`);
await sleep(2500);

const setup = await ev(`(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const mkEx=(nm,mus)=>({id:nm,name:nm,muscle:mus,type:'Compuesto',track:'peso_reps',sets:3,reps:'10'});
  // Un par de asesorados para que el Inicio no esté vacío (no son "él").
  DB.clients=[{id:'c1',name:'Andrea Molina',email:'a@a.com',goal:'Bajar de peso',level:'Intermedio',days:3,tier:'premium',payments:[{date:'2026-06-15',dueDate:'2026-08-05',amount:120000}],routines:[]}];
  DB.history={c1:[]};
  // COACH_OWN_ROW = la fila propia del coach, con SU entreno (así es como entrena Camilo: COACH_SELF).
  const mkS=(daysAgo)=>{const d=new Date();d.setDate(d.getDate()-daysAgo);d.setHours(18,0,0,0);const iso=d.toISOString();
    return {id:'s'+daysAgo,sessionId:'sid'+daysAgo,routineId:'r1',routineName:'Empuje',date:iso,startedAt:iso,finishedAt:iso,totalVol:4200,doneSets:12,totalSets:12,exercises:[]};};
  COACH_OWN_ROW={user_id:'coach-me',profile:{name:'Camilo',days:3,sex:'M',goal:'Ganar músculo',level:'Intermedio'},
    routines:[{id:'r1',name:'Empuje',day:'Lunes',restSec:90,exercises:[mkEx('Sentadilla','Pierna')]}],
    history:[mkS(0),mkS(2),mkS(5)], prs:{}, bodyweight:[], medidas:[], nutrition:{}, photos:[], msgs:[]};
  window.CUR=window.CUR||{}; CUR.loggedAs='coach';
  showScreen('s-coach');
  if(typeof renderAll==='function')renderAll();
  gp('p-home',document.getElementById('sbi-home'),'Inicio'); if(typeof renderHome==='function')renderHome();
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`);
console.log('  setup:', setup);
await sleep(800);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

// ST1: la tarjeta sale SOLA (sin marcar nada), leyendo el entreno propio del coach.
const st1 = await ev(`(()=>{const el=document.getElementById('h-mytraining');const t=el?el.innerText.replace(/\\s+/g,' ').trim():'';return {disp:el?el.style.display:'?',racha:/Racha/.test(t),semana:/Esta semana/.test(t),ultimo:/Último/.test(t),hoy:/Hoy/.test(t),cta:/Ver mi entrenamiento/.test(t)};})()`);
check('ST1 la tarjeta "Mi entrenamiento" sale sola con Racha/Esta semana/Último + CTA (lee COACH_OWN_ROW)', st1.disp === 'block' && st1.racha && st1.semana && st1.ultimo && st1.cta, JSON.stringify(st1));
check('ST2 "Último" = Hoy (hay una sesión finalizada hoy en la fila propia)', st1.hoy === true, JSON.stringify(st1));

await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300); await shotFull('selftraining-home-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(300); await shotFull('selftraining-home-oscuro');
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300);

// ST3: la tarjeta lleva a "Mi entrenamiento" (openMyTraining → vista de asesorado, COACH_SELF).
await ev(`(()=>{const b=[...document.querySelectorAll('#h-mytraining button')].find(x=>/Ver mi entrenamiento/.test(x.textContent));if(b)b.click();})()`);
await sleep(900);
const st3 = await ev(`(()=>{const sc=document.getElementById('s-client');const open=sc&&getComputedStyle(sc).display!=='none';return {clientView:!!open,coachSelf:(typeof COACH_SELF!=='undefined')?COACH_SELF:'?'};})()`);
check('ST3 "Ver mi entrenamiento" abre Mi entrenamiento (vista de asesorado, COACH_SELF)', st3.clientView === true && st3.coachSelf === true, JSON.stringify(st3));

// ST4: sin historial propio → la tarjeta se oculta (no molesta a un coach que no entrena en la app).
await ev(`(()=>{if(typeof backToCoachPanel==='function'){/* no-op */}COACH_SELF=false;COACH_OWN_ROW={user_id:'coach-me',profile:{name:'Camilo',days:3},routines:[],history:[]};CUR.loggedAs='coach';showScreen('s-coach');gp('p-home',document.getElementById('sbi-home'),'Inicio');renderHome();})()`);
await sleep(500);
const st4 = await ev(`(()=>{const el=document.getElementById('h-mytraining');return {disp:el?el.style.display:'?',html:el?el.innerHTML.trim().length:-1};})()`);
check('ST4 sin historial propio → tarjeta oculta y vacía', st4.disp === 'none' && st4.html === 0, JSON.stringify(st4));

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── RESULTADOS «MI ENTRENAMIENTO» (v369/fix v371) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('shots en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
