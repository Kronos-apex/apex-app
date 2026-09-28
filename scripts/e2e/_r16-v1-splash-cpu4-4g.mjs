// _r16-v1-splash-cpu4-4g.mjs — R16 V1: por qué en "CPU ×4 + 4G lenta" la PRIMERA visita
// nunca llegó a _aviUpdateBusy en 2 minutos (baseline de _medir-arranque.mjs, 28-sep).
// SOLO LECTURA contra producción. Puerto CDP en el rango V1 (9480-9489).
//
// A diferencia de _medir-arranque.mjs (que solo mira si `listo` llegó o no), este script
// imprime el PROGRESO cada 2s: bytes bajados, cuántas peticiones siguen pendientes, si hubo
// una excepción JS, y en qué instante (si acaso) aparecieron pintado/listo. Con eso se puede
// decir si el defecto es del PROBE (algo que nunca se cumple aunque la app esté sana) o de
// la APP (algo se atasca de verdad con esa red).
//
//   node scripts/e2e/_r16-v1-splash-cpu4-4g.mjs [segundos_max]
import { spawn } from 'node:child_process';
import WebSocket from 'ws';

const URL = 'https://app.avientrena.com/';
const PUERTO = 9480;
const MAX_S = Number(process.argv[2] || 90);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${PUERTO}`,
  '--user-data-dir=' + process.env.TEMP + '/r16v1-splash-' + Date.now(),
  '--no-first-run', '--window-size=412,915', 'about:blank'
]);

let page = null;
for (let i = 0; i < 60 && !page; i++) {
  try { const t = await (await fetch(`http://localhost:${PUERTO}/json/list`)).json(); page = t.find(x => x.type === 'page'); } catch {}
  if (!page) await sleep(300);
}
if (!page) { console.log('🔴 Chrome no abrió el puerto de depuración'); chrome.kill(); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
const pendientes = new Map(); // requestId -> {url, t0}
const fallidas = [];
let bytes = 0, nExcepciones = 0, ultimaExcepcion = '';
ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  if (m.method === 'Network.requestWillBeSent') pendientes.set(m.params.requestId, { url: m.params.request.url, t0: Date.now() });
  if (m.method === 'Network.loadingFinished') { bytes += m.params.encodedDataLength || 0; pendientes.delete(m.params.requestId); }
  if (m.method === 'Network.loadingFailed') { fallidas.push({ url: (pendientes.get(m.params.requestId) || {}).url, error: m.params.errorText, canceled: m.params.canceled }); pendientes.delete(m.params.requestId); }
  if (m.method === 'Runtime.exceptionThrown') { nExcepciones++; ultimaExcepcion = (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description) || m.params.exceptionDetails.text || ''; }
});
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true }))?.result?.value;
const consola = [];
ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.method === 'Runtime.consoleAPICalled') {
    const args = (m.params.args || []).map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(' ');
    consola.push(`[${m.params.type}] ${args}`.slice(0, 300));
  }
});
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Performance.enable');
// AVI_DEBUG=true ANTES de que corra cualquier script de la página → los warn() (que en
// producción son mudos: `const warn=(...a)=>window.AVI_DEBUG&&console.warn(...a)`) se oyen.
await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.AVI_DEBUG=true;' });
await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.6, mobile: true });
const CPU_RATE = Number(process.env.CPU_RATE || 4);
const RED_ON = process.env.RED_OFF !== '1';
await send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });
// Lighthouse "4G lenta": 1.6 Mbps bajada, 750 Kbps subida, 150 ms RTT — el mismo perfil del baseline.
if (RED_ON) await send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });

console.log('URL:', URL, `· CPU×${CPU_RATE} + ${RED_ON ? '4G lenta (1.6 Mbps↓, 150ms RTT)' : 'red SIN throttle (control)'} · primera visita (perfil nuevo) · tope`, MAX_S, 's');

if (process.env.SEGUNDA === '1') {
  // Deja que la 1ª visita corra un rato (para que el SW se instale si el boot llega a initPWA)
  // y mide la 2ª visita (mismo perfil, mismo Chrome) bajo el MISMO throttle.
  console.log('MODO: 1ª visita (deja correr', process.env.SEGUNDA_ESPERA || 25, 's) → recarga → mide la 2ª');
  await send('Page.navigate', { url: URL });
  await sleep(Number(process.env.SEGUNDA_ESPERA || 25) * 1000);
  const sw1 = await ev(`(async()=>{try{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active);}catch(e){return 'err:'+e.message;}})()`).catch(()=>null);
  console.log('  tras la 1ª visita: SW activo =', sw1, '· _aviUpdateBusy =', await ev('!!window._aviUpdateBusy'));
  bytes = 0; pendientes.clear(); fallidas.length = 0; nExcepciones = 0;
  console.log('  recargando…');
  await send('Page.navigate', { url: URL });
}

