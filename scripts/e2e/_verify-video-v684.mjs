// _verify-video-v684.mjs — EL VIDEO DEL LOGIN SOLO SE CARGA CUANDO EL LOGIN SE VE (v684, R16 #2).
//
// Mide en un navegador real (servidor local; nube sellada en localhost, v298):
//   C · con «reducir movimiento»: el login se ve y el video NO se pide (solo la foto).
//   A · sin sesión: el login se ve, el video se pide DESPUÉS de que cargó todo el código, reproduce y entra
//       con su fundido (clase `on`).
//   B · con sesión (login ÚNICO con la cuenta QA y después reabrir): el video NO se pide nunca.
//   node scripts/e2e/_verify-video-v684.mjs <url-local> [--control]
//   --control: contra una copia de v683; ESPERA ver el video pedido aunque haya sesión (la sonda muerde).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { EMAIL, PASS } from './_creds.mjs';
const URL = process.argv[2] || 'http://localhost:8872/';
const CONTROL = process.argv.includes('--control');
const DBG = CONTROL ? 9423 : 9424;
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-video-v684'; mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--autoplay-policy=no-user-gesture-required',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/video684-' + DBG + '-' + Date.now(), '--no-first-run', '--window-size=390,844', 'about:blank']);
let page; for (let i = 0; i < 60 && !page; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); page = t.find(x => x.type === 'page'); } catch {} if (!page) await sleep(300); }
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = []; let red = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]);
  if (m.method === 'Network.requestWillBeSent') red.push({ t: m.params.timestamp, url: m.params.request.url, ev: 'pide', rid: m.params.requestId });
  if (m.method === 'Network.loadingFinished') red.push({ t: m.params.timestamp, ev: 'fin', rid: m.params.requestId }); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { try { return (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }))?.result?.value; } catch { return null; } };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
const results = [];
const check = (n, c, x = '') => results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : ''));
const VID = `(()=>{ const v=document.querySelector('#s-login .cin-vid'); const l=document.getElementById('s-login');
  return { src:v?v.getAttribute('src'):null, on:!!(v&&v.classList.contains('on')), t:v?+v.currentTime.toFixed(2):0,
    login:!!(l&&getComputedStyle(l).display!=='none'), marca:!!document.getElementById('avi-loading') }; })()`;
const pedidosVideo = () => red.filter(r => r.ev === 'pide' && /hero-montage\.mp4/.test(r.url));

// ── C · «reducir movimiento» ──
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
red = []; await send('Page.navigate', { url: URL }); await sleep(7000);
const c = await ev(VID);
if (!CONTROL) {
  check('reducir movimiento: el login se ve', c && c.login && !c.marca, JSON.stringify(c));
  check('reducir movimiento: el video NO se pide (solo la foto)', c && !c.src && pedidosVideo().length === 0, JSON.stringify({ src: c && c.src, pedidos: pedidosVideo().length }));
}
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

// ── A · sin sesión ──
red = []; await send('Page.navigate', { url: URL });
let a = null; for (let i = 0; i < 30; i++) { await sleep(500); a = await ev(VID); if (a && a.on && a.t > 0.5) break; }
await send('Page.captureScreenshot', { format: 'png' }).then(s => writeFileSync(`${OUT}/login-${CONTROL ? 'v683' : 'v684'}.png`, Buffer.from(s.data, 'base64')));
const finCodigo = (() => { const pedido = red.find(r => r.ev === 'pide' && /app-7-community\.js/.test(r.url)); const fin = pedido && red.find(r => r.ev === 'fin' && r.rid === pedido.rid); return fin ? fin.t : null; })();
const pideVideo = (pedidosVideo()[0] || {}).t;
if (!CONTROL) {
  check('sin sesión: el login se ve y el video reproduce', a && a.login && !a.marca && a.t > 0.5, JSON.stringify(a));
  check('sin sesión: el video entra con su fundido', a && a.on, JSON.stringify(a));
  check('sin sesión: el video se pide DESPUÉS de cargar todo el código', finCodigo != null && pideVideo != null && pideVideo > finCodigo,
    `código listo ${finCodigo} · video pedido ${pideVideo}`);
}

// ── B · con sesión: login ÚNICO y reabrir ──
await ev(`(()=>{ const o=document.getElementById('avi-loading'); if(o) o.remove(); return 1; })()`);
await ev(`(()=>{ document.getElementById('lu').value=${JSON.stringify(EMAIL)}; document.getElementById('lp').value=${JSON.stringify(PASS)}; doLogin(); return 1; })()`);
let dentro = false; for (let i = 0; i < 120 && !dentro; i++) { dentro = await ev(`(()=>{const e=document.getElementById('s-client');return !!(e&&getComputedStyle(e).display!=='none');})()`); if (!dentro) await sleep(500); }
await sleep(2500);
red = []; await send('Network.setCacheDisabled', { cacheDisabled: true });   // que un pedido se VEA aunque esté en caché
await send('Page.navigate', { url: URL }); await sleep(7000);
const b = await ev(VID);
const bPedidos = pedidosVideo().length;
if (CONTROL) {
  check('CONTROL · en v683 el video se pide aunque haya sesión (la sonda lo detecta)', bPedidos > 0 || (b && b.src), JSON.stringify({ pedidos: bPedidos, src: b && b.src }));
} else {
  check('con sesión: entró con la cuenta QA', dentro, String(dentro));
  check('con sesión: al reabrir, el video NO se pide', bPedidos === 0 && b && !b.src, JSON.stringify({ pedidos: bPedidos, src: b && b.src }));
}
check('cero errores de JS', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
console.log(`URL ${URL}${CONTROL ? '  (CONTROL v683)' : ''}`);
console.log(results.join('\n'));
const malos = results.filter(x => x.startsWith('❌')).length;
console.log(`\n${malos ? '🔴' : '✅'} video v684${CONTROL ? ' (control)' : ''}: ${results.length - malos}/${results.length}`);
try { ws.close(); } catch {} chrome.kill();
process.exit(malos ? 1 : 0);
