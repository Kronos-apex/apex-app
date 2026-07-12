// Verificación E2E de v325 — AUTO-ACTUALIZACIÓN SEGURA de la app.
// v324 recargaba a la fuerza TODAS las pestañas al activar una versión nueva (navigate() en el
// SW) → podía CORTAR un entrenamiento en curso. v325: la PÁGINA decide cuándo aplicar el update
// y NUNCA en un "momento ocupado" (timer de entreno vivo, modal/overlay abierto, o escribiendo).
// Aquí se prueba de forma determinista el guard `_aviUpdateBusy()` (el corazón del fix) + el
// cableado (API expuesta) + que el sw.js ya NO fuerza el reload y sí escucha SKIP_WAITING.
// Patrón preview-SIN-login (el guard es DOM/estado puro). Check de regresión PERMANENTE.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8790;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v325-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9290', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9290/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

try {
  // El guard es un helper PURO definido en initPWA (no depende de que el SW registre — el
  // headless a veces no registra SW; en el navegador real sí). Esperar a que initPWA lo exponga.
  const ready = await waitFor(`typeof window._aviUpdateBusy==='function'`, 60000);
  if (!ready) throw new Error('no se expuso _aviUpdateBusy (¿corrió initPWA?)');

  // U1: el guard de "momento seguro" está expuesto (corazón del fix).
  check('U1 guard _aviUpdateBusy expuesto', await ev(`typeof window._aviUpdateBusy==='function'`));

  // U2: en reposo (login, sin timers/modales) NO está ocupado → sería seguro recargar.
  check('U2 en reposo _aviUpdateBusy()=false (seguro recargar)', (await ev(`window._aviUpdateBusy()`)) === false, String(await ev(`window._aviUpdateBusy()`)));

  // U3: timer de entreno VIVO → ocupado (NO recargar encima). Es el caso que rompía v324.
  let r = await ev(`(()=>{GM.restTimer=1; const b=window._aviUpdateBusy(); GM.restTimer=null; const a=window._aviUpdateBusy(); return JSON.stringify({conTimer:b,sinTimer:a});})()`);
  let o = JSON.parse(r); check('U3 timer de entreno vivo → busy=true; al parar → false', o.conTimer === true && o.sinTimer === false, r);

  // U4: overlay/capa de navegación abierta (habitación, ficha) → ocupado.
  r = await ev(`(()=>{const p=(typeof AVINAV!=='undefined')?AVINAV.layers:0; AVINAV.layers=1; const b=window._aviUpdateBusy(); AVINAV.layers=p||0; const a=window._aviUpdateBusy(); return JSON.stringify({conLayer:b,sinLayer:a});})()`);
  o = JSON.parse(r); check('U4 overlay/capa abierta → busy=true; al cerrar → false', o.conLayer === true && o.sinLayer === false, r);

  // U5: modal abierto (.mdbg.on — p.ej. el coach editando una rutina) → ocupado.
  r = await ev(`(()=>{const d=document.createElement('div');d.className='mdbg on';document.body.appendChild(d); const b=window._aviUpdateBusy(); d.remove(); const a=window._aviUpdateBusy(); return JSON.stringify({conModal:b,sinModal:a});})()`);
  o = JSON.parse(r); check('U5 modal abierto (.mdbg.on) → busy=true; al cerrar → false', o.conModal === true && o.sinModal === false, r);

  // U6: usuario escribiendo en un input → ocupado (no perder lo que teclea).
  r = await ev(`(()=>{const i=document.createElement('input');document.body.appendChild(i);i.focus(); const b=window._aviUpdateBusy(); i.blur(); i.remove(); const a=window._aviUpdateBusy(); return JSON.stringify({escribiendo:b,quieto:a});})()`);
  o = JSON.parse(r); check('U6 escribiendo en un input → busy=true; al salir → false', o.escribiendo === true && o.quieto === false, r);

  // U7: el sw.js servido ya NO fuerza el reload (sin navigate) y SÍ escucha SKIP_WAITING.
  r = await ev(`(async()=>{const t=await (await fetch('/sw.js?nocache='+Date.now())).text(); return JSON.stringify({skipWaitingMsg:/SKIP_WAITING/.test(t), sinNavigateForzado:!/c\\.navigate\\(c\\.url\\)/.test(t), cache:(t.match(/avi-v\\d+/)||['?'])[0]});})()`);
  o = JSON.parse(r); check('U7 sw.js escucha SKIP_WAITING y ya no fuerza navigate()', o.skipWaitingMsg === true && o.sinNavigateForzado === true, r);

  check('U8 sin errores JS', jsErrors.length === 0, JSON.stringify(jsErrors));

  const fails = results.filter(l => l.startsWith('FAIL'));
  log('\n' + (fails.length ? '❌ ' + fails.length + ' FALLA(S)' : '✅ TODO OK (' + results.length + '/' + results.length + ')'));
  process.exitCode = fails.length ? 1 : 0;
} catch (e) {
  log('💥 ERROR:', e.message); process.exitCode = 1;
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
  await sleep(300);
}
