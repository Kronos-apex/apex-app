// _r16-v2-cliente.mjs — R16 «peso y velocidad», área V2 (Lucas QA funcional).
//
// MIDE con CDP CPU ×4 (Emulation.setCPUThrottlingRate) y el Performance Observer de
// `longtask` (tareas > 50 ms bloqueando el hilo principal) qué toques y pantallas hacen
// esperar a un teléfono de gama media MIENTRAS SE USA la app (no el arranque — eso es V1).
//
// Construye DOS asesorados sintéticos:
//   PEOR CASO: 365 sesiones (el tope que guarda la app), 7 ejercicios por rutina, con PRs,
//              peso corporal y medidas — del tamaño de las filas más pesadas del baseline
//              (history ~160-220 KB de JSON, 28-sep-2026).
//   TÍPICO:    ~90 sesiones, 5 ejercicios — apunta a una fila mediana (~63 KB).
// Mide: (a) marcar una serie en el guiado (el toque de cada día) Y un repintado COMPLETO de
// `gmRender` (el que dispara reordenar/cambiar ánimo/reportar dolor — "por diseño" según el
// baseline); (b) abrir Hoy, Historial+gráficas, Perfil (con gráficas), Comunidad (congelada,
// solo costo) y la "habitación" de un ejercicio; (c) crecimiento del heap JS tras navegar
// repetidamente entre pestañas; (d) el costo puro de exerciseIdentity/computeExerciseProgress/
// exercisePerfSeries/exerciseBarKg llamadas directamente sobre el historial del peor caso.
//
// Sin login ni red: monta la app LOCAL (la nube está sellada en localhost, v298).
//   node scripts/e2e/_r16-v2-cliente.mjs      · imprime una tabla, no afirma nada (es medición)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8885, DBG = 9490;
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-r16-v2';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/r16v2cli-' + Date.now(), '--no-first-run',
  '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Performance.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setScrollbarsHidden', { hidden: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderClientToday==='function' && typeof gmRender==='function' && typeof computeExerciseProgress==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1200);

// ── CPU ×4: teléfono de gama media (mismo perfil que V1 midió en el arranque) ──
await send('Emulation.setCPUThrottlingRate', { rate: 4 });

// PerformanceObserver de `longtask`: tareas del hilo principal > 50 ms. Global, se resetea
// leyendo su longitud ANTES/DESPUÉS de cada acción medida (no hay que limpiarlo).
await ev(`(()=>{ window.__lt=window.__lt||[]; if(!window.__ltObs){ window.__ltObs=new PerformanceObserver(list=>{ list.getEntries().forEach(e=>window.__lt.push({t:e.startTime,d:e.duration})); }); try{ window.__ltObs.observe({type:'longtask',buffered:true}); }catch(e){ window.__ltObsErr=String(e); } } return {tieneLongtask: typeof PerformanceObserver!=='undefined' && PerformanceObserver.supportedEntryTypes && PerformanceObserver.supportedEntryTypes.includes('longtask')}; })()`).then(r => console.log('PerformanceObserver longtask soportado:', JSON.stringify(r)));

// window.__medir: ejecuta una función SÍNCRONA y mide el tiempo de reloj de pared hasta el
// siguiente frame pintado (2 rAF) + las tareas largas nuevas durante ese lapso.
const DEF_MEDIR = `window.__medir=async(fn)=>{
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));  // deja asentar lo anterior ANTES de arrancar el reloj
  await new Promise(r=>setTimeout(r,40));
  const before=window.__lt.length; const t0=performance.now();
  fn();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  await new Promise(r=>setTimeout(r,80));  // el PerformanceObserver de longtask entrega con latencia
  const t1=performance.now();
  const tareas=window.__lt.slice(before);
  return {ms:+(t1-t0).toFixed(1), nTareas:tareas.length, maxTarea:tareas.length?+Math.max(...tareas.map(x=>x.d)).toFixed(1):0, sumaTareas:+tareas.reduce((a,x)=>a+x.d,0).toFixed(1)};
};`;
await ev(DEF_MEDIR);

