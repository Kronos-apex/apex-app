// _r16-v1-sesion-cliente.mjs — R16 V1: el caso REAL de todos los días — abrir AVI con la sesión
// YA iniciada (asesorado). Login UNA vez con la cuenta QA (rate limit respetado), luego se mide
// el RELOAD (no un segundo login) con CDP: bytes por red, timing hasta `_aviUpdateBusy`.
// SOLO LECTURA. Puerto CDP 9482 (rango V1: 9480-9489).
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';

const URL = 'https://app.avientrena.com/';
const PUERTO = 9482;
const CREDS = JSON.parse(readFileSync(join(homedir(), '.avi', 'e2e-creds.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${PUERTO}`,
  '--user-data-dir=' + process.env.TEMP + '/r16v1-sescli-' + Date.now(),
  '--no-first-run', '--window-size=412,915', 'about:blank'
]);
let page = null;
for (let i = 0; i < 60 && !page; i++) { try { const t = await (await fetch(`http://localhost:${PUERTO}/json/list`)).json(); page = t.find(x => x.type === 'page'); } catch {} if (!page) await sleep(300); }
if (!page) { console.log('🔴 Chrome no abrió el puerto'); chrome.kill(); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
let bytes = 0; const porTipo = {};
ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  if (m.method === 'Network.loadingFinished') {
    bytes += m.params.encodedDataLength || 0;
  }
});
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }))?.result?.value;
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Performance.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.6, mobile: true });

// 1. Primera visita CON red normal, para instalar el SW y hacer login UNA vez.
console.log('1. Primera visita (para SW + login)…');
await send('Page.navigate', { url: URL });
await sleep(6000);
let swOk = false;
for (let i = 0; i < 10 && !swOk; i++) {
  swOk = await ev(`(async()=>{try{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active)}catch(e){return false}})()`);
  if (!swOk) await sleep(1500);
}
console.log('   SW activo:', swOk);

console.log('2. Login UNA vez con la cuenta QA (asesorado)…');
await ev(`(()=>{const u=document.getElementById('lu'),p=document.getElementById('lp');
  if(u)u.value=${JSON.stringify(CREDS.email)}; if(p)p.value=${JSON.stringify(CREDS.pass)}; return 1;})()`);
await ev(`(typeof doLogin==='function')?doLogin():null`);
await sleep(7000);
const tras = JSON.parse(await ev(`JSON.stringify({pantallas:[...document.querySelectorAll('.screen')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id)})`) || '{}');
console.log('   pantallas tras login:', tras.pantallas.join(',') || '(ninguna)');
if (!tras.pantallas.includes('s-client')) { console.log('🔴 No entró como asesorado — abortando (no se reintenta el login)'); ws.close(); chrome.kill(); process.exit(1); }

// 2. Ahora medir el RELOAD (caso real: sesión ya guardada, reabrir la app).
console.log('3. Recargando (sesión ya guardada, SW ya instalado) — midiendo…');
bytes = 0;
const peticiones = [];
ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.method === 'Network.requestWillBeSent') peticiones.push({ id: m.params.requestId, url: m.params.request.url, t: m.params.timestamp });
  if (m.method === 'Network.responseReceived') {
    const p = peticiones.find(x => x.id === m.params.requestId);
    if (p) { p.status = m.params.response.status; p.mime = m.params.response.mimeType; p.fromCache = m.params.response.fromDiskCache || m.params.response.fromServiceWorker; }
  }
});
const t0 = Date.now();
await send('Page.reload', { ignoreCache: false });
let pintadoEn = null, listoEn = null, identidadEn = null;
for (let s = 0; s <= 30; s += 1) {
  await sleep(1000);
  const r = await ev(`(()=>{const l=document.getElementById('s-client');
    return {vis:!!(l&&getComputedStyle(l).display!=='none'&&!document.getElementById('avi-loading')),
      listo:!!window._aviUpdateBusy,
      id:(typeof CUR!=='undefined'&&CUR&&CUR.clientId)?String(CUR.clientId).slice(0,8):null,
      hayPlan:!!document.querySelector('#s-client .exrow, #s-client .today-hero, #cn-today-head *')};})()`);
  const t = Date.now() - t0;
  if (r.vis && pintadoEn == null) pintadoEn = t;
  if (r.id && identidadEn == null) identidadEn = t;
  if (r.listo && listoEn == null) { listoEn = t; }
  console.log(`   t=${(t/1000).toFixed(1)}s · pintado=${!!pintadoEn} · identidad=${!!r.id} · plan=${r.hayPlan} · listo=${!!listoEn} · KB=${Math.round(bytes/1024)}`);
  if (listoEn != null && r.hayPlan) break;
}
await sleep(500);

console.log('\n── RESULTADO: arranque CON sesión (asesorado QA), 2ª visita/reload ──');
console.log('pantalla pintada en (ms):', pintadoEn);
console.log('identidad del cliente cargada en (ms):', identidadEn);
console.log('arranque terminado (_aviUpdateBusy) en (ms):', listoEn);
console.log('bytes por la red en el reload (KB):', Math.round(bytes / 1024));
console.log('peticiones totales:', peticiones.length);
const noCache = peticiones.filter(p => !p.fromCache);
console.log('peticiones NO servidas de caché (red/SW real):', noCache.length);
noCache.slice(0, 40).forEach(p => console.log('   -', p.status, p.mime || '?', p.url.replace('https://app.avientrena.com/', './').replace('https://eoebhrxbokyllqalyecj.supabase.co', 'SUPABASE')));

try { ws.close(); } catch {} chrome.kill();
process.exit(0);
