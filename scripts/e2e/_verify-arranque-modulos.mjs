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
    // El llamado guardado corre a los 3s y la red de última instancia a los 12s: hay que esperar
    // MÁS que eso, o el gate mide antes de que la app haya tenido su última oportunidad.
    await sleep(16000);
    // 🔴 QUÉ SE MIDE Y POR QUÉ CAMBIÓ (v534). Hasta aquí el criterio era «`#s-login` existe y no
    // está display:none», y **eso lo cumple el defecto**: `#s-login` es marcado ESTÁTICO que vive
    // DEBAJO del splash (`position:fixed;z-index:9999`). Bloqueando `app-2-login.js` este gate
    // imprimía OK con `cargaFuera:false` en su propia línea de salida — o sea que aprobaba
    // exactamente el caso que existe para cazar (auditoría de código, 24-ago).
    // Ahora se afirma **lo que la persona puede hacer**: que en el centro de la pantalla haya algo
    // suyo y pulsable, no una capa encima. El hit-testing SÍ es la herramienta correcta aquí
    // (a diferencia de v525, donde lo que tapaba era la franja del sistema y no un elemento).
    // LA PROMESA DE ESTE GATE, dicha en los términos de la persona: **nadie se queda mirando una
    // pantalla muerta**. Eso se cumple de DOS maneras y las dos valen: o llega al login (la app
    // funciona sin ese módulo), o llega al aviso honesto de «no pudimos cargar · Reintentar»
    // (no funciona, y se le dice). Lo que NO vale es el splash congelado ni una capa muda encima.
    const estado = await ev(`(()=>{const l=document.getElementById('s-login');
      const fail=document.getElementById('avi-bootfail');
      const cx=Math.round(innerWidth/2), cy=Math.round(innerHeight/2);
      const top=document.elementFromPoint(cx,cy);
      const enLogin=!!(l&&top&&l.contains(top));
      const enAviso=!!(fail&&top&&fail.contains(top));
      return {login: !!(l&&getComputedStyle(l).display!=='none'),
              // Un login que se VE no es un login que SIRVE: la pantalla es marcado estatico, asi
              // que con el splash quitado se ve y se toca aunque el modulo que la hace funcionar
              // no haya cargado — y entonces la persona pulsa y no pasa nada, que es otra pantalla
              // muerta. Lo cazo el sabotaje S2, no yo. (Sin comillas invertidas: esto va DENTRO de
              // un template literal y una sola lo parte — gotcha del repo.)
              loginVivo: typeof doLogin==='function',
              initPWA: typeof initPWA==='function',
              cargaFuera: !document.getElementById('avi-loading')||getComputedStyle(document.getElementById('avi-loading')).display==='none',
              alcanzable: enLogin||enAviso,
              modo: enLogin?'login':(enAviso?'aviso honesto':'NADA USABLE'),
              tapadoPor: (enLogin||enAviso)?null:(top?((top.id||top.className||top.tagName)+''):'nada'),
              faltaModulo: typeof migratePhotosToStorage!=='function'};})()`);
    const fatales = jsErrors.filter(e => !/Failed to load resource|net::ERR/i.test(e));
    // `initPWA` VIVE en app-6-extra.js: exigirlo con ese módulo bloqueado es medir mal, no un
    // defecto (mi primera corrida lo reportó como fallo y era la sonda). Lo que debe cumplirse
    // SIEMPRE es lo que ve la persona: la pantalla de login pintada y cero excepciones.
    const exigeInitPWA = mod !== 'app-6-extra.js';
    // 🔴 `cargaFuera` y `alcanzable` son las condiciones NUEVAS y son las que de verdad describen
    // lo que la persona vive: el splash se fue Y hay algo suyo y pulsable en pantalla.
    // `initPWA` y el login solo se exigen cuando la app PUEDE funcionar sin ese módulo; si cayó en
    // el aviso honesto, exigirlos sería pedirle a una app que no cargó que además tenga su motor.
    const degradado = estado && estado.modo === 'aviso honesto';
    ok = !!(estado && estado.cargaFuera && estado.alcanzable && fatales.length === 0
            && (degradado || (estado.login && estado.loginVivo && (!exigeInitPWA || estado.initPWA))));
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
