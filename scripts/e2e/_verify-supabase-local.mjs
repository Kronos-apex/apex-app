// _verify-supabase-local.mjs — LA LIBRERÍA DEL LOGIN LLEGA DESDE LA APP, Y SIN RED TAMBIÉN (v677).
//
// Hasta v676 supabase-js venía de un CDN pidiendo «la última 2.x» (19 versiones en 30 días, sin
// comprobar el archivo). v677 la sirve desde la propia app en versión fija. La suite afirma el
// marcado y la huella; esto prueba lo que la suite no puede:
//   1) que el navegador la pide A LA APP y a NINGÚN otro sitio de scripts,
//   2) que FUNCIONA: un inicio de sesión real con la cuenta QA dedicada (jamás un asesorado),
//   3) que el service worker la dejó guardada y, SIN RED, sigue disponible para el login.
// Corre sobre una copia LOCAL (localhost es contexto seguro: el SW se registra igual) y la nube
// está sellada para escrituras en localhost (v298). Con AVI_URL se apunta a producción.
//   node scripts/e2e/_verify-supabase-local.mjs     · exit 1 si algo falla
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const LOCAL = !process.env.AVI_URL;
const PORT = 8881, DBG = 9433;
const URL = process.env.AVI_URL || `http://localhost:${PORT}/`;
const LIB = 'vendor/supabase-js-2.117.2.js';
const CREDS = JSON.parse(readFileSync(join(homedir(), '.avi', 'e2e-creds.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = LOCAL ? spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' }) : null;
if (srv) await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/supalocal-' + Date.now(), '--no-first-run', 'about:blank']);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page'); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(400); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = []; const pedidos = [];
ws.on('message', d => { const m = JSON.parse(d);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'exception');
  if (m.method === 'Network.requestWillBeSent') pedidos.push({ url: m.params.request.url, tipo: m.params.type });
});
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const esperarArranque = async () => { for (let i = 0; i < 80; i++) { if (await ev(`!!window._aviUpdateBusy`)) return true; await sleep(500); } return false; };

// ── 1 · CON RED: se pide a la app y a nadie más ─────────────────────────────
await send('Page.navigate', { url: URL });
check('CONTROL · la app arrancó', await esperarArranque());
await sleep(2500);
const scripts = pedidos.filter(p => p.tipo === 'Script').map(p => p.url);
check('CONTROL · se vieron los scripts de la app', scripts.length >= 8, String(scripts.length));
check('la librería del login se pide A LA APP', scripts.some(u => u.startsWith(URL) && u.includes(LIB)), scripts.filter(u => /supabase/.test(u)).join(' '));
const ajenos = scripts.filter(u => !u.startsWith(URL));
check('ningún script se pide a otro sitio', ajenos.length === 0, ajenos.join(' '));
const lib = await ev(`({ready: typeof AUTH!=='undefined' && AUTH.ready(), cc: !!(window.supabase && typeof window.supabase.createClient==='function')})`);
check('la librería cargó (AUTH listo)', lib && lib.ready && lib.cc, JSON.stringify(lib));

// Un inicio de sesión REAL: que exista `createClient` no prueba que la librería funcione.
const login = await ev(`(async()=>{ try{ const r=await AUTH.signInEmail(${JSON.stringify(CREDS.email)},${JSON.stringify(CREDS.pass)});
  const s=await AUTH.getSession(); const uid=s&&s.user&&s.user.id;
  return {err: r&&r.error? String(r.error.message):'', uid: uid? uid.slice(0,8):''}; }catch(e){ return {err:String(e&&e.message||e)}; } })()`);
check('un inicio de sesión real funciona con la librería local (cuenta QA)', login && !login.err && !!login.uid, JSON.stringify(login));
await ev(`(async()=>{ try{ await AUTH.client().auth.signOut({scope:'local'}); }catch(e){} })()`);

// ── 2 · el service worker la guardó ──────────────────────────────────────────
let enCache = false;
for (let i = 0; i < 30 && !enCache; i++) {
  enCache = await ev(`(async()=>{ const ks=await caches.keys(); for(const k of ks){ const c=await caches.open(k); const r=await c.match(new URL(${JSON.stringify(LIB)}, location.href).href); if(r) return true; } return false; })()`);
  if (!enCache) await sleep(1000);
}
check('el service worker guardó la librería (precache)', enCache);

// ── 3 · SIN RED: recarga y la librería sigue ahí ────────────────────────────
await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await send('Page.reload', { ignoreCache: false });
const arrancoOffline = await esperarArranque();
await sleep(2000);
check('sin red la app arranca', arrancoOffline);
const libOff = await ev(`({ready: typeof AUTH!=='undefined' && AUTH.ready()})`);
check('sin red la librería del login SIGUE disponible (servida por el service worker)', libOff && libOff.ready, JSON.stringify(libOff));
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

const errs = jsErrors.filter(e => !/Failed to fetch|NetworkError|ERR_INTERNET_DISCONNECTED|Load failed/i.test(e));
check('cero errores de JS (los de «sin red» no cuentan)', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log(results.join('\n'));
const malos = results.filter(x => x.startsWith('❌')).length;
console.log(`\n${malos ? '🔴' : '✅'} librería del login desde la app: ${results.length - malos}/${results.length}  (${URL})`);
try { chrome.kill(); } catch {} try { srv && srv.kill(); } catch {}
process.exit(malos ? 1 : 0);
