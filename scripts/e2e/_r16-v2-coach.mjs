// _r16-v2-coach.mjs — R16 «peso y velocidad», área V2 (Lucas QA funcional), PANEL DEL COACH.
//
// El coach real tiene ~28 asesorados (baseline 28-sep). Monta esa cantidad EN LOCAL con una
// distribución de historial calcada del baseline (3 pesados ~200 KB, 10 medianos, 15 livianos
// casi sin uso — así se ve la base real: la mitad nunca entrena) y mide, con CPU ×4, lo que
// tarda abrir sus tres pantallas que recorren TODOS los asesorados: Inicio (`renderHome`),
// Asesorados (`renderClients`) y Cargas (`renderProgressPanel`, que para CADA cliente llama
// `buildExerciseProgress`→`computeExerciseProgress` y `stalledExercises` sobre su historial
// COMPLETO — app-2-login.js:1086-1107).
//
// Sin login ni red: monta la app LOCAL (la nube está sellada en localhost, v298).
//   node scripts/e2e/_r16-v2-coach.mjs      · imprime una tabla, no afirma nada (es medición)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8886, DBG = 9491;
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-r16-v2';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/r16v2coach-' + Date.now(), '--no-first-run',
  '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, timeout: 60000 }); return r.result?.value; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Performance.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setScrollbarsHidden', { hidden: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderHome==='function' && typeof renderProgressPanel==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1000);

