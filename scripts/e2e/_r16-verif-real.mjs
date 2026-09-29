// _r16-verif-real.mjs — R16: VERIFICACIÓN del orquestador con los DATOS REALES (respaldo del 27-sep).
//
// V2 midió con historiales sintéticos de hasta 220 sesiones por persona; hoy el máximo real es 91. Antes
// de decirle al PO cuánto espera, se mide con lo que HAY: el respaldo se carga SOLO en la memoria del
// navegador local (la nube está sellada en localhost, v298), no se copia a ningún archivo y no se imprime
// ningún nombre. CPU ×4 (teléfono de gama media emulado). Cada medición, 3 corridas.
//   node scripts/e2e/_r16-verif-real.mjs [ruta-al-respaldo]      · imprime una tabla (medición, no afirma)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
const RESPALDO = process.argv[2] || 'C:/Users/KRONOS/Desktop/AVI/backups/avi-backup-2026-09-27.json';
const PORT = 8878, DBG = 9429;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const bk = JSON.parse(readFileSync(RESPALDO, 'utf8'));
const coachRow = bk.user_data.find(u => u.role === 'coach' && Array.isArray(u.history) && u.history.length > 50);
const filas = bk.user_data.filter(u => u.role === 'client' && u.coach_id === coachRow.user_id);
const heavy = filas.slice().sort((a, b) => (b.history || []).length - (a.history || []).length)[0];
console.log(`respaldo: ${filas.length} asesorados del coach · el de más sesiones tiene ${(heavy.history || []).length} · el coach ${coachRow.history.length}`);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/r16real-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 4e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, timeout: 120000 }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof _hydrateCoachFromRows==='function' && typeof renderProgressPanel==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1200);

// Las filas viajan UNA vez a la página (en memoria) y ahí se quedan.
await ev(`window.__FILAS=${JSON.stringify(filas.map(f => ({ user_id: f.user_id, coach_id: f.coach_id, role: f.role, profile: f.profile, routines: f.routines, history: f.history, msgs: f.msgs, bodyweight: f.bodyweight, updated_at: f.updated_at })))}; 1`);
const HEAVY_ID = heavy.user_id;

// Mide una acción con CPU ×4: tiempo total y la tarea larga mayor (PerformanceObserver longtask).
async function medir(expr, veces = 3) {
  const out = [];
  for (let k = 0; k < veces; k++) {
    await ev(`(()=>{ window.__lt=[]; if(!window.__obs){ window.__obs=new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(e.duration))); window.__obs.observe({entryTypes:['longtask']}); } return 1; })()`);
    await send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t = await ev(`(async()=>{ const t0=performance.now(); ${expr}; const t1=performance.now(); await new Promise(r=>setTimeout(r,120)); return Math.round(t1-t0); })()`);
    await sleep(250);
    const lt = await ev(`Math.round(Math.max(0,...window.__lt))`);
    await send('Emulation.setCPUThrottlingRate', { rate: 1 });
    out.push({ t, lt });
    await sleep(600);
  }
  return out.map(x => `${x.t} ms (larga ${x.lt})`).join(' · ');
}

// ── COACH con sus asesorados reales ──
await ev(`(()=>{ ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  CUR.loggedAs='coach'; _hydrateCoachFromRows(window.__FILAS); showScreen('s-coach'); return DB.clients.length; })()`);
const n = await ev(`DB.clients.length`);
console.log(`\nCOACH · ${n} asesorados reales montados · CPU ×4`);
console.log('Inicio (renderHome):          ', await medir(`gp('p-home'); renderHome()`));
console.log('Cargas (renderProgressPanel): ', await medir(`gp('p-progress'); renderProgressPanel()`));
console.log('Asesorados (renderClients):   ', await medir(`gp('p-clients'); renderClients()`));
console.log(`Ficha del que más entrena:     `, await medir(`openDetail(${JSON.stringify(HEAVY_ID)}, true)`));

