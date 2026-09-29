// _verify-red-colgada.mjs — ¿ABRE AVI CON UNA WIFI «CONECTADA PERO SIN INTERNET»? (v687)
//
// Sin red la app abre desde el service worker (0,3 s, medido). Pero hay un tercer caso, el del
// gimnasio: el teléfono cree que TIENE red y los pedidos salen y nadie contesta. Medido el 29-sep
// contra producción (v686): la navegación caía a su copia a los 3 s y después el styles.css se
// quedaba esperando a la red SIN LÍMITE → pantalla en blanco, sin cuadro que pintar, para siempre.
//
// Método: se congelan los pedidos con `Fetch` en el SERVICE WORKER (es otro «target» para CDP; los
// pedidos de la página los atiende él, así que ahí es donde la red «no contesta»). Tres controles
// que tienen que salir como se espera para que el resto signifique algo: red normal (abre), sin
// red (abre) y — con `--sw-viejo` — el service worker de HEAD, que TIENE que quedarse colgado.
//
//   node scripts/e2e/_verify-red-colgada.mjs              local, con y sin sesión (cuenta QA)
//   node scripts/e2e/_verify-red-colgada.mjs --sw-viejo   CONTROL: el sw.js de HEAD, sin sesión → debe FALLAR
//   node scripts/e2e/_verify-red-colgada.mjs --prod       contra app.avientrena.com, sin sesión
import WebSocket from 'ws';
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARGS = process.argv.slice(2);
const PROD = ARGS.includes('--prod'), SW_VIEJO = ARGS.includes('--sw-viejo');
const CON_SESION = !PROD && !SW_VIEJO;
const LIMITE_MS = 12000;   // el aviso de «No pudimos cargar AVI» sale a los 12 s: abrir tiene que ganarle
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
const ok = (cond, txt) => { console.log(`${cond ? '✅' : '🔴'} ${txt}`); if (!cond) fallos++; };

// ── Servidor local (sirve el árbol de trabajo; con --sw-viejo, el sw.js de HEAD) ──────────────
const PORT = 8814;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json' };
const SW_HEAD = SW_VIEJO ? execSync('git show HEAD:sw.js', { cwd: ROOT }) : null;
let srv = null;
if (!PROD) {
  srv = createServer((req, res) => {
    const ruta = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html';
    if (ruta === 'sw.js' && SW_HEAD) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(SW_HEAD); }
    const f = join(ROOT, ruta);
    if (!existsSync(f) || f.indexOf(ROOT) !== 0) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  await new Promise(r => srv.listen(PORT, r));
}
const URL = PROD ? 'https://app.avientrena.com/' : `http://localhost:${PORT}/`;

// ── Chrome + CDP (la página y el service worker, cada uno su sesión) ────────────────────────
const DBG = 9443;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + join(tmpdir(), 'avi-redcolgada-' + Date.now()),
  '--no-first-run', '--window-size=390,844', 'about:blank']);
let ver; for (let i = 0; i < 60 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json(); } catch { await sleep(300); } }
const ws = new WebSocket(ver.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const pausados = []; const tipos = new Map(); const sesiones = new Set();
let congelar = null;   // null = todo pasa · función(url) = qué se queda sin respuesta
const send = (method, params = {}, sessionId) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); });
ws.on('message', d => { const m = JSON.parse(d);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || m.error); pend.delete(m.id); }
  if (m.method === 'Fetch.requestPaused') {
    const u = m.params.request.url;
    if (congelar && /^https?:/.test(u) && congelar(u)) pausados.push({ s: m.sessionId, t: Date.now(), quien: tipos.get(m.sessionId) || '?', rid: m.params.requestId, url: u });
    else send('Fetch.continueRequest', { requestId: m.params.requestId }, m.sessionId);
  }
  if (m.method === 'Target.attachedToTarget') { tipos.set(m.params.sessionId, m.params.targetInfo.type); enganchar(m.params.sessionId, m.params.targetInfo.type); } });
