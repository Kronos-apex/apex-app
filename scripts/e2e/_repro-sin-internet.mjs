// ¿Se puede ENTRAR a AVI sin internet?
//
// La web promete, en su FAQ y con esas palabras: «Si. La app se guarda en tu telefono, asi
// que entra y funciona aunque en el gimnasio no haya senal». Claudia reporto lo contrario
// el 31-ago. Esto lo reproduce en vez de razonarlo.
//
// Metodo, que es el de ella: se entra UNA vez con red (para que el Service Worker cachee el
// shell y quede la sesion guardada), se corta la red de verdad (Network.emulateNetworkConditions)
// y se RECARGA. Se mira a donde llega: a su entrenamiento, al login, o a ninguna parte.
//
// Corre contra PRODUCCION con la cuenta QA dedicada — nunca con un asesorado real.
//
//   node scripts/e2e/_repro-sin-internet.mjs
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';

const URL = 'https://kronos-apex.github.io/apex-app/';
const CREDS = JSON.parse(readFileSync(join(homedir(), '.avi', 'e2e-creds.json'), 'utf8'));
const PORT = 9405;
const PERFIL = join(process.env.TEMP, 'offprof-' + Date.now());

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
   '--user-data-dir=' + PERFIL, '--no-first-run', '--window-size=390,844', 'about:blank']);

const dormir = ms => new Promise(r => setTimeout(r, ms));
// Chrome puede tardar en abrir el puerto: se reintenta en vez de reventar con ECONNREFUSED.
let t0 = null;
for (let i = 0; i < 20 && !t0; i++) {
  await dormir(1000);
  try { t0 = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find(x => x.type === 'page'); }
  catch (e) { t0 = null; }
}
if (!t0) { console.log('🔴 Chrome no abrio el puerto de depuracion'); chrome.kill(); process.exit(1); }
const ws = new WebSocket(t0.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
await new Promise(r => ws.on('open', r));
let id = 0; const pend = new Map(); const consola = [];
ws.on('message', m => {
  const o = JSON.parse(m);
  if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); }
  if (o.method === 'Runtime.consoleAPICalled') {
    consola.push((o.params.args || []).map(a => a.value ?? a.description ?? '').join(' '));
  }
});
const cmd = (m, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await cmd('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.result.value;
await cmd('Runtime.enable'); await cmd('Network.enable'); await cmd('Page.enable');

const estado = async () => JSON.parse(await ev(`JSON.stringify({
  pantallas:[...document.querySelectorAll('.screen')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id),
  splash:!!(document.getElementById('apex-loading')&&getComputedStyle(document.getElementById('apex-loading')).display!=='none'),
  boot:typeof window._aviUpdateBusy,
  hayEntreno:!!document.querySelector('#s-client #cn-today-head *, #s-client .exrow'),
  texto:(document.body.innerText||'').replace(/\\s+/g,' ').trim().slice(0,150)
})`) || '{}');

// ── 1. Entrar CON red ────────────────────────────────────────────────────
await cmd('Page.navigate', { url: URL });
await dormir(6000);
let e = await estado();
console.log('1. con red, sin sesion   →', e.pantallas.join(',') || '(ninguna)');

// Los campos son `lu` y `lp` (mismo camino que usan los harness del repo).
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(CREDS.email)};
  document.getElementById('lp').value=${JSON.stringify(CREDS.pass)}; return 1})()`);
await ev(`doLogin()`);
for (let i = 0; i < 30; i++) {
  const dentro = await ev(`(()=>{const sc=document.getElementById('s-client');
    return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  if (dentro) break;
  await dormir(2000);
}
e = await estado();
console.log('2. despues del login     →', e.pantallas.join(',') || '(ninguna)', '· entreno visible:', e.hayEntreno);
if (!e.pantallas.includes('s-client')) {
  console.log('   🔴 no se logro entrar CON red: la prueba de abajo no significaria nada');
  console.log('   texto:', e.texto);
  ws.close(); chrome.kill(); process.exit(1);
}

// El Service Worker necesita un momento para precachear el shell.
const sw = await ev(`(async()=>{try{const r=await navigator.serviceWorker.getRegistration();
  return !!(r&&(r.active||r.installing))}catch(err){return false}})()`);
console.log('3. service worker activo →', sw);
await dormir(4000);

// ── 2. Cortar la red DE VERDAD y recargar ────────────────────────────────
await cmd('Network.emulateNetworkConditions',
  { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
const netOff = await ev(`navigator.onLine`);
console.log('4. red cortada           → navigator.onLine =', netOff);

consola.length = 0;
// CUANTO TARDA en quedar usable sin red. Si son 10-15 segundos mirando el splash, la
// persona concluye —con razon— que «la app necesita internet», aunque acabe abriendo.
const t0ms = Date.now();
await cmd('Page.reload', { ignoreCache: false });
let msUsable = null;
for (let i = 0; i < 40; i++) {
  const s = await estado();
  if (s.pantallas.includes('s-client') || s.pantallas.includes('s-coach')) { msUsable = Date.now() - t0ms; break; }
  await dormir(500);
}
console.log('   tiempo hasta poder usarla sin red:', msUsable === null ? 'nunca (>20s)' : (msUsable / 1000).toFixed(1) + ' s');
e = await estado();
console.log('5. SIN RED, tras recargar→', e.pantallas.join(',') || '(ninguna)',
  '· splash pegado:', e.splash, '· boot:', e.boot);
console.log('   entreno visible:', e.hayEntreno);
console.log('   lo que se ve:', e.texto.slice(0, 120));

const entro = e.pantallas.includes('s-client') || e.pantallas.includes('s-coach');
console.log('\n' + (entro
  ? '✅ ENTRA sin internet — la promesa del FAQ se cumple'
  : '🔴 NO ENTRA sin internet — la promesa del FAQ es FALSA (se queda en: ' +
    (e.splash ? 'el splash' : e.pantallas.join(',') || 'ninguna pantalla') + ')'));

const errs = consola.filter(l => /error|failed|denied/i.test(l)).slice(0, 5);
if (errs.length) { console.log('\nconsola:'); errs.forEach(l => console.log('   ' + l.slice(0, 140))); }

ws.close(); chrome.kill();
process.exit(entro ? 0 : 1);
