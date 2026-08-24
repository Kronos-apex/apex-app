// ─────────────────────────────────────────────────────────────────────────────
// _repro-reorden-recarga.mjs — EL REORDEN SE PIERDE AL RECARGAR Y LOS PESOS SE QUEDAN
//
// EL REPORTE DEL PO (24-ago): *«cuando lanzas actualizaciones y estoy entrenando, la app se
// actualiza y si he modificado alguna rutina —ejemplo, no pude empezar con press inclinado y lo
// roté por press plano— al reiniciarse la app la rutina vuelve a su orden, y si en plano levanto
// 100 y en inclinado 70, inclinado me queda con 100 y plano con 70. Y eso le debe pasar a todo el
// que entrene.»*
//
// LA CAUSA, en una frase: **el reorden vive en MEMORIA (`CUR.todayWorking`) y su consecuencia vive
// en DISCO.** Las series se guardan por POSICIÓN (`log_<rid>_<ei>_<si>_kg`), así que al reordenar
// se intercambian también las claves (`_swapSessionKeys`) para que todo cuadre… mientras la página
// viva. En cuanto se recarga —una actualización, cerrar y abrir la app, que el sistema mate la
// pestaña— la copia de trabajo se pierde, la rutina vuelve a su orden guardado y **los pesos se
// quedan en la posición donde estaban**: cada uno acaba en el ejercicio del vecino.
// No es solo cosa de las actualizaciones: la actualización es el disparador más visible.
//
// 🔴 Y DE PASO: `_aviUpdateBusy` (app-6) decide si se puede aplicar una actualización. Mira el
// timer vivo, el foco en un campo, los modales, el cierre y el tour — pero **NO mira si la persona
// tiene un reorden sin confirmar**. Entre serie y serie, sin timer y sin foco, la recarga entra.
//
// QUÉ AFIRMA:
//   0. CONTROL — antes de recargar, cada peso está en SU ejercicio (si no, la sonda mide mal).
//   1. Tras recargar, el peso sigue en el MISMO ejercicio (es lo que hoy falla).
//   2. Tras recargar, el orden que eligió la persona se conserva.
//   3. `_aviUpdateBusy` devuelve true con un reorden sin confirmar (no se recarga encima suyo).
//
//   node scripts/e2e/_repro-reorden-recarga.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { EMAIL, PASS } from './_creds.mjs';
import { afirmador, salir } from './_afirma.mjs';

const PORT = 8804, DP = 9304, APP = `http://localhost:${PORT}/`;
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-reorden-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = afirmador('el reorden sobrevive a una recarga');

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
  '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=393,852', APP]);
async function findPage() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 25000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true });
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);