const t0 = Date.now();
if (process.env.SEGUNDA !== '1') await send('Page.navigate', { url: URL });

let pintadoEn = null, listoEn = null;
for (let s = 0; s <= MAX_S; s += 2) {
  await sleep(2000);
  const r = await ev(`(()=>{const l=document.getElementById('s-login');
    return {vis:!!(l&&getComputedStyle(l).display!=='none'&&!document.getElementById('avi-loading')),
      listo:!!window._aviUpdateBusy, rs:document.readyState,
      splash:!!document.getElementById('avi-loading'),
      scripts:document.scripts.length,
      swReg:!!window._swReg, buildLabel:(document.getElementById('sb-build')||{}).textContent||null,
      authMode:(typeof AUTH_MODE!=='undefined')?AUTH_MODE:'?',
      dbEx:(typeof DB!=='undefined'&&DB&&DB.exercises)?DB.exercises.length:'?',
      bootfail:!!document.getElementById('avi-bootfail'),
      doLoginFn:typeof window.doLogin,
      supaReady:(typeof AUTH!=='undefined'&&AUTH&&typeof AUTH.ready==='function')?AUTH.ready():'AUTH?'};})()`).catch(() => null);
  const t = Date.now() - t0;
  if (r && r.vis && pintadoEn == null) pintadoEn = t;
  if (r && r.listo && listoEn == null) listoEn = t;
  const met = Object.fromEntries(((await send('Performance.getMetrics')).metrics || []).map(x => [x.name, x.value]));
  console.log(`  t=${(t/1000).toFixed(1)}s · KB=${Math.round(bytes/1024)} · script=${Math.round((met.ScriptDuration||0)*1000)}ms · tarea=${Math.round((met.TaskDuration||0)*1000)}ms · pend=${pendientes.size} · rs=${r?r.rs:'?'} · splash=${r?r.splash:'?'} · pintado=${!!pintadoEn} · listo=${!!listoEn} · swReg=${r?r.swReg:'?'} · build=${r?r.buildLabel:'?'} · authMode=${r?r.authMode:'?'} · dbEx=${r?r.dbEx:'?'} · bootfail=${r?r.bootfail:'?'} · doLogin=${r?r.doLoginFn:'?'} · supaReady=${r?r.supaReady:'?'}`);
  if (listoEn != null) break;
}

if (listoEn == null) {
  console.log('\n── PRUEBA DIRECTA: invocar syncFromCloud() DE NUEVO, a mano, y esperarla ──');
  const t1 = Date.now();
  const r2 = await (async () => {
    const res = await send('Runtime.evaluate', {
      expression: `(async()=>{try{ if(typeof syncFromCloud!=='function') return {ok:false,err:'syncFromCloud no existe'};
        await syncFromCloud(); return {ok:true, busy:!!window._aviUpdateBusy}; }
        catch(e){ return {ok:false, err:(e&&e.message)||String(e)}; } })()`,
      awaitPromise: true, returnByValue: true, timeout: 20000
    });
    return res && res.result && res.result.result ? res.result.result.value : res;
  })();
  console.log('  resultado:', JSON.stringify(r2), '· tardó', Date.now() - t1, 'ms');
  await sleep(500);
  const busyAhora = await ev(`!!window._aviUpdateBusy`);
  console.log('  window._aviUpdateBusy tras la invocación manual:', busyAhora);
}

console.log('\n── RESULTADO ──');
console.log('pintado en (ms):', pintadoEn);
console.log('listo (_aviUpdateBusy) en (ms):', listoEn);
if (listoEn == null) {
  console.log('🔴 NO llegó a listo dentro del tope de', MAX_S, 's');
  console.log('KB totales bajados:', Math.round(bytes / 1024));
  console.log('peticiones AÚN pendientes al cortar (', pendientes.size, '):');
  for (const [, v] of pendientes) console.log('   -', v.url, '· esperando', ((Date.now() - v.t0) / 1000).toFixed(1), 's');
  console.log('peticiones FALLIDAS (', fallidas.length, '):');
  fallidas.forEach(f => console.log('   -', f.url, '·', f.error, f.canceled ? '(cancelada)' : ''));
  console.log('excepciones JS:', nExcepciones, ultimaExcepcion ? '· última: ' + ultimaExcepcion.slice(0, 200) : '');
}
console.log('\nconsola de la página (AVI_DEBUG=true, ' + consola.length + ' líneas):');
consola.forEach(l => console.log('  ' + l));

try { ws.close(); } catch {}
chrome.kill();
process.exit(0);
