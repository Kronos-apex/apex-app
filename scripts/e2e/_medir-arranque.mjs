// _medir-arranque.mjs — ¿CUÁNTO TARDA AVI EN ABRIR? (R16, «peso y velocidad», 28-sep-2026)
//
// Mide contra PRODUCCIÓN (solo lectura, sin login) lo que tarda la app en quedar lista para usarse:
// la pantalla de entrada pintada y el arranque terminado (`_aviUpdateBusy`, el símbolo que define
// initPWA al final del boot — gotcha v624: el DOM presente NO es la app arrancada).
// Tres perfiles: escritorio sin freno (referencia), y un teléfono de gama media emulado (CPU ×4 y red
// «4G lenta» de Lighthouse: 1,6 Mbps de bajada, 150 ms de ida y vuelta), en primera visita (sin caché)
// y en la segunda (con el service worker ya instalado, que es el caso de todos los días).
//   node scripts/e2e/_medir-arranque.mjs [url]      · imprime una tabla, no afirma nada
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const URL = process.argv[2] || 'https://app.avientrena.com/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function medir(nombre, { cpu = 1, red = null, repetir = false, puerto }) {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + puerto, '--user-data-dir=' + process.env.TEMP + '/arranque-' + puerto + '-' + Date.now(),
    '--no-first-run', '--window-size=412,915', 'about:blank']);
  let page;
  for (let i = 0; i < 60 && !page; i++) { try { const t = await (await fetch(`http://localhost:${puerto}/json/list`)).json(); page = t.find(x => x.type === 'page'); } catch {} if (!page) await sleep(300); }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
  let id = 1; const pend = new Map(); let bytes = 0;
  ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
    if (m.method === 'Network.loadingFinished') bytes += m.params.encodedDataLength || 0; });
  const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true }))?.result?.value;
  await new Promise(r => ws.on('open', r));
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Performance.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2.6, mobile: true });
  if (cpu > 1) await send('Emulation.setCPUThrottlingRate', { rate: cpu });
  if (red) await send('Network.emulateNetworkConditions', { offline: false, latency: red.rtt, downloadThroughput: red.down, uploadThroughput: red.up });
  const cargar = async () => {
    bytes = 0;
    const t0 = Date.now();
    await send('Page.navigate', { url: URL });
    let pintado = null, listo = null;
    for (let i = 0; i < 1200 && listo == null; i++) {
      const r = await ev(`(()=>{const l=document.getElementById('s-login');const vis=!!(l&&getComputedStyle(l).display!=='none'&&!document.getElementById('avi-loading'));return {vis, listo:!!window._aviUpdateBusy};})()`);
      if (r && r.vis && pintado == null) pintado = Date.now() - t0;
      if (r && r.listo && r.vis) listo = Date.now() - t0;
      if (listo == null) await sleep(100);
    }
    await sleep(300);
    const met = Object.fromEntries(((await send('Performance.getMetrics')).metrics || []).map(x => [x.name, x.value]));
    return { pintado, listo, kb: Math.round(bytes / 1024), script: Math.round((met.ScriptDuration || 0) * 1000), tareas: Math.round((met.TaskDuration || 0) * 1000),
      layout: Math.round((met.LayoutDuration || 0) * 1000), heapMB: +((met.JSHeapUsedSize || 0) / 1048576).toFixed(1) };
  };
  const primera = await cargar();
  let segunda = null;
  if (repetir) { await sleep(2500); segunda = await cargar(); }
  try { ws.close(); } catch {} chrome.kill();
  return { nombre, primera, segunda };
}

const RED_4G_LENTA = { down: 1.6 * 1024 * 1024 / 8, up: 750 * 1024 / 8, rtt: 150 };
const filas = [];
filas.push(await medir('escritorio, sin freno', { puerto: 9471, repetir: true }));
filas.push(await medir('teléfono gama media (CPU ×4, 4G lenta)', { cpu: 4, red: RED_4G_LENTA, puerto: 9472, repetir: true }));
filas.push(await medir('teléfono gama media, red buena (CPU ×4)', { cpu: 4, puerto: 9473, repetir: true }));
console.log('URL:', URL);
console.log('perfil · visita · pantalla de entrada pintada (ms) · arranque terminado (ms) · KB por red · JS ejecutando (ms) · tareas (ms) · layout (ms) · memoria JS (MB)');
for (const f of filas) for (const [v, r] of [['1ª', f.primera], ['2ª', f.segunda]]) if (r)
  console.log(`${f.nombre} · ${v} · ${r.pintado} · ${r.listo} · ${r.kb} · ${r.script} · ${r.tareas} · ${r.layout} · ${r.heapMB}`);
process.exit(0);
