// Visual: ¿qué ve el usuario parado EN la fila de la plancha al oprimir ▶?
// - ¿el banner "Aguanta" queda visible con el scroll abajo?
// - ¿la fila muestra algún estado "en curso"?
// - ¿"Saltar" durante la plancha descarta la serie sin marcar? (skipRest)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = 8767;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-plancha-vis-fixed'; // perfil persistente: reutiliza la sesión auth entre corridas
const SHOTS = 'C:/Users/KRONOS/Desktop/AVI/_shots-plancha';
mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9267', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9267/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map();
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
const shot = async name => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(r.data, 'base64')); } catch {} };

await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

await send('Page.navigate', { url: APP });
await sleep(500);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&!document.getElementById('avi-loading'))})()`, 25000);
const inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
if (!inApp) {
  await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
  await ev(`doLogin()`);
  await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 20000);
}
await sleep(2500);
for (let k = 0; k < 8; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
const logged = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
if (!logged) { log('FATAL: no se pudo entrar a la app'); ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {} process.exit(1); }

// Rutina cardio/HIIT realista (como la de Camilo/Daniel) + mood ya respondido
await ev(`(()=>{
  try{UD.loadOwn=async()=>null;}catch(e){}
  const c=DB.clients.find(x=>x.id===CUR.clientId);
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const today=days[new Date().getDay()];
  const lib=id=>JSON.parse(JSON.stringify(DB.exercises.find(e=>e.id===id)));
  const jj=lib('e76'); const hi=lib('e74')||lib('e189'); const plk=lib('e17');
  c.routines=[{id:'rVis', day:today, name:'Cardio + Core', exercises:[jj,hi,plk].filter(Boolean)}];
  CUR.todayWorking=null; CUR.todayOverride=null;
  try{setTodayMood(CUR.clientId,'bien');}catch(e){}
  Object.keys(localStorage).filter(k=>k.includes('rVis')).forEach(k=>localStorage.removeItem(k));
  navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);
  renderClientToday(c);
  return (CUR.activeRoutine||{}).id;
})()`);
await sleep(400);

// El índice de la plancha en la rutina inyectada = 2
// 1) scroll hasta la plancha
await ev(`document.getElementById('block_2').scrollIntoView({block:'center'})`);
await sleep(400);
await shot('v1-plancha-antes');

// 2) oprimir ▶ (30s reales) y mirar la pantalla parado en la fila
await ev(`(()=>{const row=document.getElementById('setrow_2_0');row.querySelector('.timer-go').click();})()`);
await sleep(1500);
await shot('v2-plancha-hold-scrolled');
const vis = await ev(`(()=>{
  const b=document.getElementById('rest-banner');
  const r=b.getBoundingClientRect();
  const row=document.getElementById('setrow_2_0').getBoundingClientRect();
  return JSON.stringify({bannerTop:r.top,bannerBottom:r.bottom,bannerVisible:r.bottom>0&&r.top<844,rowTop:row.top,
    title:(document.querySelector('#rest-banner .resttitle')||{}).textContent,
    rowClass:document.getElementById('setrow_2_0').className});
})()`);
log('hold visible check: ' + vis);

// 3) "Saltar" durante la plancha: ¿se descarta la serie sin marcar?
await ev(`(()=>{const sk=document.querySelector('#rest-banner .restskip');if(sk)sk.click();})()`);
await sleep(500);
const afterSkip = await ev(`JSON.stringify({done:isDone('rVis',2,0),banner:!document.getElementById('rest-banner').classList.contains('hide')})`);
log('tras Saltar durante hold: ' + afterSkip);
await shot('v3-plancha-tras-saltar');

// 4) HIIT: ¿qué ve el usuario en la tarjeta HIIT mientras corre? (scroll en la tarjeta)
await ev(`document.getElementById('block_1').scrollIntoView({block:'center'})`);
await sleep(300);
await ev(`(()=>{const b=document.getElementById('hiit-start_1');if(b)b.click();})()`);
await sleep(1500);
await shot('v4-hiit-encurso');
const hiitVis = await ev(`JSON.stringify({phase:(document.getElementById('hiit-phase_1')||{}).textContent,disp:(document.getElementById('hiit-display_1')||{}).textContent})`);
log('hiit check: ' + hiitVis);

ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
await sleep(300); process.exit(0);
