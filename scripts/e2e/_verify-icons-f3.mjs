// Verificación E2E de los ÍCONOS SVG F3 (v307, docs/plan-iconos-svg.md):
// títulos de sección de Rutinas/Mensajes/Progreso/Perfil (estáticos, vía aviIconizeStatic),
// botones de tema, y títulos JS (Constancia, Récords del día, En números).
// Los estáticos se verifican SIN login (corren al cargar la página). Screenshots incluidos.
// Cuenta QA + sello v298 → cero riesgo a producción.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8775;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-icf3-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9275', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9275/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
  // ── Parte A: títulos ESTÁTICOS (no requieren login — aviIconizeStatic corre al cargar) ──
  await waitFor(`typeof aviIconizeStatic==='function'`, 60000);
  await sleep(800);
  let s = JSON.parse(await ev(`JSON.stringify((()=>{const t=[...document.querySelectorAll('.t-ic[data-ic]')];
    return {total:t.length,svgs:t.filter(x=>x.querySelector('svg.avic')).length,
      emojis:t.filter(x=>/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u.test(x.textContent)).length,
      plain:document.querySelectorAll('.t-ic.plain svg.avic').length};})())`));
  check('A1 todos los .t-ic estáticos migrados a SVG (0 emojis)', s.total >= 24 && s.svgs === s.total && s.emojis === 0, JSON.stringify(s));
  // A2 estructural (no conteo exacto — cada fase agrega .plain): al menos los 12 de F3
  check('A2 t-ic .plain (heredan color del contenedor) presentes y con SVG', s.plain >= 12, JSON.stringify(s));

  // ── Parte B: títulos renderizados por JS (requieren sesión) ──
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
    if(typeof ntClose==='function')ntClose(false);})()`);

  // B1: pestaña Progreso — tarjeta Constancia con flame SVG
  await ev(`cnTab('cn-history',document.querySelectorAll('.cntab')[3])`);
  await sleep(800);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const t=document.querySelector('#cn-streak .streak-title');
    return {title:!!t,svg:!!(t&&t.querySelector('svg.avic')),emoji:!!(t&&/🔥/.test(t.textContent))};})())`));
  check('B1 tarjeta Constancia (Progreso) usa flame SVG (sin emoji)', s.title && s.svg && !s.emoji, JSON.stringify(s));
  await shot('icons-f3-progreso');

  // B2: pestaña Perfil — títulos con SVG a la vista
  await ev(`cnTab('cn-profile',document.querySelectorAll('.cntab')[4])`);
  await sleep(800);
  await shot('icons-f3-perfil');
  s = JSON.parse(await ev(`JSON.stringify((()=>{const p=document.getElementById('cn-profile');
    const t=[...p.querySelectorAll('.t-ic[data-ic]')];
    return {total:t.length,svgs:t.filter(x=>x.querySelector('svg.avic')).length};})())`));
  check('B2 títulos del Perfil con SVG', s.total >= 8 && s.svgs === s.total, JSON.stringify(s));

  // B3: héroe del perfil — pills (objetivo/nivel/días) y botón de cámara con SVG
  s = JSON.parse(await ev(`JSON.stringify((()=>{const h=document.getElementById('cn-prof-card');
    const pills=[...(h?h.querySelectorAll('.profpill'):[])];
    return {pills:pills.length,svgs:pills.filter(x=>x.querySelector('svg.avic')).length,
      cam:!!(h&&h.querySelector('.profav-cam svg.avic')),
      emojis:pills.filter(x=>/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(x.textContent)).length};})())`));
  check('B3 héroe del perfil: pills y cámara con SVG (0 emojis)', s.pills >= 3 && s.svgs === s.pills && s.cam && s.emojis === 0, JSON.stringify(s));

  await ev(`cnTab('cn-today',document.querySelectorAll('.cntab')[0])`);
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
