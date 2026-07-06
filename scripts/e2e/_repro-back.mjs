import WebSocket from 'ws';
import { spawn } from 'node:child_process';

const PORT = 8763;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-back-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9263', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
chrome.on('error', e => { console.error('chrome', e); process.exit(1); });
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9263/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };

await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true }); // evita servir JS viejo entre recargas
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const snap = async (label) => {
  const s = await ev(`(()=>{
    const onRooms=[...document.querySelectorAll('.sroom')].filter(r=>r.classList.contains('on')).map(r=>r.id.replace('-room',''));
    const tab=((document.querySelector('#s-client .cnp.on')||{}).id||'').replace('cn-','');
    return JSON.stringify({
      ex: location.href.includes('localhost')?'in':'OUT-OF-APP',
      H: history.length,
      lay: (typeof AVINAV!=='undefined')?AVINAV.layers:'?',
      armed: (typeof AVINAV!=='undefined')?(AVINAV.exitArmed?1:0):'?',
      stk: (typeof AVINAV!=='undefined')?AVINAV.stack.length:'?',
      rooms: onRooms, tab
    });
  })()`);
  log(`    ${label.padEnd(20)} -> ${s}`);
  return s;
};
const back = async () => { await ev(`history.back()`); await sleep(500); };

async function freshLogin() {
  await send('Page.navigate', { url: APP });
  await sleep(500);
  await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
  await send('Page.navigate', { url: APP });
  await sleep(500);
  await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`, 20000);
  await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
  await ev(`doLogin()`);
  await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 20000);
  for (let k = 0; k < 8; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
  // historial sintetico SIEMPRE (sobreescribe, para que 'h0' sea valido aunque haya datos reales)
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.tier='premium';DB.history=DB.history||{};const dt=new Date();DB.history[CUR.clientId]=[{id:'h0',routineId:'r0',routineName:'Pierna',date:dt.toISOString(),startedAt:new Date(dt.getTime()-52*60000).toISOString(),durationSec:3120,kcal:331,totalVol:3200,doneSets:10,totalSets:10,exercises:[{id:'e13',muscle:'piernas',name:'Sentadilla',track:'peso_reps',sets:[{kg:'45',reps:'10',done:true}]}]}];})()`);
  await sleep(500);
}

const report = {};
try {
  // ───────── S2: Inicio -> Progreso (pestaña) -> habitacion -> mash atras ─────────
  log('\n=== S2: Inicio -> pestana Progreso -> habitacion -> ATRAS x4 ===');
  await freshLogin();
  await ev(`navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);`);
  await ev(`cnTab('cn-history',_cnTabEl('cn-history'))`); await sleep(400); // forward → stack=1
  await snap('en Progreso');
  await ev(`openSessionRoom(CUR.clientId,'h0')`); await sleep(500);
  await snap('habitacion abierta');
  await back(); await snap('ATRAS #1');
  await back(); await snap('ATRAS #2');
  await back(); await snap('ATRAS #3');
  await back(); await snap('ATRAS #4');

  // ───────── S3: abrir habitacion -> cerrar con boton "Volver" -> atras fisico ─────────
  log('\n=== S3: habitacion -> boton "< Volver" -> ATRAS fisico x2 (SOSPECHOSO) ===');
  await freshLogin();
  await ev(`navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);`);
  await ev(`openSessionRoom(CUR.clientId,'h0')`); await sleep(500);
  await snap('habitacion abierta');
  await ev(`(()=>{const b=document.querySelector('#session-room .sroom-back');if(b)b.click();})()`); await sleep(500);
  await snap('tras boton Volver');
  await back(); await snap('ATRAS #1');
  await back(); await snap('ATRAS #2');

  // ───────── S4: habitaciones ANIDADAS (sesion -> ejercicio) -> mash atras ─────────
  log('\n=== S4: anidadas (sesion -> ejercicio dentro) -> ATRAS x4 ===');
  await freshLogin();
  await ev(`navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);`);
  const Hbase = await ev(`history.length`);
  await ev(`openSessionRoom(CUR.clientId,'h0')`); await sleep(400);
  await ev(`openExerciseRoom(CUR.clientId,'e13')`); await sleep(500);
  await snap('2 habitaciones');
  report.s4_HgrewBy2 = (await ev(`history.length`)) - Hbase; // esperado 2 (una capa por habitacion)
  await back(); await snap('ATRAS #1');
  await back(); await snap('ATRAS #2');
  await back(); await snap('ATRAS #3');
  await back(); await snap('ATRAS #4');

  // ───────── S5: cerrar con el BOTON "< Volver" (ahora history.back) -> debe cerrar y descontar ─────────
  log('\n=== S5: boton "< Volver" cierra y descuenta capa ===');
  await freshLogin();
  await ev(`navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);`);
  await ev(`openSessionRoom(CUR.clientId,'h0')`); await sleep(400);
  await snap('habitacion abierta');
  await ev(`(()=>{const b=document.querySelector('#session-room .sroom-back');if(b)b.click();})()`); await sleep(500);
  await snap('tras boton Volver');
  report.s5_roomClosed = await ev(`!document.getElementById('session-room').classList.contains('on')`);
  report.s5_layers0 = await ev(`AVINAV.layers===0`);

} catch (e) { report.fatal = e.message; }
finally {
  report.jsErrors = [...new Set(jsErrors)].slice(0, 8);
  log('\n===REPORT===\n' + JSON.stringify(report, null, 2));
  ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
  await sleep(300); process.exit(0);
}
