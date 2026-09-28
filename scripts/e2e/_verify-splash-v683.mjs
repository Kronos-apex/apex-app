// _verify-splash-v683.mjs — LA MARCA SE VE 1 s Y SE VA CUANDO LA APP YA SABE QUÉ MOSTRAR (v683, R16).
//
// Mide lo que la persona VE, muestreando cada 40 ms desde que abre la app: cuándo se va la marca,
// cuándo aparece su pantalla, y si en el medio se asomó el LOGIN (el «login fantasma» que veía quien
// ya había entrado: en v682 la marca se quitaba ANTES de restaurar la sesión).
// Dos casos: sin sesión (primera vez) y CON sesión (el de todos los días: login ÚNICO con la cuenta QA
// y después se RECARGA, que es reabrir la app). La nube está sellada en localhost (v298).
//   node scripts/e2e/_verify-splash-v683.mjs <url-local> [--control]
//   --control: corre contra una copia de v682 y ESPERA ver el defecto (así se sabe que la sonda muerde).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { EMAIL, PASS } from './_creds.mjs';
const URL = process.argv[2] || 'http://localhost:8872/';
const CONTROL = process.argv.includes('--control');
const DBG = CONTROL ? 9421 : 9422;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/splash683-' + DBG + '-' + Date.now(), '--no-first-run', '--window-size=390,844', 'about:blank']);
let page; for (let i = 0; i < 60 && !page; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); page = t.find(x => x.type === 'page'); } catch {} if (!page) await sleep(300); }
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { try { return (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }))?.result?.value; } catch { return null; } };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : ''));
const ESTADO = `(()=>{ const vis=id=>{const e=document.getElementById(id); return !!(e&&getComputedStyle(e).display!=='none');};
  const o=document.getElementById('avi-loading'); const tapa=!!(o&&!o.classList.contains('fade'));
  return { t:Math.round(performance.now()), stamp:(typeof window.__aviSplashAt==='number')?Math.round(window.__aviSplashAt):null,
    tapa, login:vis('s-login'), cliente:vis('s-client'), coach:vis('s-coach') }; })()`;
async function observar(ms) {
  const log = []; const t0 = Date.now();
  while (Date.now() - t0 < ms) { const s = await ev(ESTADO); if (s) log.push(s); await sleep(40); }
  return log;
}
function leer(log) {
  const fuera = log.find(s => !s.tapa);
  const pantalla = log.find(s => !s.tapa && (s.cliente || s.coach));
  // «login fantasma»: sin marca encima, con el login a la vista y su pantalla todavía sin aparecer.
  const fantasma = log.filter(s => !s.tapa && s.login && !s.cliente && !s.coach);
  const stamp = (log.find(s => s.stamp != null) || {}).stamp;
  return { stamp, marcaFuera: fuera ? fuera.t : null, pantalla: pantalla ? pantalla.t : null,
    fantasmaMs: fantasma.length ? fantasma[fantasma.length - 1].t - fantasma[0].t + 40 : 0, loginVisible: !!log.find(s => !s.tapa && s.login) };
}

// ── 1 · SIN sesión (primera vez) ──
await send('Page.navigate', { url: URL });
const a = leer(await observar(7000));
// ── 2 · CON sesión: login ÚNICO, y después reabrir (recargar) ──
await ev(`(()=>{ const o=document.getElementById('avi-loading'); if(o) o.remove(); return 1; })()`);
for (let i = 0; i < 50 && !(await ev(`typeof doLogin==='function' && !!document.getElementById('lu')`)); i++) await sleep(300);
await ev(`(()=>{ document.getElementById('lu').value=${JSON.stringify(EMAIL)}; document.getElementById('lp').value=${JSON.stringify(PASS)}; doLogin(); return 1; })()`);
let dentro = false; for (let i = 0; i < 120 && !dentro; i++) { dentro = await ev(`(()=>{const e=document.getElementById('s-client');return !!(e&&getComputedStyle(e).display!=='none');})()`); if (!dentro) await sleep(500); }
await sleep(3000);
await send('Page.navigate', { url: URL });
const b = leer(await observar(9000));

console.log(`URL ${URL}${CONTROL ? '  (CONTROL v682)' : ''}`);
console.log('sin sesión:', JSON.stringify(a));
console.log('con sesión:', JSON.stringify(b), '· entró con la cuenta QA:', dentro);
const visto = r => (r.marcaFuera != null && r.stamp != null) ? r.marcaFuera - r.stamp : null;
if (CONTROL) {
  // v682: la marca dura ~2,8 s y, con sesión, el login se asoma antes de su plan.
  check('CONTROL · en v682 la marca dura ≥ 2,7 s', (visto(a) ?? (a.marcaFuera ?? 0)) >= 2700, String(visto(a) ?? a.marcaFuera));
  check('CONTROL · en v682 quien ya entró ve el login antes de su plan (la sonda lo detecta)', b.fantasmaMs > 0, b.fantasmaMs + ' ms');
} else {
  check('sin sesión: la marca se ve al menos 1 s', visto(a) != null && visto(a) >= 950, String(visto(a)));
  check('sin sesión: y se va mucho antes que los 2,8 s de antes', visto(a) != null && visto(a) < 2300, String(visto(a)));
  check('sin sesión: debajo está el login', a.loginVisible, String(a.loginVisible));
  check('con sesión: entró con la cuenta QA', dentro, String(dentro));
  check('con sesión: la marca se ve al menos 1 s', visto(b) != null && visto(b) >= 950, String(visto(b)));
  check('con sesión: NO se asoma el login antes de su plan', b.fantasmaMs === 0, b.fantasmaMs + ' ms');
  check('con sesión: su plan aparece', b.pantalla != null, String(b.pantalla));
}
check('cero errores de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
console.log(results.join('\n'));
const malos = results.filter(x => x.startsWith('❌')).length;
console.log(`\n${malos ? '🔴' : '✅'} marca v683${CONTROL ? ' (control)' : ''}: ${results.length - malos}/${results.length}`);
try { ws.close(); } catch {} chrome.kill();
process.exit(malos ? 1 : 0);