async function enganchar(s, tipo) {
  if (sesiones.has(s)) return; sesiones.add(s);
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] }, s);
  await send('Network.enable', {}, s).catch(() => {});
  if (tipo === 'page') { await send('Page.enable', {}, s); await send('Runtime.enable', {}, s); }
  await send('Runtime.runIfWaitingForDebugger', {}, s);
}
await new Promise(r => ws.on('open', r));
await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
const { targetInfos } = await send('Target.getTargets');
const { sessionId: P } = await send('Target.attachToTarget', { targetId: targetInfos.find(t => t.type === 'page').targetId, flatten: true });
tipos.set(P, 'page'); await enganchar(P, 'page');
await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, P);
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }, P); return r && r.result ? r.result.value : null; };
// Lo que quedó colgado se CORTA, no se suelta: un refresco de token que llegara tarde al servidor lo rotaría
// y el siguiente uso del viejo revocaría la sesión de prueba (Supabase detecta la reutilización).
const redNormal = async () => { congelar = null; for (const p of pausados.splice(0)) await send('Fetch.failRequest', { requestId: p.rid, errorReason: 'Aborted' }, p.s).catch(() => {});
  for (const s of sesiones) await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, s).catch(() => {}); };

// «Arrancó» = el símbolo que solo existe cuando corrió la cadena del arranque (no el DOM, que está al parsear).
const ESTADO = `(()=>{ const vis=id=>{const e=document.getElementById(id);return !!(e&&getComputedStyle(e).display!=='none')};
  return { listo:!!window._aviUpdateBusy, rs:document.readyState, splash:!!document.getElementById('avi-loading'),
    fallo:!!document.getElementById('avi-bootfail'), cliente:vis('s-client'), login:vis('s-login'),
    sw:!!(navigator.serviceWorker&&navigator.serviceWorker.controller) }; })()`;
let vioLogin = false;
async function abrir(nombre, { hasta = s => s.listo, ms = 20000 } = {}) {
  pausados.length = 0;
  const t0 = Date.now(); await send('Page.reload', { ignoreCache: false }, P);
  let t = null, ultimo = null; vioLogin = false;
  while (Date.now() - t0 < ms) {
    const s = await ev(ESTADO); ultimo = s || ultimo;
    // El login a la vista SIN la marca encima: a quien tiene sesión eso le dice «sal y vuelve a entrar».
    if (s && s.login && !s.splash && !s.cliente && s.listo) vioLogin = true;
    if (s && hasta(s)) { t = Date.now() - t0; break; }
    await sleep(200);
  }
  const ve = ultimo ? (ultimo.cliente ? 'su pantalla' : ultimo.fallo ? 'el aviso de fallo' : ultimo.splash ? 'la marca de carga' : ultimo.login ? 'EL LOGIN' : '?') : '?';
  console.log(`   ${nombre.padEnd(40)} → ${t == null ? 'NO abrió en ' + ms + ' ms' : 'abrió en ' + t + ' ms'} · se ve: ${ve}${vioLogin ? ' · ⚠️ se vio el login antes' : ''}`);
  for (const p of pausados) console.log(`        sin respuesta (${p.quien}) +${p.t - t0} ms  ${p.url.replace(/^https?:\/\/[^/]+/, '')}`);
  return t;
}

// ── Instalar: una visita con red normal hasta que el service worker controla la página y guardó el shell ──
console.log(`\n▶ ${PROD ? 'PRODUCCIÓN ' + URL : 'LOCAL ' + URL}${SW_VIEJO ? ' · CONTROL: sw.js de HEAD' : ''}`);
await send('Page.navigate', { url: URL }, P);
let instalado = false;
for (let i = 0; i < 80 && !instalado; i++) {
  await sleep(500);
  instalado = await ev(`(async()=>{ if(!(navigator.serviceWorker&&navigator.serviceWorker.controller)) return false;
    const css=document.querySelector('link[rel=stylesheet][href*="styles.css"]'); return !!(css && await caches.match(css.href)); })()`);
}
ok(instalado, 'montaje: el service worker controla la página y ya guardó styles.css');
if (!instalado) { srv && srv.close(); chrome.kill(); process.exit(1); }
await sleep(1500);

// ── A. Sin sesión ──────────────────────────────────────────────────────────────────────────
console.log('\nA. sin sesión');
const aNormal = await abrir('red normal (control)');
ok(aNormal != null, 'control: con red normal abre');
for (const s of sesiones) await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, s).catch(() => {});
const aOffline = await abrir('sin red (control)');
ok(aOffline != null, 'control: sin red abre desde lo guardado');
await redNormal();
congelar = () => true;
const aColgada = await abrir('WiFi colgada: nada responde', { ms: 25000 });
if (SW_VIEJO) {
  ok(aColgada == null, 'CONTROL DE DISCRIMINACIÓN: con el sw.js viejo la app NO abre con la red colgada');
} else {
  ok(aColgada != null && aColgada <= LIMITE_MS, `con la red colgada abre antes del aviso de fallo (${LIMITE_MS} ms)`);
}
await redNormal();

