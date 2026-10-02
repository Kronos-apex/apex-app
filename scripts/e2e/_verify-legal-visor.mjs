// Verificación de v697: el visor legal del registro muestra los documentos publicados (con el responsable,
// sin «PENDIENTE» ni notas internas de desarrollo).
//   node scripts/e2e/_verify-legal-visor.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8798, DBG = 9298;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-legal-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DBG}`, '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', 'about:blank'], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch(`http://localhost:${DBG}/json/list`); const t = await r.json(); const p = t.find(x => x.type === 'page'); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/');
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch {} };
const waitFor = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };
await send('Page.navigate', { url: APP });
check('MONTAJE: la app arranca', await waitFor(`typeof showLegalDoc==='function' && typeof window._aviUpdateBusy!=='undefined'`, 20000));
for (const [k, debe] of [['politica', /Camilo Andrés Martínez Bejarano/], ['terminos', /Camilo Andrés Martínez Bejarano/]]) {
  await ev(`showLegalDoc('${k}')`);
  await waitFor(`!/Cargando/.test((document.getElementById('legal-body')||{}).textContent||'Cargando')`, 10000);
  const t = await ev(`(document.getElementById('legal-body')||{}).textContent||''`);
  check(`${k}: se carga y nombra al responsable`, debe.test(t), t.slice(0, 80));
  check(`${k}: sin «PENDIENTE», sin notas internas («v565», «Corregido el»)`, !/PENDIENTE|v565|Corregido el|\[CORCHETES\]/.test(t));
  check(`${k}: es la versión 2026-10-01`, /2026-10-01/.test(t));
  await ev(`cm('m-legal')`);
}
check('LEGAL_V es la versión publicada', await ev(`LEGAL_V`) === '2026-10-01', String(await ev('LEGAL_V')));
check('cero errores de JavaScript', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
const fallos = results.filter(r => r.startsWith('FAIL')).length;
log(`\n${results.length - fallos}/${results.length} OK`);
try { ws.close(); } catch {} chrome.kill(); srv.kill();
process.exit(fallos ? 1 : 0);