const results = [];
const log = (n, x) => { results.push({ n, x }); console.log(n + ':', typeof x === 'object' ? JSON.stringify(x) : x); };

// ── Fixture: construida DENTRO del navegador (evita mandar 200 KB de JSON por WS) ──
const CONSTRUIR = (caso, nSesiones, nEx, CID) => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const lib=(DB.exercises||[]).filter(e=>typeof exTrack==='function'&&exTrack(e)==='peso_reps');
  const conBarra=lib.filter(e=>typeof barDefaultKg==='function'&&barDefaultKg(e)!=null).slice(0,3);
  const sinBarra=lib.filter(e=>!conBarra.some(b=>b.id===e.id)).slice(0,${nEx});
  const elegidos=[...conBarra, ...sinBarra].slice(0,${nEx});
  const exsBase=elegidos.map(e=>({id:e.id,name:e.name,muscle:e.muscle,icon:e.icon,type:e.type,sets:4,reps:'10'}));
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const client={id:'${CID}',name:'Prueba ${caso}',sex:'F',level:'Intermedio',goal:'Recomposición',days:5,weight:70,height:165,age:31,
    createdAt:'2024-01-01T10:00:00.000Z',startDate:'2024-01-01',
    routines:[{id:'r${CID}',name:'Full Body',day:days[new Date().getDay()],restSec:90,reviewed:true,note:'',exercises:exsBase}],
    habits:{water:{},steps:{}}};
  const hist=[]; const prs={};
  const barIds=new Set(conBarra.map(e=>e.id));
  for(let s=0;s<${nSesiones};s++){
    const d=new Date(Date.now()-(${nSesiones}-s)*86400000).toISOString();
    const exArr=exsBase.map((e,i)=>{
      const kg=20+((s+i)%14)*2.5;
      const bar=barIds.has(e.id)?[10,15,20][i%3]:undefined;
      const sets=Array.from({length:4},(_,si)=>({kg:String(kg),reps:'10',done:true}));
      if(!prs[e.id]||kg>prs[e.id].kg) prs[e.id]={kg,reps:10,date:d,name:e.name,muscle:e.muscle};
      return {id:e.id,name:e.name,muscle:e.muscle,icon:e.icon,track:'peso_reps',...(bar!=null?{bar}:{}),sets};
    });
    const totalVol=exArr.reduce((a,x)=>a+x.sets.reduce((b,y)=>b+ +y.kg* +y.reps,0),0);
    hist.push({id:'h${CID}'+s,sessionId:'s${CID}'+s,routineId:'r${CID}',routineName:'Full Body',date:d,finishedAt:d,
      doneSets:exArr.length*4,totalSets:exArr.length*4,totalVol,duration:3200,kcal:300,exercises:exArr});
  }
  let bw=[]; for(let w=51;w>=0;w--){const dd=new Date(Date.now()-w*7*86400000); bw=bwUpsert(bw,dd.toISOString().split('T')[0],+(70-w*0.05).toFixed(1),dd.toISOString());}
  let med=[];
  med=medUpsert(med,{cintura:80,cadera:100,muslo_izq:58,muslo_der:58.4,brazo_izq:29,brazo_der:29.2,pecho:92},new Date(Date.now()-60*86400000).toISOString())||med;
  med=medUpsert(med,{cintura:78,cadera:99,muslo_izq:57,muslo_der:57.3,brazo_izq:28.8,brazo_der:29,pecho:91},new Date(Date.now()-3*86400000).toISOString())||med;
  DB.clients=[client]; DB.history={'${CID}':hist}; DB.prs={'${CID}':prs}; DB.bodyweight={'${CID}':bw}; DB.medidas={'${CID}':med};
  DB.nutrition={}; DB.photos={}; DB.msgs={'${CID}':[]};
  CUR.clientId='${CID}'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^mood_|^wshow_|^wuopen_|^barra_|^lastre_|^ax_news_seen|^coachmute_/.test(k)).forEach(k=>localStorage.removeItem(k));
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  try{Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted',requestPermission:async()=>'granted'}});}catch(e){}
  showScreen('s-client'); cnTab('cn-today',null,true);
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  const histBytes=JSON.stringify(hist).length, prsBytes=JSON.stringify(prs).length;
  const rowBytes=JSON.stringify({profile:client,routines:client.routines,history:hist,prs,bodyweight:bw,medidas:med}).length;
  return {ok:true, nSesiones:${nSesiones}, nEx:exsBase.length, conBarra:[...barIds], histBytes, prsBytes, rowBytes, exIds:exsBase.map(e=>e.id)};
}catch(e){return {ok:false,err:e.message+' | '+((e.stack||'').split('\\n')[1]||'')};}})()`;

async function medirCaso(caso, nSesiones, nEx) {
  const CID = 'qa-r16v2-' + caso;
  console.log('\n=== CASO: ' + caso + ' (' + nSesiones + ' sesiones × ' + nEx + ' ejercicios) ===');
  const m = await ev(CONSTRUIR(caso, nSesiones, nEx, CID));
  log('  montaje', m);
  if (!m || !m.ok) return null;
  await sleep(1000);

  // ── (a) Entrar al guiado (como la persona: elegir ánimo) ──
  await ev(`(()=>{ if(typeof expandTodayWorkout==='function')expandTodayWorkout(); return 1; })()`);
  await sleep(700);
  await ev(`(()=>{ const b=[...document.querySelectorAll('.mood-btn')][0]; if(b)b.click(); return 1; })()`);
  await sleep(900);
  const enGuiado = await ev(`!!document.getElementById('gm-ex-0')`);
  log('  CONTROL · guiado montado', enGuiado);
  if (enGuiado) {
    // Marcar una serie (gmToggleSet) — el toque de cada día, con toda la maquinaria que
    // dispara: saveSessionToHistory recorre TODOS los ejercicios de la rutina (app-4-entreno.js
    // ~2619-2628) y por cada uno con barra por defecto llama exerciseBarKg → exerciseIdentity,
    // que recorre TODO DB.history[cliente] (avi-core.js:1509 y :9764).
    const marcar = await ev(`window.__medir(()=>{ gmToggleSet(0,0,0); })`);
    log(`  (a) marcar 1 serie (gmToggleSet) — ${nEx} ej., ${nSesiones} sesiones`, marcar);
    // Segunda serie (para no medir en falso el primer toque especial: activar el crono de descanso etc.)
    await sleep(300);
    const marcar2 = await ev(`window.__medir(()=>{ gmToggleSet(0,1,1); })`);
    log('  (a) marcar 2ª serie', marcar2);
    // Repintado COMPLETO de gmRender (dispara con: cambiar ánimo, reportar dolor, reordenar,
    // sustituir ejercicio, resetear — "por diseño", app-6-extra.js:735).
    const repintado = await ev(`window.__medir(()=>{ gmRender(); })`);
    log('  (a) gmRender() — repintado COMPLETO de la lista (cambiar ánimo/reordenar/sustituir/dolor)', repintado);
  }
  await ev(`(()=>{ if(typeof closeGuidedMode==='function') closeGuidedMode(); })()`);
  await sleep(400);

  // ── (b) Pantallas ──
  const historial = await ev(`window.__medir(()=>{ cnTab('cn-history',null); })`);
  log('  (b) abrir Historial (tarjetas + renderAdvStats + renderVolChart)', historial);
  const perfil = await ev(`window.__medir(()=>{ cnTab('cn-profile',null); })`);
  log('  (b) abrir Perfil (incluye renderClientExProgress → computeExerciseProgress)', perfil);
  const comunidad = await ev(`window.__medir(()=>{ cnTab('cn-community',null); })`);
  log('  (b) abrir Comunidad (CONGELADA — solo costo, no se propone nada)', comunidad);
  const rutinas = await ev(`window.__medir(()=>{ cnTab('cn-routines',null); })`);
  log('  (b) abrir Rutinas', rutinas);
  await ev(`cnTab('cn-today',null)`);
  await sleep(400);
  const habitacion = await ev(`window.__medir(()=>{ if(typeof openExDetail==='function') openExDetail(${JSON.stringify(m.exIds[0])}); })`);
  log('  (b) abrir la habitación de un ejercicio (openExDetail)', habitacion);
  await ev(`(()=>{ const c=document.getElementById('m-exref'); if(c) c.classList.remove('on'); const bg=document.querySelector('.mdbg.on'); if(bg) bg.classList.remove('on'); })()`);

  // ── (c) Crecimiento de memoria: 20 ciclos de navegación entre pestañas ──
  const heapAntes = (await send('Performance.getMetrics')).metrics.find(x => x.name === 'JSHeapUsedSize').value;
  for (let i = 0; i < 20; i++) {
    await ev(`(()=>{ cnTab('cn-history',null); cnTab('cn-profile',null); cnTab('cn-routines',null); cnTab('cn-today',null); })()`);
  }
  await sleep(300);
  // Forzar una colección de basura no es posible sin flags de Chrome dedicados; se mide tal cual
  // (lo que el navegador real tampoco fuerza) — el número es el mismo que vería el teléfono.
  const heapDespues = (await send('Performance.getMetrics')).metrics.find(x => x.name === 'JSHeapUsedSize').value;
  log(`  (e) heap JS antes/después de 20 ciclos de navegación (MB)`, { antes: +(heapAntes / 1048576).toFixed(2), despues: +(heapDespues / 1048576).toFixed(2), creceMB: +((heapDespues - heapAntes) / 1048576).toFixed(2) });

  // ── (d) Costo de las funciones puras sobre el historial de ESTE caso ──
  const puras = await ev(`(()=>{
    const hist=DB.history['${CID}']||[]; const ex0=DB.clients[0].routines[0].exercises[0];
    const t=(fn)=>{const t0=performance.now(); const r=fn(); const t1=performance.now(); return {ms:+(t1-t0).toFixed(2), n:Array.isArray(r)?r.length:(r?Object.keys(r).length:0)};};
    return {
      exerciseIdentity: t(()=>exerciseIdentity(hist)),
      computeExerciseProgress: t(()=>computeExerciseProgress(hist)),
      exercisePerfSeries: t(()=>exercisePerfSeries(hist)),
      exerciseBarKg_1x: t(()=>[exerciseBarKg(hist, ex0)]),
      exerciseBarKg_porRutina: (()=>{ const exs=DB.clients[0].routines[0].exercises; const t0=performance.now();
        exs.forEach(e=>exerciseBarKg(hist,e)); const t1=performance.now(); return {ms:+(t1-t0).toFixed(2), nEx:exs.length}; })(),
    };
  })()`);
  log('  (d) funciones puras sobre el historial completo (ms)', puras);

  return { caso, montaje: m, marcar: enGuiado ? results.find(r => r.n.includes('marcar 1 serie'))?.x : null, heapAntes, heapDespues };
}

const peor = await medirCaso('PEOR', 365, 7);
const tipico = await medirCaso('TIPICO', 90, 5);
// CONTROL de discriminación: mismos 7 ejercicios, historial CASI VACÍO (5 sesiones). Si el
// costo no cae aquí, el culpable no es el TAMAÑO del historial sino el freno de CPU×4 solo.
const ligero = await medirCaso('LIGERO-CONTROL', 5, 7);

console.log('\njsErrors:', JSON.stringify(jsErrors.slice(0, 10)));
writeFileSync(`${OUT}/resultados-cliente.json`, JSON.stringify({ peor: peor?.montaje, tipico: tipico?.montaje, results, jsErrors }, null, 2));
console.log('\nGuardado:', `${OUT}/resultados-cliente.json`);
try { ws.close(); } catch {} chrome.kill(); srv.kill();
process.exit(0);