// ── B. Con sesión (cuenta QA, solo local: las escrituras a la nube están selladas en localhost) ──
if (CON_SESION) {
  console.log('\nB. con sesión (cuenta QA)');
  const { EMAIL, PASS } = await import('./_creds.mjs');
  await abrir('recarga con red para el login');
  await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};return 1})()`);
  await ev(`doLogin()`);
  let dentro = false;
  for (let i = 0; i < 40 && !dentro; i++) { await sleep(750); const s = await ev(ESTADO); dentro = !!(s && s.cliente); }
  ok(dentro, 'montaje: el login con red deja a la cuenta QA dentro');
  if (dentro) {
    await sleep(2500);
    const entra = s => s.listo && s.cliente;
    // El token de acceso dura una hora: quien abre la app al día siguiente trae uno VENCIDO. Se simula
    // corriendo la hora de vencimiento de la sesión guardada, con la red ya cortada (si no, la librería lo
    // renovaría en el acto y la prueba no probaría nada).
    const vencer = () => ev(`(()=>{ const k='avi_auth'; const o=JSON.parse(localStorage.getItem(k)||'null'); if(!o||!o.expires_at) return false;
      o.expires_at=Math.floor(Date.now()/1000)-3600; localStorage.setItem(k, JSON.stringify(o)); return true; })()`);
    const offline = async v => { for (const s of sesiones) await send('Network.emulateNetworkConditions', { offline: v, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, s).catch(() => {}); };
    const caso = async (nombre, { red, vencido }) => {
      if (red === 'sin') await offline(true);
      if (red === 'colgada') congelar = () => true;
      if (red === 'nube') congelar = u => /supabase\.co/.test(u);
      if (vencido) ok(await vencer(), `montaje: la sesión guardada quedó vencida (${nombre})`);
      const t = await abrir(nombre, { hasta: entra, ms: 25000 });
      if (t != null) ok(!vioLogin, `mientras espera, no se le muestra el login (${nombre})`);
      await offline(false); await redNormal();
      return t;
    };
    const bNormal = await abrir('red normal (control)', { hasta: entra });
    ok(bNormal != null, 'control: con sesión y red normal entra a su pantalla');
    const bSinFresco = await caso('sin red · sesión fresca (control)', { red: 'sin' });
    ok(bSinFresco != null, 'control: sin red y con la sesión fresca entra (lo medido en septiembre)');
    const bSinVencido = await caso('sin red · sesión VENCIDA', { red: 'sin', vencido: true });
    ok(bSinVencido != null && bSinVencido <= LIMITE_MS, `sin red y con la sesión vencida entra a su pantalla antes de ${LIMITE_MS} ms`);
    // Volver a red normal renueva el token de verdad antes del caso siguiente.
    await abrir('red normal (renueva la sesión)', { hasta: entra });
    const bColgada = await caso('WiFi colgada · sesión fresca', { red: 'colgada' });
    ok(bColgada != null && bColgada <= LIMITE_MS, `con la red colgada y la sesión fresca entra antes de ${LIMITE_MS} ms`);
    await abrir('red normal (renueva la sesión)', { hasta: entra });
    const bColgadaV = await caso('WiFi colgada · sesión VENCIDA', { red: 'colgada', vencido: true });
    ok(bColgadaV != null && bColgadaV <= LIMITE_MS, `con la red colgada y la sesión vencida entra antes de ${LIMITE_MS} ms`);
    await abrir('red normal (renueva la sesión)', { hasta: entra });
    const bNube = await caso('solo la nube colgada', { red: 'nube' });
    ok(bNube != null && bNube <= LIMITE_MS, `con solo la nube colgada entra antes de ${LIMITE_MS} ms`);
    const bFin = await abrir('red normal al final (control)', { hasta: entra });
    ok(bFin != null, 'control: al final, con red, la sesión sigue viva (la prueba no la rompió)');
  }
}

console.log(`\n${fallos ? '🔴 ' + fallos + ' fallo(s)' : '✅ todo verde'}`);
try { ws.close(); } catch {} chrome.kill(); srv && srv.close();
process.exit(fallos ? 1 : 0);
