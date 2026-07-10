// Verificación E2E de los ÍCONOS SVG F2 (v306, docs/plan-iconos-svg.md):
// pantalla Hoy — botón ⚡ QW, chip de racha, tarjetas de la biblioteca, nudge de push,
// banner de descanso. Con screenshots para la revisión visual obligatoria.
// Cuenta QA + sello v298 → cero riesgo a producción.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8774;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-icf2-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9274', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9274/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/');
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch {} };
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
  for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}
    localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));
    // El reintento del tour (v305) pudo abrirlo entre que ocultamos la bienvenida y
    // marcamos lo visto → cerrarlo para que no tape los screenshots de esta fase.
    if(typeof ntClose==='function')ntClose(false);
    const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);
  await sleep(600);

  // I1: botón "¿Hoy quieres algo distinto?" con bolt SVG (no emoji)
  let s = JSON.parse(await ev(`JSON.stringify((()=>{const ic=document.querySelector('#qw-entry .qw-entry-ic');
    return {svg:!!(ic&&ic.querySelector('svg.avic')),emoji:!!(ic&&/⚡/.test(ic.textContent))};})())`));
  check('I1 botón QW de Hoy usa bolt SVG (sin emoji)', s.svg && !s.emoji, JSON.stringify(s));

  // I2: chip de racha del saludo con SVG (flame o target según estado)
  s = JSON.parse(await ev(`JSON.stringify((()=>{const ch=document.querySelector('#cn-today-head .streak-chip');
    return {svg:!!(ch&&ch.querySelector('svg.avic')),emoji:!!(ch&&/🔥|💪/.test(ch.textContent))};})())`));
  check('I2 chip de racha usa SVG (sin emoji)', s.svg && !s.emoji, JSON.stringify(s));

  // I3: nudge de push con campana SVG. En headless el permiso puede no estar en
  // 'default' y _pushCtx depende del camino auth → se fuerzan ambos (solo probamos el HTML).
  await ev(`(()=>{try{Object.defineProperty(window,'Notification',{value:{permission:'default'},configurable:true});}catch(e){}
    try{_pushCtx=_pushCtx||{clientId:CUR.clientId};}catch(e){}
    try{localStorage.removeItem('ax_push_snooze_'+CUR.clientId);}catch(e){}})()`);
  await ev(`renderPushNudge()`);
  await sleep(200);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const el=document.getElementById('cn-push-nudge');
    const b=el&&el.querySelector('.push-nudge-txt b');
    return {rendered:!!(el&&el.innerHTML.trim()),svg:!!(b&&b.querySelector('svg.avic')),emoji:!!(b&&/🔔/.test(b.textContent))};})())`));
  check('I3 nudge de push usa campana SVG (sin emoji)', s.rendered && s.svg && !s.emoji, JSON.stringify(s));
  await shot('icons-f2-hoy');

  // I4: las 7 tarjetas de la biblioteca QW con chip SVG cada una
  await ev(`openQuickWorkouts()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const ics=[...document.querySelectorAll('#quickwo-body .qw-card-ic')];
    return {cards:ics.length,svgs:ics.filter(i=>i.querySelector('svg.avic')).length,emojis:ics.filter(i=>/[\u{1F300}-\u{1FAFF}]/u.test(i.textContent)).length};})())`));
  check('I4 las 7 tarjetas QW usan chip SVG (0 emojis)', s.cards === 7 && s.svgs === 7 && s.emojis === 0, JSON.stringify(s));
  await shot('icons-f2-biblioteca');
  await ev(`(()=>{if(typeof closeQuickRoom==='function')closeQuickRoom();try{history.back();}catch(e){}})()`);
  await sleep(400);

  // I5: banner de día de descanso con luna SVG (cliente sin rutina para hoy)
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    const fake={...c,routines:[{id:'zz_rest_probe',name:'Prueba',day:'NoExiste',exercises:[]}]};
    renderClientToday(fake);})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.querySelector('#cn-today-body .avi-restbnr');
    return {banner:!!b,svg:!!(b&&b.querySelector('svg.avic')),emoji:!!(b&&/💤/.test(b.textContent))};})())`));
  check('I5 banner de descanso usa luna SVG (sin emoji)', s.banner && s.svg && !s.emoji, JSON.stringify(s));
  await shot('icons-f2-descanso');
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);
  await sleep(300);

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
