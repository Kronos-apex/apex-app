// ¿La app ARRANCA aunque un módulo no cargue? (guía de Fable 2026-08-02, punto 1: verificar
// v386→v418 por SUPERFICIE.) La afirmación de v416 —«la guarda de arranque evita la pantalla en
// blanco»— estaba protegida SOLO por un candado ESTÁTICO que lee la línea con un regex. Su modo
// de fallo es una pantalla en blanco en el Android de una persona real, y ya pasó TRES VECES en
// producción (24/26/27-jul, v375/v393/v403). Un candado que MIRA el código tiene huecos; el que
// lo EJECUTA no (lección del teléfono de v418).
//
// Esto BLOQUEA de verdad cada módulo, uno por uno, y exige que la app siga arrancando: pantalla
// de login pintada, `initPWA` definido y CERO excepciones no capturadas. Es el escenario real —
// un <script> que no llegó por red flaky, no una simulación en memoria.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8795;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);

// app-1 es el arranque mismo: sin él no hay app que probar (y el índice lo carga primero).
// Se prueban los módulos que el arranque llama pero que NO son el arranque.
const MODULOS = ['app-2-login.js', 'app-3-coach.js', 'app-4-entreno.js', 'app-5-salud.js', 'app-6-extra.js', 'app-7-community.js'];
const results = [];

for (const mod of MODULOS) {
  const PROFILE = process.env.TEMP + '/cdp-arranque-' + Date.now();
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--remote-debugging-port=9295', '--user-data-dir=' + PROFILE,
     '--no-first-run', '--no-default-browser-check', '--window-size=390,844', 'about:blank']);
  let ws, ok = false, detalle = '';
  try {
    const page = await (async () => { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9295/json/list')).json(); const p = t.find(x => x.type === 'page'); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(400); } throw new Error('no page'); })();
    ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
    let id = 1; const pend = new Map(); const jsErrors = [];
    ws.on('message', d => {
      const m = JSON.parse(d);
      if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); }
      else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]);
      else if (m.method === 'Fetch.requestPaused') {
        const { requestId, request } = m.params;
        const bloquear = request.url.includes('/' + mod);
        const i2 = id++; pend.set(i2, { resolve: () => {} });
        ws.send(JSON.stringify({ id: i2, method: bloquear ? 'Fetch.failRequest' : 'Fetch.continueRequest',
          params: bloquear ? { requestId, errorReason: 'Failed' } : { requestId } }));
      }
    });
    const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
    await new Promise(r => ws.on('open', r));
    await send('Page.enable'); await send('Runtime.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await send('Page.navigate', { url: `http://localhost:${PORT}/` });
    // El llamado guardado corre a los 3s: hay que esperarlo, o el test pasa por no haber llegado.
    await sleep(9000);
    const estado = await ev(`(()=>{const l=document.getElementById('s-login');
      return {login: !!(l&&getComputedStyle(l).display!=='none'),
              initPWA: typeof initPWA==='function',
              cargaFuera: !document.getElementById('avi-loading')||getComputedStyle(document.getElementById('avi-loading')).display==='none',
              faltaModulo: typeof migratePhotosToStorage!=='function'};})()`);
    const fatales = jsErrors.filter(e => !/Failed to load resource|net::ERR/i.test(e));
    // `initPWA` VIVE en app-6-extra.js: exigirlo con ese módulo bloqueado es medir mal, no un
    // defecto (mi primera corrida lo reportó como fallo y era la sonda). Lo que debe cumplirse
    // SIEMPRE es lo que ve la persona: la pantalla de login pintada y cero excepciones.
    const exigeInitPWA = mod !== 'app-6-extra.js';
    ok = !!(estado && estado.login && (!exigeInitPWA || estado.initPWA) && fatales.length === 0);
    detalle = JSON.stringify({ ...estado, errores: fatales.slice(0, 2) });
    // Coherencia de la sonda: si bloqueamos app-5 y la función SIGUE existiendo, no bloqueamos nada.
    if (mod === 'app-5-salud.js' && estado && estado.faltaModulo === false) { ok = false; detalle += ' ⚠️ el bloqueo NO surtió efecto — la sonda no probó nada'; }
  } catch (e) { detalle = 'err:' + e.message; }
  try { ws && ws.close(); } catch {}
  chrome.kill();
  results.push({ mod, ok, detalle });
  console.log((ok ? ' OK   ' : ' FAIL ') + 'sin ' + mod.padEnd(20) + ' → la app arranca — ' + detalle);
  await sleep(600);
}

srv.kill();
const bad = results.filter(r => !r.ok);
if (bad.length) { console.error('\n❌ ' + bad.length + ' módulo(s) tumban el arranque: ' + bad.map(b => b.mod).join(', ')); process.exit(1); }
console.log('\n✅ TODO OK — ningún módulo ausente deja la app en blanco (' + results.length + ' probados)');
process.exit(0);
