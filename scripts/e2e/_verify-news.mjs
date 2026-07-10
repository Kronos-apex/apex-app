// Verificación E2E de la tarjeta de NOVEDADES (v302, pedido Camilo 2026-07-09):
// "¿Qué hay de nuevo?" descartable en Hoy, gateada por ax_news_seen (por dispositivo).
// Cuenta QA + sello v298 → cero riesgo a producción.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8773;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-news-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9273', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9273/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = 'C:/Users/KRONOS/AppData/Local/Temp/claude/C--Users-KRONOS/40941d22-8542-4c7c-9e7a-88c3e84720fc/scratchpad';
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); } catch {} };
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
    localStorage.removeItem('ax_news_seen');
    const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);
  await sleep(500);

  // N1: tour abierto con la slide 1 (la novedad más vieja sin ver), pasos y dots
  let s = JSON.parse(await ev(`JSON.stringify({open:!document.getElementById('news-tour').classList.contains('hidden'),
    title:(document.querySelector('#nt-body .nt-title')||{}).textContent,
    pill:(document.querySelector('#nt-body .nt-pill')||{}).textContent,
    steps:document.querySelectorAll('#nt-body .nt-step').length,
    dots:document.querySelectorAll('#nt-dots .nt-dot').length,
    next:(document.getElementById('nt-next')||{}).textContent,
    chip:!!document.querySelector('#nt-body .nt-chip svg')})`));
  await shot('news-tour-slide1');
  check('N1 tour abre en slide 1 (plancha) con pill NUEVO, 3 pasos, 3 dots e icono SVG', s.open && /plancha/i.test(s.title||'') && s.pill === 'NUEVO' && s.steps === 3 && s.dots === 3 && /Siguiente/.test(s.next||'') && s.chip, JSON.stringify(s));

  // N2: avanzar hasta la ultima slide → boton "Listo" + CTA de deep-link
  await ev(`ntNext()`); await ev(`ntNext()`);
  s = JSON.parse(await ev(`JSON.stringify({title:(document.querySelector('#nt-body .nt-title')||{}).textContent,
    next:(document.getElementById('nt-next')||{}).textContent,
    cta:(document.querySelector('#nt-body .nt-cta')||{}).textContent,
    dotOn:[...document.querySelectorAll('#nt-dots .nt-dot')].findIndex(d=>d.classList.contains('on'))})`));
  await shot('news-tour-slide3');
  check('N2 ultima slide (HIIT) con "Listo" y CTA "Probarlo ahora"', /HIIT/i.test(s.title||'') && /Listo/.test(s.next||'') && /Probarlo/.test(s.cta||'') && s.dotOn === 2, JSON.stringify(s));

  // N3: "Listo" cierra y marca la ultima version vista
  await ev(`ntNext()`);
  s = JSON.parse(await ev(`JSON.stringify({open:!document.getElementById('news-tour').classList.contains('hidden'),seen:localStorage.getItem('ax_news_seen'),latest:String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0))})`));
  check('N3 Listo → tour cerrado, ax_news_seen = ultima version', !s.open && s.seen === s.latest, JSON.stringify(s));

  // N4: re-render de Hoy no lo reabre
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({open:!document.getElementById('news-tour').classList.contains('hidden')})`));
  check('N4 re-render no lo reabre', !s.open, JSON.stringify(s));

  // N5: visto parcial (v300) → tour de UNA slide (v301) — y el atras lo cierra marcando visto
  await ev(`(()=>{localStorage.setItem('ax_news_seen','300');renderNewsCard();})()`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify({open:!document.getElementById('news-tour').classList.contains('hidden'),dots:document.querySelectorAll('#nt-dots .nt-dot').length,title:(document.querySelector('#nt-body .nt-title')||{}).textContent})`));
  check('N5 visto parcial → tour con SOLO la novedad v301 (HIIT)', s.open && s.dots === 1 && /HIIT/i.test(s.title||''), JSON.stringify(s));
  s = JSON.parse(await ev(`JSON.stringify({closed:_aviCloseTopOverlay(),open:!document.getElementById('news-tour').classList.contains('hidden'),seen:localStorage.getItem('ax_news_seen')})`));
  check('N6 atras cierra el tour y marca visto', s.closed === true && !s.open && s.seen === '301', JSON.stringify(s));

  // N7: CTA deep-link — cierra el tour y abre la biblioteca de Entrenamientos rapidos
  await ev(`(()=>{localStorage.setItem('ax_news_seen','300');renderNewsCard();})()`);
  await sleep(300);
  await ev(`ntCta()`);
  await sleep(600);
  s = JSON.parse(await ev(`JSON.stringify({open:!document.getElementById('news-tour').classList.contains('hidden'),room:document.getElementById('quickwo-room').classList.contains('on'),seen:localStorage.getItem('ax_news_seen')})`));
  check('N7 CTA "Probarlo ahora" cierra el tour y abre los Entrenamientos rapidos', !s.open && s.room && s.seen === '301', JSON.stringify(s));
  await ev(`(()=>{try{history.back();}catch(e){} localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));})()`);
  await sleep(400);

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
