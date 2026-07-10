// Verificación E2E del HIIT RÁPIDO CONFIGURABLE (v301, pedido Camilo 2026-07-09):
// preset "HIIT en Máquina" + mini-modal rondas/trabajo/descanso antes de empezar.
// Cuenta QA + sello v298 → cero riesgo a producción.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8772;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-qwcfg-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9272', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9272/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x='') => { const line = (c?'OK ':'FAIL ') + n + (x?' — '+x:''); results.push(line); log('  ' + line); };

try {
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function'&&!document.getElementById('avi-loading'))})()`, 60000);
  let inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  if (!inApp) {
    await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
    await ev(`doLogin()`);
    await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 60000);
  }
  inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none'&&CUR&&CUR.clientId)})()`);
  if (!inApp) throw new Error('login no completó — probable rate limit de qa-harness; espera ~2-3 min y reintenta');
  await sleep(2500);
  for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}
    Object.keys(localStorage).filter(k=>k.includes('qw_hiit_maquina')).forEach(k=>localStorage.removeItem(k));})()`);

  // Q1: la biblioteca muestra el preset nuevo de primero
  await ev(`openQuickWorkouts()`);
  await sleep(500);
  let s = JSON.parse(await ev(`JSON.stringify((()=>{const room=document.getElementById('quickwo-room');
    const first=document.querySelector('#quickwo-body .qw-card .qw-card-nm');
    return {roomOn:room.classList.contains('on'),first:(first||{}).textContent,cards:document.querySelectorAll('#quickwo-body .qw-card').length};})())`));
  check('Q1 biblioteca abierta con "HIIT en Máquina" de primero (7 presets)', s.roomOn && /Máquina/.test(s.first||'') && s.cards === 7, JSON.stringify(s));

  // Q2: tocar el preset HIIT abre el mini-modal PRELLENADO (10 rondas · 30s · 15s)
  await ev(`startQuickWorkout('qw_hiit_maquina')`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({on:document.getElementById('m-qwcfg').classList.contains('on'),
    name:(document.getElementById('qwcfg-name')||{}).textContent,
    r:(document.getElementById('qwcfg-rounds')||{}).value,w:(document.getElementById('qwcfg-work')||{}).value,p:(document.getElementById('qwcfg-rest')||{}).value})`));
  check('Q2 mini-modal abre prellenado con el preset (10/30/15)', s.on && /Máquina/.test(s.name||'') && s.r === '10' && s.w === '30' && s.p === '15', JSON.stringify(s));

  // Q3: atrás con el modal abierto → cierra SOLO el modal, la biblioteca sigue
  s = JSON.parse(await ev(`JSON.stringify({closed:_aviCloseTopOverlay(),modal:document.getElementById('m-qwcfg').classList.contains('on'),room:document.getElementById('quickwo-room').classList.contains('on')})`));
  check('Q3 atrás cierra el modal y deja la biblioteca abierta', s.closed === true && !s.modal && s.room, JSON.stringify(s));

  // Q4: configurar 4 rondas · 20s · 10s → empezar → guiado embebido con la tarjeta HIIT a la medida
  await ev(`startQuickWorkout('qw_hiit_maquina')`);
  await sleep(300);
  await ev(`(()=>{document.getElementById('qwcfg-rounds').value='4';document.getElementById('qwcfg-work').value='20';document.getElementById('qwcfg-rest').value='10';qwStartConfigured();})()`);
  await sleep(1200);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const modal=document.getElementById('m-qwcfg').classList.contains('on');
    const room=document.getElementById('quickwo-room').classList.contains('on');
    const ex=GM.exercises&&GM.exercises[0];
    const cfgLine=(document.querySelector('#gm-body .gm-ex-card div[style*="JetBrains"]')||{}).textContent||'';
    const disp=(document.getElementById('gm-hiit-disp-0')||{}).textContent;
    return {modal,room,name:GM.routine&&GM.routine.name,sets:ex&&ex.sets,work:ex&&ex.hiit&&ex.hiit.work,rest:ex&&ex.hiit&&ex.hiit.rest,disp,cfgLine:cfgLine.slice(0,40)};})())`));
  check('Q4 arranca con 4 rondas · 20s/10s (modal y sala cerrados, guiado con la config)', !s.modal && !s.room && /Máquina/.test(s.name||'') && s.sets === 4 && s.work === 20 && s.rest === 10 && s.disp === '20', JSON.stringify(s));

  // Q5: valores basura → clamps de cordura (999 rondas → 20; 3s trabajo → 10)
  await ev(`(()=>{navReset('cn-today');const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);
  await sleep(400);
  await ev(`startQuickWorkout('qw_hiit_maquina')`);
  await sleep(300);
  await ev(`(()=>{document.getElementById('qwcfg-rounds').value='999';document.getElementById('qwcfg-work').value='3';document.getElementById('qwcfg-rest').value='';qwStartConfigured();})()`);
  await sleep(1200);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const ex=GM.exercises&&GM.exercises[0];
    return {sets:ex&&ex.sets,work:ex&&ex.hiit&&ex.hiit.work,rest:ex&&ex.hiit&&ex.hiit.rest};})())`));
  check('Q5 basura → clamps (999→20 rondas, 3→10s trabajo, vacío→15s default)', s.sets === 20 && s.work === 10 && s.rest === 15, JSON.stringify(s));

  // Q6: un preset SIN HIIT arranca directo, sin modal
  await ev(`(()=>{navReset('cn-today');const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);
  await sleep(400);
  await ev(`startQuickWorkout('qw_abs_casa')`);
  await sleep(1000);
  s = JSON.parse(await ev(`JSON.stringify({modal:document.getElementById('m-qwcfg').classList.contains('on'),name:GM.routine&&GM.routine.name})`));
  check('Q6 preset sin HIIT (Abdomen) arranca directo sin modal', !s.modal && /Abdomen/.test(s.name||''), JSON.stringify(s));

  // limpieza de claves de sesión de los presets usados
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('qw_hiit_maquina')||k.includes('qw_abs_casa')).forEach(k=>localStorage.removeItem(k));})()`);

  log('\njsErrors: ' + JSON.stringify(jsErrors));
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  log('\n' + (fails === 0 && jsErrors.length === 0 ? 'TODO OK' : fails + ' FALLA(S)'));
  process.exitCode = (fails === 0 && jsErrors.length === 0) ? 0 : 1;
} catch (e) {
  log('ERROR: ' + (e && e.message));
  process.exitCode = 1;
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
}
