// _r16-v1-bytes-primera-visita.mjs — R16 V1 (H5): desglose de los ~2,9 MB de la PRIMERA visita
// por tipo de recurso (código propio vs fuentes de Google vs íconos vs SW), contra producción,
// red normal (sin throttle, para que sea una medición limpia de bytes, no de tiempo).
// SOLO LECTURA. Puerto CDP 9483.
import { spawn } from 'node:child_process';
import WebSocket from 'ws';
const URL = 'https://app.avientrena.com/';
const PUERTO = 9483;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${PUERTO}`,
  '--user-data-dir=' + process.env.TEMP + '/r16v1-bytes-' + Date.now(),
  '--no-first-run', '--window-size=412,915', 'about:blank'
]);
let page = null;
for (let i = 0; i < 60 && !page; i++) { try { const t = await (await fetch(`http://localhost:${PUERTO}/json/list`)).json(); page = t.find(x => x.type === 'page'); } catch {} if (!page) await sleep(300); }
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
const reqs = new Map();
ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, { url: m.params.request.url, initiator: (m.params.initiator || {}).type });
  if (m.method === 'Network.responseReceived') { const r = reqs.get(m.params.requestId); if (r) { r.mime = m.params.response.mimeType; r.fromCache = !!m.params.response.fromDiskCache; } }
  if (m.method === 'Network.loadingFinished') { const r = reqs.get(m.params.requestId); if (r) r.bytes = m.params.encodedDataLength || 0; }
});
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true }))?.result?.value;
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.6, mobile: true });
await send('Page.navigate', { url: URL });
// Esperar a que arranque de verdad Y a que el SW termine de instalar (para contar SU precache).
let listo = false;
for (let i = 0; i < 60 && !listo; i++) { listo = await ev('!!window._aviUpdateBusy'); if (!listo) await sleep(500); }
console.log('arrancó:', listo);
// Dar tiempo a que el install event del SW (que corre en paralelo) termine de precachear el SHELL.
await sleep(6000);
let bytesTotal = 0;
const cat = { 'propio-js/css/html': 0, 'google-fonts': 0, 'iconos-manifest': 0, 'supabase': 0, 'otro': 0 };
const detalle = [];
for (const [, r] of reqs) {
  const b = r.bytes || 0; bytesTotal += b;
  let c = 'otro';
  if (/googleapis\.com|gstatic\.com/.test(r.url)) c = 'google-fonts';
  else if (/supabase\.co/.test(r.url)) c = 'supabase';
  else if (/icons\/|manifest\.json|badge-96/.test(r.url)) c = 'iconos-manifest';
  else if (/app\.avientrena\.com/.test(r.url) && /\.(js|css|html)(\?|$)/.test(r.url)) c = 'propio-js/css/html';
  else if (/app\.avientrena\.com\/$/.test(r.url)) c = 'propio-js/css/html';
  cat[c] += b;
  detalle.push({ url: r.url, bytes: b, mime: r.mime, cache: r.fromCache, cat: c });
}
console.log('\nBYTES TOTALES (primera visita, red normal, incl. lo que el SW precachea de fondo):', Math.round(bytesTotal / 1024), 'KB, en', reqs.size, 'peticiones');
console.log('\nPor categoría (KB):');
for (const [k, v] of Object.entries(cat)) console.log('  ', k.padEnd(22), Math.round(v / 1024));
console.log('\nDetalle (>2KB), ordenado por tamaño:');
detalle.filter(d => d.bytes > 2048).sort((a, b) => b.bytes - a.bytes).forEach(d => {
  console.log('  ', String(Math.round(d.bytes / 1024)).padStart(5), 'KB ·', d.cat.padEnd(20), '·', d.url.replace('https://app.avientrena.com/', './').replace('https://eoebhrxbokyllqalyecj.supabase.co', 'SUPABASE'));
});
console.log('\nPeticiones DUPLICADAS a la MISMA url (evidencia del doble-fetch: navegación + SW install):');
const porUrl = {};
detalle.forEach(d => { porUrl[d.url] = (porUrl[d.url] || 0) + 1; });
Object.entries(porUrl).filter(([, n]) => n > 1).forEach(([u, n]) => console.log('  ', n, 'x ·', u.replace('https://app.avientrena.com/', './')));

try { ws.close(); } catch {} chrome.kill();
process.exit(0);
