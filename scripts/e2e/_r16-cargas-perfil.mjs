// _r16-cargas-perfil.mjs — R16: VERIFICACIÓN del orquestador con los DATOS REALES (respaldo del 27-sep).
//
// V2 midió con historiales sintéticos de hasta 220 sesiones por persona; hoy el máximo real es 91. Antes
// de decirle al PO cuánto espera, se mide con lo que HAY: el respaldo se carga SOLO en la memoria del
// navegador local (la nube está sellada en localhost, v298), no se copia a ningún archivo y no se imprime
// ningún nombre. CPU ×4 (teléfono de gama media emulado). Cada medición, 3 corridas.
//   node scripts/e2e/_r16-cargas-perfil.mjs [ruta-al-respaldo]      · imprime una tabla (medición, no afirma)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
const RESPALDO = process.argv[2] || 'C:/Users/KRONOS/Desktop/AVI/backups/avi-backup-2026-09-27.json';
const PORT = 8877, DBG = 9428;
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

// ── PERFIL DE «CARGAS»: dónde se va el tiempo (CPU ×4, datos reales) ──
await ev(`(()=>{ ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  CUR.loggedAs='coach'; _hydrateCoachFromRows(window.__FILAS); showScreen('s-coach'); gp('p-progress'); return DB.clients.length; })()`);
const partes = async () => {
  await send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r = await ev(`(()=>{ const now=Date.now(); let a=0,b=0;
    for(const c of DB.clients){ const h=DB.history[c.id]||[];
      let t=performance.now(); computeExerciseProgress(h); a+=performance.now()-t;
      t=performance.now(); try{ stalledExercises(c,h,now); }catch(e){} b+=performance.now()-t; }
    const t=performance.now(); renderProgressPanel(); const total=performance.now()-t;
    return {progreso:Math.round(a), estancamiento:Math.round(b), panelCompleto:Math.round(total),
      filas:document.querySelectorAll('#prog-list .pex-row').length, tarjetas:document.querySelectorAll('#prog-list .pload-card').length}; })()`);
  await send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return r;
};
// v685: la pintada va por tandas. Se mide la tarea MÁS LARGA (lo que se siente como «pegado») y el total.
const tandas = async () => {
  await ev(`(()=>{ window.__lt=[]; if(!window.__obs){ window.__obs=new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(Math.round(e.duration)))); window.__obs.observe({entryTypes:['longtask']}); } return 1; })()`);
  await send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r = await ev(`(async()=>{ const t0=performance.now(); const p=renderProgressPanel(); const sinc=performance.now()-t0;
    await p; const total=performance.now()-t0; await new Promise(r=>setTimeout(r,300));
    return {primeraTanda:Math.round(sinc), total:Math.round(total), tareaMasLarga:Math.max(0,...window.__lt),
      tarjetas:document.querySelectorAll('#prog-list .pload-card').length, filasArmadas:document.querySelectorAll('#prog-list .pex-row').length}; })()`);
  await send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return r;
};
if (typeof _progSeqCheck === 'undefined') {}
const esNuevo = await ev(`typeof openProgCard==='function'`);
for (let k = 0; k < 3; k++) { console.log(JSON.stringify(esNuevo ? await tandas() : await partes())); await sleep(800); }
// Abrir UNA tarjeta (la que más filas tiene) como lo hace el coach.
if (esNuevo) { await send('Emulation.setCPUThrottlingRate', { rate: 4 });
  console.log('abrir la tarjeta más grande:', JSON.stringify(await ev(`(()=>{ const cs=[...document.querySelectorAll('#prog-list .pload-card')]; let best=null,n=-1;
    cs.forEach(c=>{ const k=(c._prog&&c._prog.filtered.length)||0; if(k>n){n=k;best=c;} });
    const t0=performance.now(); best.querySelector('.pload-hd').click(); const conClic=Math.round(performance.now()-t0);
    best.classList.remove('open'); best._progBuilt=false; best.querySelector('.pload-body').innerHTML='';
    const t1=performance.now(); openProgCard(best); void best.offsetHeight; return {filas:n, conClicSimulado:conClic, abrirMasDisposicion:Math.round(performance.now()-t1)}; })()`)));
  await send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await send('Emulation.setCPUThrottlingRate', { rate: 4 });
  console.log('piezas de abrir (ms):', JSON.stringify(await ev(`(()=>{ const cs=[...document.querySelectorAll('#prog-list .pload-card')]; let best=null,n=-1;
    cs.forEach(c=>{ const k=(c._prog&&c._prog.filtered.length)||0; if(k>n){n=k;best=c;} });
    const body=best.querySelector('.pload-body'); body.innerHTML=''; best._progBuilt=false; best.classList.remove('open');
    let t=performance.now(); _progBuildBody(best); const armar=performance.now()-t;
    const html=body.innerHTML; body.innerHTML='';
    t=performance.now(); body.innerHTML=html; const parsear=performance.now()-t;
    t=performance.now(); best.classList.add('open'); void best.offsetHeight; const disposicion=performance.now()-t;
    return {armarYParsear:Math.round(armar), soloParsear:Math.round(parsear), abrirConDisposicion:Math.round(disposicion)}; })()`)));
  await send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log('tamaño del ícono de músculo (caracteres):', JSON.stringify(await ev(`(()=>{ const o={}; ['pecho','espalda','piernas','gluteo','hombros','biceps'].forEach(m=>o[m]=muscleIcon(m,16).length); return o; })()`)));
  console.log('HTML de la tarjeta más grande (KB):', await ev(`(()=>{ const cs=[...document.querySelectorAll('#prog-list .pload-card')]; let best=null,n=-1; cs.forEach(c=>{ const k=(c._prog&&c._prog.filtered.length)||0; if(k>n){n=k;best=c;} }); return Math.round(best.querySelector('.pload-body').innerHTML.length/1024); })()`));
  // Perfil de CPU de abrir la tarjeta más grande (otra vez desde cero): qué funciones se llevan el tiempo.
  await ev(`(async()=>{ await renderProgressPanel(); return 1; })()`);
  await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 200 });
  await send('Emulation.setCPUThrottlingRate', { rate: 4 }); await send('Profiler.start');
  await ev(`(()=>{ const cs=[...document.querySelectorAll('#prog-list .pload-card')]; let best=null,n=-1;
    cs.forEach(c=>{ const k=(c._prog&&c._prog.filtered.length)||0; if(k>n){n=k;best=c;} }); best.querySelector('.pload-hd').click(); return n; })()`);
  const prof = (await send('Profiler.stop')).profile; await send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const dt = {}; const nodes = new Map(prof.nodes.map(x => [x.id, x]));
  const iv = (prof.endTime - prof.startTime) / Math.max(1, prof.samples.length) / 1000;
  prof.samples.forEach(idn => { const nd = nodes.get(idn); const k = (nd.callFrame.functionName || '(anon)') + ' ' + (nd.callFrame.url.split('/').pop() || '') + ':' + nd.callFrame.lineNumber; dt[k] = (dt[k] || 0) + iv; });
  const padre = new Map(); prof.nodes.forEach(nd => (nd.children || []).forEach(ch => padre.set(ch, nd.id)));
  const cadenas = {}; prof.samples.forEach(idn => { const nd = nodes.get(idn); if (nd.callFrame.functionName !== 'getBoundingClientRect') return;
    const pila = []; let cur = padre.get(idn); while (cur != null && pila.length < 6) { const x = nodes.get(cur); pila.push((x.callFrame.functionName || '(anon)') + ':' + x.callFrame.lineNumber); cur = padre.get(cur); }
    const k = pila.join(' ← '); cadenas[k] = (cadenas[k] || 0) + iv; });
  console.log('quién llama a getBoundingClientRect:'); Object.entries(cadenas).sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(([k, v]) => console.log('  ' + v.toFixed(1) + '  ' + k));
  console.log('tiempo propio por función (ms, CPU ×4):'); Object.entries(dt).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => console.log('  ' + v.toFixed(1) + '  ' + k)); }
console.log('jsErrors:', JSON.stringify(jsErrors.slice(0, 3)));
try { ws.close(); } catch {} chrome.kill(); srv.kill();
process.exit(0);
