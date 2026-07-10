// Verificación E2E de v313 (estudio de interfaz, mejoras 1 y 2 aprobadas por Camilo):
// (O) orden de "Hoy": día de entreno → el guiado ARRIBA del pliegue; descanso → orden clásico.
// (S) cierre compartible: botón en #workout-finish, wfShare genera imagen sin errores.
// Cuenta QA + sello v298 → cero riesgo a producción.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8782;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-v313-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9282', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9282/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
  if (!inApp) throw new Error('login no completó — probable rate limit de qa-harness; espera ~4-5 min y reintenta');
  await sleep(2500);
  for (let k = 0; k < 6; k++) { await ev(`(()=>{try{hideClientWelcome();}catch(e){}['data-ob','cwelcome','m-fsintro','m-textsize'].forEach(i=>{const e=document.getElementById(i);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';try{localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));ntClose(false);}catch(e){}})()`); await sleep(150); }
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}})()`);

  const orderOf = `(()=>{const kids=[...document.getElementById('cn-today').children].map(x=>x.id);
    return {body:kids.indexOf('cn-today-body'),qw:kids.indexOf('qw-entry'),hab:kids.indexOf('cn-habits'),push:kids.indexOf('cn-push-nudge')};})()`;

  // O1: DÍA DE ENTRENO → guiado antes que agua/rápidos/recordatorios
  await ev(`(()=>{const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const press={...DB.exercises.find(e=>e.id==='e83'),sets:2,reps:12};
    c.routines=[{id:'rV313',name:'Orden v313',day:days[new Date().getDay()],exercises:[press]}];
    renderClientToday(c);})()`);
  await sleep(800);
  let s = JSON.parse(await ev(`JSON.stringify(${orderOf})`));
  check('O1 día de entreno: guiado ANTES de agua, rápidos y recordatorios', s.body >= 0 && s.body < s.hab && s.hab < s.qw && s.qw < s.push, JSON.stringify(s));
  await shot('v313-hoy-entreno');

  // O2: DÍA DE DESCANSO → orden clásico (rápidos y agua antes del banner)
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    c.routines=[{id:'rV313b',name:'X',day:'NoExiste',exercises:[]}];
    renderClientToday(c);})()`);
  await sleep(600);
  s = JSON.parse(await ev(`JSON.stringify(${orderOf})`));
  check('O2 día de descanso: orden clásico (rápidos arriba, banner abajo)', s.qw < s.hab && s.hab < s.body, JSON.stringify(s));

  // S1: botón Compartir presente en el cierre + wfShare corre sin errores con datos fake
  s = JSON.parse(await ev(`JSON.stringify((()=>{const b=document.querySelector('#workout-finish .wf-share');
    return {btn:!!b,fn:typeof wfShare==='function'};})())`));
  check('S1 botón "Compartir mi entreno" presente y wfShare definida', s.btn && s.fn, JSON.stringify(s));

  // S2: wfShare con datos → genera blob (interceptamos toBlob para no descargar)
  s = await ev(`(async()=>{
    _wfShareData={name:'QA',rname:'Full-Body',fecha:'jueves, 10 de julio',
      chips:[['Duración','42:10'],['Calorías','310 kcal'],['Series','12/12'],['Volumen','2.450 kg']],
      prs:[{name:'Press banca',val:60,unit:'kg',reps:8}]};
    let got=null;
    const orig=HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob=function(cb){got={w:this.width,h:this.height};cb(new Blob(['x'],{type:'image/png'}));};
    const origShare=navigator.share; const origCan=navigator.canShare;
    try{ Object.defineProperty(navigator,'canShare',{value:()=>false,configurable:true}); }catch(e){}
    const origCreate=document.createElement.bind(document);
    let clicked=false;
    document.createElement=t=>{const el=origCreate(t);if(t==='a'){el.click=()=>{clicked=true;};}return el;};
    try{ wfShare(); }catch(e){ return JSON.stringify({err:String(e)}); }
    await new Promise(r=>setTimeout(r,300));
    HTMLCanvasElement.prototype.toBlob=orig; document.createElement=origCreate;
    return JSON.stringify({canvas:got,fallbackDownload:clicked});
  })()`); s = typeof s==='string'?JSON.parse(s):s;
  // S3: imagen REAL del share para la revisión visual (gancho _wfLastCanvas)
  const dataUrl = await ev(`window._wfLastCanvas?window._wfLastCanvas.toDataURL('image/png'):''`);
  if (dataUrl && dataUrl.startsWith('data:image/png')) {
    writeFileSync(SHOTDIR + '/v313-share-img.png', Buffer.from(dataUrl.split(',')[1], 'base64'));
    log('  shot -> ' + SHOTDIR + '/v313-share-img.png');
  }
  check('S3 imagen del share generada (gancho _wfLastCanvas)', !!dataUrl && dataUrl.length > 20000, 'len=' + (dataUrl||'').length);
  check('S2 wfShare dibuja el lienzo 1080×1920 y usa el respaldo de descarga', s.canvas && s.canvas.w === 1080 && s.canvas.h === 1920 && s.fallbackDownload, JSON.stringify(s));

  // limpieza: rutinas del QA quedan como estaban (solo memoria — sellado v298)
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