// ── Fixture SIN throttle (construir 28 fichas no es lo que se mide) ──
const CONSTRUIR = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const lib=(DB.exercises||[]).filter(e=>typeof exTrack==='function'&&exTrack(e)==='peso_reps').slice(0,10);
  const days=['Lunes','Martes','Miércoles','Jueves','Viernes'];
  const mkEx=(n)=>lib.slice(0,n).map(e=>({id:e.id,name:e.name,muscle:e.muscle,icon:e.icon,sets:4,reps:'10'}));
  // Distribución calcada del baseline (28-sep): la mayoría casi no entrena, unos pocos son
  // los que pesan de verdad. tier: [nClientes, nSesiones, nEx, nSets]
  const tiers=[
    {n:3, ses:220, ex:6, sets:3, tag:'pesado'},    // ≈ los 3 más pesados del baseline (191/178/175 KB)
    {n:10, ses:70, ex:5, sets:3, tag:'mediano'},    // ≈ la mediana (63 KB de fila completa)
    {n:15, ses:12, ex:4, sets:3, tag:'liviano'},    // ≈ la mitad que casi no usa la app
  ];
  const clients=[]; const history={}; const prs={}; const msgs={};
  let idx=0;
  tiers.forEach(t=>{
    for(let k=0;k<t.n;k++){
      const cid='qa-coach28-'+(idx++);
      const exs=mkEx(t.ex);
      const client={id:cid, name:'Asesorado '+idx, sex:idx%2?'F':'M', level:'Intermedio', goal:'Recomposición',
        days:t.ex, weight:65+idx, height:165, age:25+(idx%20), tier: idx<26?undefined:'app',
        createdAt:'2025-01-01T10:00:00.000Z', startDate:'2025-01-01',
        routines:[{id:'r'+cid, name:'Rutina', day:days[idx%5], restSec:90, reviewed:true, note:'', exercises:exs}],
        payments:[{date:'2026-09-01', dueDate:'2026-10-01', amount:120000, note:''}], habits:{water:{},steps:{}}};
      const hist=[]; const p={};
      for(let s=0;s<t.ses;s++){
        const d=new Date(Date.now()-(t.ses-s)*86400000).toISOString();
        const exArr=exs.map((e,i)=>{
          const kg=20+((s+i)%12)*2.5;
          const sets=Array.from({length:t.sets},(_,si)=>({kg:String(kg),reps:'10',done:true}));
          if(!p[e.id]||kg>p[e.id].kg) p[e.id]={kg,reps:10,date:d,name:e.name,muscle:e.muscle};
          return {id:e.id,name:e.name,muscle:e.muscle,icon:e.icon,track:'peso_reps',sets};
        });
        const totalVol=exArr.reduce((a,x)=>a+x.sets.reduce((b,y)=>b+ +y.kg* +y.reps,0),0);
        hist.push({id:'h'+cid+s,sessionId:'s'+cid+s,routineId:'r'+cid,routineName:'Rutina',date:d,finishedAt:d,
          doneSets:exArr.length*t.sets,totalSets:exArr.length*t.sets,totalVol,duration:3000,kcal:280,exercises:exArr});
      }
      clients.push(client); history[cid]=hist; prs[cid]=p; msgs[cid]=[];
    }
  });
  DB.clients=clients; DB.history=history; DB.prs=prs; DB.msgs=msgs;
  DB.bodyweight={}; DB.nutrition={}; DB.medidas={}; DB.photos={}; DB.templates=[];
  CUR.loggedAs='coach'; CUR.clientId=null;
  showScreen('s-coach'); gp('p-home', null, 'Inicio', true);
  const histBytes=Object.fromEntries(Object.entries(history).map(([k,v])=>[k, JSON.stringify(v).length]));
  const totalHistBytes=Object.values(histBytes).reduce((a,b)=>a+b,0);
  return {ok:true, nClientes:clients.length, totalHistBytes, pesados:histBytes, sample: [histBytes['qa-coach28-0'], histBytes['qa-coach28-3'], histBytes['qa-coach28-13']]};
}catch(e){return {ok:false,err:e.message+' | '+((e.stack||'').split('\\n')[1]||'')};}})()`;

const m = await ev(CONSTRUIR);
console.log('montaje:', JSON.stringify(m));
if (!m || !m.ok) { console.log('🔴 no se pudo montar'); process.exit(1); }
await sleep(500);

// ── CPU ×4 ──
await send('Emulation.setCPUThrottlingRate', { rate: 4 });
await ev(`(()=>{ window.__lt=window.__lt||[]; if(!window.__ltObs){ window.__ltObs=new PerformanceObserver(list=>{ list.getEntries().forEach(e=>window.__lt.push({t:e.startTime,d:e.duration})); }); try{ window.__ltObs.observe({type:'longtask',buffered:true}); }catch(e){} } })()`);
await ev(`window.__medir=async(fn)=>{
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  await new Promise(r=>setTimeout(r,40));
  const before=window.__lt.length; const t0=performance.now();
  fn();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  await new Promise(r=>setTimeout(r,80));
  const t1=performance.now();
  const tareas=window.__lt.slice(before);
  return {ms:+(t1-t0).toFixed(1), nTareas:tareas.length, maxTarea:tareas.length?+Math.max(...tareas.map(x=>x.d)).toFixed(1):0};
};`);

const results = {};
const log = (n, x) => { results[n] = x; console.log(n + ':', JSON.stringify(x)); };

log('renderHome() — Inicio (recorre TODO DB.history por «sesiones esta semana»/retención)',
  await ev(`window.__medir(()=>{ renderHome(); })`));
log('renderClients() — Asesorados (sortClientsByAttention sobre las 28 fichas)',
  await ev(`window.__medir(()=>{ renderClients(); })`));
log('gp("p-progress") + renderProgressPanel() — CARGAS: 28 × (computeExerciseProgress + stalledExercises) sobre el historial COMPLETO de cada uno',
  await ev(`window.__medir(()=>{ gp('p-progress', null, 'Cargas', true); renderProgressPanel(); })`));
// Abrir el detalle del asesorado MÁS PESADO (tier "pesado", 220 sesiones): gráfica + progreso.
log('openDetail() del asesorado más pesado (220 sesiones) — ficha con gráfica de volumen',
  await ev(`window.__medir(()=>{ if(typeof openDetail==='function') openDetail('qa-coach28-0', true); })`));

// ── CONTROL de discriminación: LOS MISMOS 28 asesorados, pero con 2 sesiones cada uno.
// Si el costo de "Cargas" no cae aquí, el culpable no es el HISTORIAL sino los 28 clientes
// en sí (o el freno de CPU×4 solo) — hay que tumbar la hipótesis antes de escribirla.
const CONTROL = `(()=>{try{
  const cids=DB.clients.map(c=>c.id);
  const history={}; const prs={};
  cids.forEach(cid=>{
    const c=DB.clients.find(x=>x.id===cid); const exs=c.routines[0].exercises;
    const hist=[]; const p={};
    for(let s=0;s<2;s++){
      const d=new Date(Date.now()-(2-s)*86400000).toISOString();
      const exArr=exs.map(e=>({id:e.id,name:e.name,muscle:e.muscle,icon:e.icon,track:'peso_reps',
        sets:[{kg:'40',reps:'10',done:true},{kg:'40',reps:'10',done:true},{kg:'40',reps:'10',done:true}]}));
      hist.push({id:'c'+cid+s,sessionId:'cs'+cid+s,routineId:c.routines[0].id,routineName:'Rutina',date:d,finishedAt:d,
        doneSets:exArr.length*3,totalSets:exArr.length*3,totalVol:4000,duration:2000,kcal:200,exercises:exArr});
    }
    history[cid]=hist; prs[cid]={};
  });
  DB.history=history; DB.prs=prs;
  const totalHistBytes=Object.values(history).reduce((a,v)=>a+JSON.stringify(v).length,0);
  return {ok:true, nClientes:cids.length, totalHistBytes};
}catch(e){return {ok:false,err:e.message};}})()`;
const mc = await ev(CONTROL);
console.log('\n=== CONTROL: mismos 28 asesorados, 2 sesiones cada uno ===');
console.log('montaje control:', JSON.stringify(mc));
const resultsControl = {};
const logC = (n, x) => { resultsControl[n] = x; console.log('CONTROL ' + n + ':', JSON.stringify(x)); };
logC('renderHome()', await ev(`window.__medir(()=>{ renderHome(); })`));
logC('renderClients()', await ev(`window.__medir(()=>{ renderClients(); })`));
logC('renderProgressPanel()', await ev(`window.__medir(()=>{ gp('p-progress', null, 'Cargas', true); renderProgressPanel(); })`));
logC('openDetail() del mismo asesorado, ahora con 2 sesiones', await ev(`window.__medir(()=>{ if(typeof openDetail==='function') openDetail('qa-coach28-0', true); })`));

console.log('\njsErrors:', JSON.stringify(jsErrors.slice(0, 10)));
writeFileSync(`${OUT}/resultados-coach.json`, JSON.stringify({ montaje: m, results, montajeControl: mc, resultsControl, jsErrors }, null, 2));
console.log('\nGuardado:', `${OUT}/resultados-coach.json`);
try { ws.close(); } catch {} chrome.kill(); srv.kill();
process.exit(0);
