// ─────────────────────────────────────────────────────────────────────────────
// _repro-orden-plan.mjs — EL COACH REORDENA EL PLAN Y LOS PESOS SE QUEDAN EN LA POSICIÓN
//
// EL REPORTE DEL PO (8-nov): *«al mover el orden de los ejercicios en las rutinas los pesos no se
// mueven con el ejercicio, entonces si subo o cambio press de banca por elevaciones laterales los
// pesos de press se quedan en elevaciones laterales.»*
//
// LA CAUSA: los kilos de la vez pasada viven en el teléfono que entrena, por POSICIÓN
// (`log_<rid>_<ei>_<si>_kg`), y se heredan al día siguiente como sugerencia. El reorden del EDITOR
// (`moveEx`, app-3) solo cambia el orden del plan —y casi siempre en OTRO teléfono, el del coach—,
// así que cuando el plan nuevo llega, cada peso queda en el ejercicio que ahora ocupa su puesto.
// El reorden de «Hoy» (`todayMoveEx`) sí mueve las claves; el del plan no las puede mover.
//
// QUÉ AFIRMA (se simula la llegada del plan reordenado, sin escribir en la nube):
//   0. CONTROL — antes del reorden, 100 está en el 1.º y 20 en el 2.º.
//   1. Con el plan reordenado, los 100 siguen en SU ejercicio (hoy se quedan en el puesto 1).
//   2. Y los 20 también.
//   3. Un ejercicio que el coach QUITÓ del plan no le deja sus kilos al que entra en su puesto.
//
//   node scripts/e2e/_repro-orden-plan.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { EMAIL, PASS } from './_creds.mjs';
import { afirmador, salir } from './_afirma.mjs';

const PORT = 8806, DP = 9306, APP = `http://localhost:${PORT}/`;
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-ordenplan-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const A = afirmador('los pesos siguen a su ejercicio cuando el coach reordena el plan');

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

// ── Montaje sobre la rutina REAL de hoy (gotcha v538: un fixture que no sobrevive no prueba nada) ──
const setup = await ev(`(()=>{
  const c=DB.clients.find(x=>x.id===CUR.clientId); if(!c) return {err:'sin cliente'};
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  // La de hoy; si hoy no toca (domingo, festivo), la primera con 3+ ejercicios abierta desde
  // «Mis rutinas» (renderClientToday con la rutina elegida), el mismo camino de la pantalla «Hoy».
  const con3=x=>x&&(x.exercises||[]).filter(Boolean).length>=3;
  const r=[(c.routines||[]).find(x=>x.day===hoy)].concat(c.routines||[]).find(con3);
  if(!r) return {err:'ninguna rutina real con 3 ejercicios'};
  const exs=(r.exercises||[]).filter(Boolean);
  Object.keys(localStorage).forEach(k=>{ if(k.indexOf('_'+r.id+'_')>0) localStorage.removeItem(k); });
  CUR.todayWorking=null; CUR.todayDirty=false; CUR.todayOverride=null;
  localStorage.removeItem('work_'+r.id);
  renderClientToday(c,r);
  // Los kilos de «la vez pasada»: 100 en el 1.º, 20 en el 2.º y 50 en el 3.º.
  setLog(r.id,0,0,'kg',100); setLog(r.id,1,0,'kg',20); setLog(r.id,2,0,'kg',50);
  renderClientToday(c,r);
  return {rid:r.id, ids:exs.map(e=>e.id), nombres:exs.map(e=>e.name)};
})()`);
A.ok(setup && !setup.err && setup.ids && setup.ids.length >= 3,
  'CONTROL DE MONTAJE: hay una rutina real con al menos 3 ejercicios', setup);
if (!setup || setup.err) salir(A, { chrome, srv });
const RID = setup.rid, [EX0, EX1, EX2] = setup.ids;
console.log('  rutina real: ' + RID + ' — [0] ' + setup.nombres[0] + ' · [1] ' + setup.nombres[1] + ' · [2] ' + setup.nombres[2]);

const pesos = `(()=>{
  const c=DB.clients.find(x=>x.id===CUR.clientId);
  const r=(c.routines||[]).find(x=>x.id==='${RID}');
  const mapa={}; (r.exercises||[]).forEach((e,i)=>{ mapa[e.id]=localStorage.getItem('log_${RID}_'+i+'_0_kg'); });
  return {orden:r.exercises.map(e=>e.id), pesos:mapa};
})()`;
// CONTROL DE ALCANCE: la reubicación tiene que estar cargada y haber anotado los puestos; si no,
// un rojo de abajo no distingue «la regla falla» de «el código no llegó».
const alcance = await ev(`(()=>({
  remap: typeof remapSessionKeysToOwners, pura: typeof sessionKeyRemap,
  anotados: Object.keys(localStorage).filter(k=>k.indexOf('exid_${RID}_')===0).sort().map(k=>k+'='+localStorage.getItem(k)),
}))()`);
console.log('  alcance: ' + JSON.stringify(alcance));
A.ok(alcance && alcance.remap === 'function' && alcance.pura === 'function' && alcance.anotados.length >= 3,
  'CONTROL: la reubicación está cargada y anotó de qué ejercicio es cada puesto', alcance);
const antes = await ev(pesos);
A.ok(antes && antes.pesos[EX0] === '100' && antes.pesos[EX1] === '20',
  'CONTROL: antes del reorden, 100 está en el 1.º y 20 en el 2.º', antes);

// ── Llega el plan que el coach reordenó en SU teléfono: el 2.º sube al primer puesto ─────────────
// (Solo en memoria, como cuando baja la sincronización: no se escribe nada en la nube.)
await ev(`(()=>{
  const c=DB.clients.find(x=>x.id===CUR.clientId);
  const r=c.routines.find(x=>x.id==='${RID}');
  const t=r.exercises[0]; r.exercises[0]=r.exercises[1]; r.exercises[1]=t;
  renderClientToday(c,r);
})()`);
const despues = await ev(pesos);
console.log('\n  antes  : ' + JSON.stringify(antes.pesos));
console.log('  después: ' + JSON.stringify(despues.pesos) + '\n');
A.ok(despues && despues.pesos[EX0] === '100',
  '🔴 con el plan reordenado, los 100 kg siguen en SU ejercicio (hoy se quedan en el puesto 1)', despues);
A.ok(despues && despues.pesos[EX1] === '20',
  '🔴 con el plan reordenado, los 20 kg siguen en SU ejercicio', despues);

// ── El coach QUITA el 3.º y pone otro en su puesto: el nuevo no hereda los 50 kg ──────────────────
const quitado = await ev(`(()=>{
  const c=DB.clients.find(x=>x.id===CUR.clientId);
  const r=c.routines.find(x=>x.id==='${RID}');
  const usados=new Set(r.exercises.map(e=>e.id));
  const otro=(DB.exercises||[]).find(e=>e&&e.id&&!usados.has(e.id)&&e.type!=='cardio');
  if(!otro) return {err:'sin ejercicio libre en el catálogo'};
  r.exercises[2]={...otro,sets:3,reps:10};
  renderClientToday(c,r);
  return {nuevo:otro.id, kg:localStorage.getItem('log_${RID}_2_0_kg')};
})()`);
A.ok(quitado && !quitado.err && !quitado.kg,
  '🔴 el ejercicio que entra en el puesto de uno QUITADO no hereda sus kilos', quitado);

salir(A, { chrome, srv });
