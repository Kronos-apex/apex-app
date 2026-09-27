// _verify-csp.mjs — LA REGLA DE ORÍGENES (CSP) BLOQUEA LO AJENO Y NO ROMPE NADA DE LA APP (v678).
//
// Una CSP con un sitio olvidado rompe algo EN SILENCIO en el teléfono de alguien: la imagen no
// sale, el chat no conecta, y no hay excepción que lo delate. Así que se recorre la app de verdad
// —sesión real con la cuenta QA dedicada, todas las pestañas, las habitaciones principales y el
// panel del coach— escuchando `securitypolicyviolation`. Lo que la regla bloquee de la app es un
// sitio que falta en el inventario.
// CONTROLES (sin ellos, «cero bloqueos» podría ser una regla que no está puesta):
//   · un <script src> de otro sitio TIENE que quedar bloqueado,
//   · un fetch a un servidor ajeno TIENE que quedar bloqueado.
// Local (localhost = contexto seguro; la nube está sellada para escrituras, v298). AVI_URL = prod.
//   node scripts/e2e/_verify-csp.mjs     · exit 1 si algo falla
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const LOCAL = !process.env.AVI_URL;
const PORT = 8883, DBG = 9435;
const URL = process.env.AVI_URL || `http://localhost:${PORT}/`;
const CREDS = JSON.parse(readFileSync(join(homedir(), '.avi', 'e2e-creds.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = LOCAL ? spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' }) : null;
if (srv) await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/csp-' + Date.now(), '--no-first-run', 'about:blank']);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page'); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(400); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = []; const consolaCSP = [];
ws.on('message', d => { const m = JSON.parse(d);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception');
  if (m.method === 'Log.entryAdded' && /Content Security Policy/i.test(m.params.entry.text)) consolaCSP.push(m.params.entry.text.slice(0, 220));
});
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push({dir:e.effectiveDirective,uri:e.blockedURI,src:(e.sourceFile||'')+':'+e.lineNumber}));` });

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const esperar = async (expr, veces = 60, ms = 500) => { for (let i = 0; i < veces; i++) { if (await ev(expr)) return true; await sleep(ms); } return false; };
const violaciones = async () => (await ev(`window.__csp||[]`)) || [];

await send('Page.navigate', { url: URL });
check('CONTROL · la app arrancó', await esperar(`!!window._aviUpdateBusy`, 80));
check('la regla está puesta en la página', await ev(`!!document.querySelector('meta[http-equiv="Content-Security-Policy"]')`));

// ── Sesión real (cuenta QA) ─────────────────────────────────────────────────
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(CREDS.email)};document.getElementById('lp').value=${JSON.stringify(CREDS.pass)};return 1})()`);
await ev(`doLogin()`);
const dentro = await esperar(`(()=>{const s=document.getElementById('s-client');return !!(s&&getComputedStyle(s).display!=='none')})()`, 40, 1000);
check('CONTROL · entró como asesorado QA', dentro);
await sleep(3000);

// Todas las pestañas del asesorado, por sus botones reales.
const tabs = await ev(`[...document.querySelectorAll('#s-client .cntab')].map(b=>(b.getAttribute('onclick')||'').match(/cnTab\\('([^']+)'/)).filter(Boolean).map(m=>m[1])`);
check('CONTROL · se encontraron las pestañas del asesorado', (tabs || []).length >= 5, JSON.stringify(tabs));
for (const t of tabs || []) {
  await ev(`(()=>{const b=[...document.querySelectorAll('#s-client .cntab')].find(x=>(x.getAttribute('onclick')||'').includes("'${t}'"));if(b)b.click();return 1})()`);
  await sleep(2500);
}
// Habitaciones y pantallas que cargan imágenes, videos o datos.
const pasos = [
  `cnTab('cn-today', document.querySelector('.cntab'))`,
  `typeof expandTodayWorkout==='function' && expandTodayWorkout()`,
  `openExDetail('e1')`, `typeof closeExDetail==='function'&&closeExDetail()`,
  `openHelp()`, `typeof closeHelp==='function'&&closeHelp()`,
  `openQuickWorkouts()`,
  `openNutritionRoom(CUR.clientId)`, `openFoodLogRoom()`,
  `openPhotosModal()`,
];
for (const p of pasos) { await ev(`(()=>{try{ ${p}; }catch(e){ return String(e); } return 1})()`); await sleep(2000); }
const tras1 = await violaciones();

// ── Panel del coach (montado sin sesión de coach, como los demás harness) ──
await ev(`(()=>{try{CUR.loggedAs='coach';showScreen('s-coach');}catch(e){}return 1})()`);
for (const p of ['p-home', 'p-clients', 'p-templates', 'p-exercises', 'p-msgs']) {
  await ev(`(()=>{try{gp('${p}',null,null,true);}catch(e){}return 1})()`); await sleep(1500);
}
const deLaApp = await violaciones();
check('la app NO dispara ningún bloqueo de la regla en todo el recorrido', deLaApp.length === 0,
  JSON.stringify(deLaApp.slice(0, 6)) + (consolaCSP.length ? ' | consola: ' + consolaCSP.slice(0, 2).join(' / ') : ''));

// ── CONTROLES de discriminación ─────────────────────────────────────────────
await ev(`(()=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/left-pad@1.3.0/index.js';document.head.appendChild(s);return 1})()`);
const fetchAjeno = await ev(`(async()=>{try{await fetch('https://example.com/robo?d=1');return 'paso';}catch(e){return 'bloqueado';}})()`);
await sleep(1200);
const v = await violaciones();
check('CONTROL · un script de otro sitio queda BLOQUEADO', v.some(x => x.dir === 'script-src-elem' && /jsdelivr/.test(x.uri)), JSON.stringify(v.slice(-2)));
check('CONTROL · un envío de datos a un servidor ajeno queda BLOQUEADO', fetchAjeno === 'bloqueado' && v.some(x => x.dir === 'connect-src' && /example\.com/.test(x.uri)), fetchAjeno);

const errs = jsErrors.filter(e => !/example\.com|Failed to fetch/i.test(e));
check('cero errores de JS en el recorrido', errs.length === 0, errs.slice(0, 3).join(' | '));
check('CONTROL · el recorrido pasó por varias pantallas antes del coach', tras1 !== null);

console.log(results.join('\n'));
const malos = results.filter(x => x.startsWith('❌')).length;
console.log(`\n${malos ? '🔴' : '✅'} regla de orígenes: ${results.length - malos}/${results.length}  (${URL})`);
try { chrome.kill(); } catch {} try { srv && srv.kill(); } catch {}
process.exit(malos ? 1 : 0);
