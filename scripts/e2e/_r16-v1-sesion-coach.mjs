// _r16-v1-sesion-coach.mjs — R16 V1: el arranque del COACH con sesión ya iniciada (2ª visita/
// reload) + cuánto baja `UD.loadCoachClients()` (todas las filas de sus asesorados: profile,
// routines, history, msgs, bodyweight — SIN fotos/prs/medidas/nutrition, que son carga perezosa).
// Login UNA vez con la cuenta QA de coach (rate limit respetado). SOLO LECTURA. Puerto CDP 9484.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';

const URL = 'https://app.avientrena.com/';
const PUERTO = 9484;
// La cuenta del coach QA sale de ~/.avi (patrón de _verify-rls-aislamiento). JAMÁS escrita aquí: una
// versión anterior de este archivo la traía en claro y quedó en el repo público (29-sep, GitGuardian).
const _qa = [...readFileSync(join(homedir(), '.avi', 'qa-accounts.txt'), 'utf8')
  .matchAll(/email:\s*(\S+)\s*\r?\n\s*pass:\s*(\S+)/g)];
if (_qa.length < 2) { console.log('🔴 no encontré la cuenta del coach QA en ~/.avi/qa-accounts.txt'); process.exit(1); }
const CREDS = { email: _qa[1][1], pass: _qa[1][2] };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${PUERTO}`,
  '--user-data-dir=' + process.env.TEMP + '/r16v1-sescoach-' + Date.now(),
  '--no-first-run', '--window-size=412,915', 'about:blank'
]);
let page = null;
for (let i = 0; i < 60 && !page; i++) { try { const t = await (await fetch(`http://localhost:${PUERTO}/json/list`)).json(); page = t.find(x => x.type === 'page'); } catch {} if (!page) await sleep(300); }
if (!page) { console.log('🔴 Chrome no abrió el puerto'); chrome.kill(); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
const reqs = new Map();
let trackear = false;
ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  if (!trackear) return;
  if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, { url: m.params.request.url, method: m.params.request.method });
  if (m.method === 'Network.responseReceived') { const r = reqs.get(m.params.requestId); if (r) r.status = m.params.response.status; }
  if (m.method === 'Network.loadingFinished') { const r = reqs.get(m.params.requestId); if (r) r.bytes = m.params.encodedDataLength || 0; }
});
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }))?.result?.value;
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Performance.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.6, mobile: true });

console.log('1. Primera visita (SW + login del coach QA)…');
await send('Page.navigate', { url: URL });
await sleep(6000);
let swOk = false;
for (let i = 0; i < 10 && !swOk; i++) {
  swOk = await ev(`(async()=>{try{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active)}catch(e){return false}})()`);
  if (!swOk) await sleep(1500);
}
console.log('   SW activo:', swOk);

console.log('2. Login UNA vez con la cuenta QA (coach)…');
await ev(`(()=>{const u=document.getElementById('lu'),p=document.getElementById('lp');
  if(u)u.value=${JSON.stringify(CREDS.email)}; if(p)p.value=${JSON.stringify(CREDS.pass)}; return 1;})()`);
await ev(`(typeof doLogin==='function')?doLogin():null`);
await sleep(8000);
const tras = JSON.parse(await ev(`JSON.stringify({pantallas:[...document.querySelectorAll('.screen')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id)})`) || '{}');
console.log('   pantallas tras login:', tras.pantallas.join(',') || '(ninguna)');
if (!tras.pantallas.includes('s-coach')) { console.log('🔴 No entró como coach — abortando (no se reintenta el login)'); ws.close(); chrome.kill(); process.exit(1); }

// Cuántos asesorados tiene el coach QA (para poner el peso en contexto).
const nClientes = await ev(`(typeof DB!=='undefined'&&DB.clients)?DB.clients.length:'?'`);
console.log('   asesorados del coach QA:', nClientes);

// 3. RELOAD — medir el arranque del coach con sesión guardada (caso real).
console.log('3. Recargando (sesión ya guardada, SW instalado) — midiendo boot + loadCoachClients…');
reqs.clear();
trackear = true;
const t0 = Date.now();
await send('Page.reload', { ignoreCache: false });
let pintadoEn = null, listoEn = null, identidadEn = null, panelEn = null;
for (let s = 0; s <= 25; s += 1) {
  await sleep(1000);
  const r = await ev(`(()=>{const l=document.getElementById('s-coach');
    return {vis:!!(l&&getComputedStyle(l).display!=='none'&&!document.getElementById('avi-loading')),
      listo:!!window._aviUpdateBusy,
      n:(typeof DB!=='undefined'&&DB.clients)?DB.clients.length:null,
      panel:!!document.querySelector('#p-home,#p-clients')};})()`);
  const t = Date.now() - t0;
  if (r.vis && pintadoEn == null) pintadoEn = t;
  if (r.n != null && identidadEn == null) identidadEn = t;
  if (r.listo && listoEn == null) listoEn = t;
  if (r.panel && panelEn == null) panelEn = t;
  console.log(`   t=${(t/1000).toFixed(1)}s · pintado=${!!pintadoEn} · clientes=${r.n} · listo=${!!listoEn} · panel=${!!panelEn}`);
  if (listoEn != null && r.panel) break;
}
await sleep(800);

console.log('\n── RESULTADO: arranque CON sesión (COACH QA), 2ª visita/reload ──');
console.log('pantalla pintada en (ms):', pintadoEn);
console.log('clientes cargados en memoria en (ms):', identidadEn);
console.log('arranque terminado (_aviUpdateBusy) en (ms):', listoEn);

// Desglose de la petición a Supabase que trae TODAS las filas de los asesorados
// (UD.loadCoachClients: user_id,coach_id,role,profile,routines,history,msgs,bodyweight).
const filas = [...reqs.values()];
const supa = filas.filter(f => /supabase\.co\/rest\/v1\/user_data/.test(f.url));
console.log('\npeticiones a user_data (REST) en el reload:', supa.length);
supa.forEach(f => console.log('  ', f.method, f.status, Math.round((f.bytes||0)/1024), 'KB ·', f.url.replace('https://eoebhrxbokyllqalyecj.supabase.co', '')));
const totalSupaKB = Math.round(supa.reduce((a, f) => a + (f.bytes || 0), 0) / 1024);
console.log('TOTAL bytes de user_data en el reload (KB):', totalSupaKB, '· para', nClientes, 'asesorados ·', nClientes ? (totalSupaKB / nClientes).toFixed(1) : '?', 'KB/asesorado');

const otras = filas.filter(f => !/supabase\.co\/rest\/v1\/user_data/.test(f.url) && (f.bytes || 0) > 500);
console.log('\notras peticiones >0.5KB en el reload (', otras.length, '):');
otras.slice(0, 20).forEach(f => console.log('  ', Math.round((f.bytes || 0) / 1024), 'KB ·', f.url.replace('https://app.avientrena.com/', './').replace('https://eoebhrxbokyllqalyecj.supabase.co', 'SUPABASE')));

try { ws.close(); } catch {} chrome.kill();
process.exit(0);