// ── ASESORADA: el guiado con su historial real (marcar una serie) ──
const toque = await ev(`(async()=>{
  const c=DB.clients.find(x=>x.id===${JSON.stringify(HEAVY_ID)}); const rid=(c.routines||[]).find(r=>(r.exercises||[]).some(e=>barDefaultKg(e)!=null))||c.routines[0];
  CUR.clientId=c.id; CUR.loggedAs='client'; CUR.todayOverride=rid; CUR.todayWorking=null; CUR.trainAgain=false;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^mood_|^barra_/.test(k)).forEach(k=>localStorage.removeItem(k));
  showScreen('s-client'); cnTab('cn-today',document.querySelector('.cntab'),true); renderClientToday(c,rid);
  if(typeof expandTodayWorkout==='function') expandTodayWorkout();
  await new Promise(r=>setTimeout(r,800));
  const b=[...document.querySelectorAll('.mood-btn')][0]; if(b) b.click();
  await new Promise(r=>setTimeout(r,800));
  return {rutina:rid.exercises.length, conBarra:rid.exercises.filter(e=>barDefaultKg(e)!=null).length, sesiones:(DB.history[c.id]||[]).length, guiado:!!document.getElementById('gm-set-0-0')};
})()`);
console.log(`\nASESORADA · rutina de ${toque.rutina} ejercicios (${toque.conBarra} con barra) · ${toque.sesiones} sesiones · guiado ${toque.guiado}`);
let si = 0;
const marcar = async () => { const s = si++; return medir(`(()=>{ const row=document.getElementById('gm-set-0-${s}'); if(!row) return; const kg=row.querySelector('[data-field="kg"]'); if(kg&&!kg.value) kg.value='50'; document.getElementById('gm-chk-0-${s}').click(); if(typeof gmSkipRest==='function') gmSkipRest(); })()`, 1); };
console.log('Marcar serie 1:               ', await marcar());
console.log('Marcar serie 2:               ', await marcar());
console.log('Marcar serie 3:               ', await marcar());
// La parte de la barra (v681), aislada: una llamada por ejercicio con barra, sobre SU historial.
const barra = await medir(`(()=>{ const c=DB.clients.find(x=>x.id===${JSON.stringify(HEAVY_ID)}); const h=DB.history[c.id]; (GM.routine.exercises||[]).forEach(e=>{ if(barDefaultKg(e)!=null) exerciseBarKg(h,e); }); })()`);
console.log('Solo la barra (v681), por toque:', barra);
console.log('gmRender completo:            ', await medir(`gmRender()`));
// v686 · la pieza exacta, en la MISMA página y 20 veces: la barra de los ejercicios de la rutina, antes
// (identidad reconstruida por cada ejercicio con barra) y ahora (una sola identidad para todos).
await send('Emulation.setCPUThrottlingRate', { rate: 4 });
console.log('barra por guardado, 20 veces (ms):', JSON.stringify(await ev(`(()=>{ const c=DB.clients.find(x=>x.id===${JSON.stringify(HEAVY_ID)}); const h=DB.history[c.id]; const exs=(GM.routine.exercises||[]).filter(e=>barDefaultKg(e)!=null);
  let t=performance.now(); for(let k=0;k<20;k++) exs.forEach(e=>exerciseBarKg(h,e)); const antes=performance.now()-t;
  t=performance.now(); for(let k=0;k<20;k++){ const idt=exerciseIdentity(h); exs.forEach(e=>exerciseBarKg(h,e,idt)); } const ahora=performance.now()-t;
  return {conBarra:exs.length, antesPorGuardado:+(antes/20).toFixed(1), ahoraPorGuardado:+(ahora/20).toFixed(1)}; })()`)));
await send('Emulation.setCPUThrottlingRate', { rate: 1 });
console.log('\njsErrors:', JSON.stringify(jsErrors.slice(0, 3)));
try { ws.close(); } catch {} chrome.kill(); srv.kill();
process.exit(0);