const entrar = async () => {
  await send('Page.navigate', { url: APP });
  await sleep(900);
  await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
  await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
  await ev(`doLogin()`);
  const ok = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'&&!!CUR.clientId})()`, 30000);
  for (let k = 0; k < 5; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});})()`); await sleep(110); }
  return ok;
};
if (!await entrar()) { A.ok(false, 'el login entró'); salir(A, { chrome, srv }); }
await sleep(500);

// ── Montaje ──────────────────────────────────────────────────────────────────────────────────
// 🔴 Se usa la rutina REAL de hoy, no un fixture inventado: la primera versión de esta sonda
// reescribía `DB.clients` en memoria y **la recarga la destruía** (la app vuelve a bajarse el plan
// de la nube al arrancar), así que la mitad de después medía OTRA rutina y el resultado no valía.
// Es la misma clase que «el fixture que no se parece a producción», pero por el lado de la vida
// útil: un fixture que no sobrevive al evento que estás probando no prueba nada.
const setup = await ev(`(()=>{
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c) return {err:'sin cliente'};
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  const r=(c.routines||[]).find(x=>x.day===hoy)||(c.routines||[]).find(x=>x.day==='Libre');
  if(!r) return {err:'sin rutina de hoy'};
  const exs=(r.exercises||[]).filter(Boolean);
  if(exs.length<2) return {err:'la rutina de hoy tiene menos de 2 ejercicios'};
  // Se limpia solo la sesión de ESA rutina, para no arrastrar restos de otra corrida.
  Object.keys(localStorage).forEach(k=>{ if(k.indexOf('_'+r.id+'_')>0) localStorage.removeItem(k); });
  CUR.todayWorking=null; CUR.todayDirty=false; CUR.todayOverride=null;
  renderClientToday(c);
  return {rid:r.id, ids:exs.map(e=>e.id), nombres:exs.map(e=>e.name)};
})()`);
A.ok(setup && !setup.err && setup.ids && setup.ids.length >= 2,
  'CONTROL DE MONTAJE: hay una rutina real de hoy con al menos 2 ejercicios', setup);
if (!setup || setup.err) salir(A, { chrome, srv });
const RID = setup.rid, EX0 = setup.ids[0], EX1 = setup.ids[1];
console.log('  rutina real de hoy: ' + RID + ' — [0] ' + setup.nombres[0] + ' · [1] ' + setup.nombres[1]);

// ── La persona ROTA: sube el press plano (índice 1) al primer puesto ──────────────────────────
const trasRotar = await ev(`(()=>{
  todayMoveEx(1,-1);                       // el de la posición 1 sube a la 0
  const w=CUR.todayWorking;
  return w ? w.exercises.map(e=>e.id) : null;
})()`);
A.ok(Array.isArray(trasRotar) && trasRotar[0] === EX1,
  'la persona rota: el SEGUNDO ejercicio queda de primero', trasRotar);

// ── Anota 100 en el plano (ahora índice 0) y 70 en el inclinado (índice 1) ────────────────────
await ev(`(()=>{ setLog('${RID}',0,0,'kg',100); setLog('${RID}',1,0,'kg',70); })()`);
const antes = await ev(`(()=>{
  const w=CUR.todayWorking;
  const mapa={};
  (w.exercises||[]).forEach((e,i)=>{ mapa[e.id]=localStorage.getItem('log_${RID}_'+i+'_0_kg'); });
  return {orden:w.exercises.map(e=>e.id), pesos:mapa};
})()`);
A.ok(antes && antes.pesos && antes.pesos[EX1] === '100' && antes.pesos[EX0] === '70',
  'CONTROL: antes de recargar, 100 está en el que subió y 70 en el que bajó', antes);

// ── 3 · El guard de la actualización tiene que ver este estado ────────────────────────────────
const busy = await ev(`(()=>{ try{
  return { existe: typeof window._aviUpdateBusy==='function',
           valor: (typeof window._aviUpdateBusy==='function') ? !!window._aviUpdateBusy() : null,
           working: !!CUR.todayWorking, dirty: !!CUR.todayDirty, override: !!CUR.todayOverride,
           initPWA: typeof initPWA, app6: typeof gmRebuild, seguro: location.protocol+'//'+location.hostname };
}catch(e){ return {err:e.message}; } })()`);
// 🔴 CONTROL DE ALCANCE, no una aserción: `_aviUpdateBusy` se crea DENTRO de `initPWA()`, y en
// este harness la cadena de arranque no llega a ejecutarlo (el login se hace a mano con
// `doLogin()`, sin pasar por el boot). Medido: `initPWA` existe como función pero
// `window._aviUpdateBusy` no. Así que aquí **no se puede afirmar nada sobre el guard sin mentir**
// — se imprime el estado y se dice que no se probó. El candado de que el guard MIRA el reorden
// vive en la suite (`avi.test.js`), que sí corre siempre.
// Lo que este harness sí prueba, y es lo que reportó el PO, son las tres afirmaciones de abajo.
console.log('  (el guard de actualización no se prueba aquí: ' + JSON.stringify(busy) + ')');
A.ok(!!(busy && busy.working && busy.dirty),
  'CONTROL: el estado de reorden sin confirmar SÍ está puesto (es lo que el guard tendría que ver)', busy);

// ── Y ahora la recarga: es lo que hace la actualización (`location.reload()`) ─────────────────
await ev(`location.reload()`);
await sleep(1500);
await waitFor(`!!document.getElementById('lu') || (typeof CUR!=='undefined' && !!CUR.clientId)`, 30000);
const yaDentro = await ev(`(()=>{const e=document.getElementById('s-client');return !!(e&&getComputedStyle(e).display!=='none'&&CUR.clientId);})()`);
if (!yaDentro) { if (!await entrar()) { A.ok(false, 'volvió a entrar tras la recarga'); salir(A, { chrome, srv }); } }
await sleep(900);
await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId); if(c) renderClientToday(c);})()`);
await sleep(600);

const despues = await ev(`(()=>{
  const c=DB.clients.find(x=>x.id===CUR.clientId);
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  const base=(c.routines||[]).find(r=>r.day===hoy);
  const r=(CUR.todayWorking&&CUR.todayWorking.id===base.id)?CUR.todayWorking:base;
  const mapa={};
  (r.exercises||[]).forEach((e,i)=>{ mapa[e.id]=localStorage.getItem('log_${RID}_'+i+'_0_kg'); });
  return {orden:r.exercises.map(e=>e.id), pesos:mapa};
})()`);

console.log('\n  antes de recargar : orden ' + JSON.stringify(antes.orden) + '  pesos ' + JSON.stringify(antes.pesos));
console.log('  después de recargar: orden ' + JSON.stringify(despues.orden) + '  pesos ' + JSON.stringify(despues.pesos) + '\n');

A.ok(despues && despues.pesos && despues.pesos[EX1] === '100',
  '🔴 tras recargar, los 100 kg siguen en SU ejercicio (hoy se van al del vecino)', despues.pesos);
A.ok(despues && despues.pesos && despues.pesos[EX0] === '70',
  '🔴 tras recargar, los 70 kg siguen en SU ejercicio', despues.pesos);
A.ok(despues && Array.isArray(despues.orden) && despues.orden[0] === EX1,
  '🔴 tras recargar, se conserva el orden que eligió la persona', despues.orden);

salir(A, { chrome, srv });
