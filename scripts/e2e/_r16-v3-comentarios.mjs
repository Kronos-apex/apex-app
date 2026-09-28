// _r16-v3-comentarios.mjs — mide cuanto costaria (en ms) quitar los comentarios del JS al publicar.
// Sirve dos copias LOCALES (NUNCA el repo): orig/ (los 10 scripts tal cual, en un temp folder) y
// stripped/ (los mismos, pasados por esbuild SOLO para quitar comentarios: minify-whitespace,
// minify-identifiers y minify-syntax en false, para no confundir "quitar comentarios" con
// "minificar"). Carga cada una en Chrome headless con CPU x4, INTERCALA A/B/A/B... (para que una
// deriva termica/de fondo no favorezca a un lado), mide performance.now() dentro de la pagina
// (t0 antes del primer script, t1 despues del ultimo) Y Performance.getMetrics (ScriptDuration,
// TaskDuration) del protocolo, y hace la diferencia PAREADA (orig[i]-stripped[i]) en vez de
// comparar promedios sueltos. Lleva un CONTROL: un harness VACIO tiene que medir ~0ms, o la sonda
// no sirve para nada.
//   node scripts/e2e/_r16-v3-comentarios.mjs <dirOrig> <dirStripped> <dirEmpty> [N]
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const [dirOrig, dirStripped, dirEmpty, nArg] = process.argv.slice(2);
const N = Number(nArg || 12);

function serveDir(dir, port) {
  const types = { '.html': 'text/html', '.js': 'application/javascript' };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/harness.html';
    const full = path.join(dir, p);
    fs.readFile(full, (err, data) => {
      if (err) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise(res => srv.listen(port, () => res(srv)));
}

async function medirUrl(url, { cpu = 4, puerto }) {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + puerto, '--user-data-dir=' + process.env.TEMP + '/r16v3b-' + puerto + '-' + Date.now(),
    '--no-first-run', '--window-size=412,915', 'about:blank']);
  let page;
  for (let i = 0; i < 60 && !page; i++) { try { const t = await (await fetch(`http://localhost:${puerto}/json/list`)).json(); page = t.find(x => x.type === 'page'); } catch {} if (!page) await sleep(300); }
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
  let id = 1; const pend = new Map();
  ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
  const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }))?.result?.value;
  await new Promise(r => ws.on('open', r));
  await send('Page.enable'); await send('Runtime.enable'); await send('Performance.enable');
  if (cpu > 1) await send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });

  await send('Page.navigate', { url });
  let done = false;
  for (let i = 0; i < 600 && !done; i++) {
    const r = await ev('window.__harnessDone===true');
    if (r) done = true; else await sleep(30);
  }
  await sleep(100);
  const met = Object.fromEntries(((await send('Performance.getMetrics')).metrics || []).map(x => [x.name, x.value]));
  const t0t1 = await ev('({t0:window.__t0, t1:window.__t1})');
  try { ws.close(); } catch {} chrome.kill();
  return {
    done,
    scriptMs: Math.round((met.ScriptDuration || 0) * 1000),
    taskMs: Math.round((met.TaskDuration || 0) * 1000),
    t0t1Ms: t0t1 && t0t1.t1 != null ? +(t0t1.t1 - t0t1.t0).toFixed(1) : null,
  };
}

function stats(arr) {
  const v = arr.slice().sort((a, b) => a - b);
  const median = v[Math.floor(v.length / 2)];
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  return { median, mean: +mean.toFixed(1), min: v[0], max: v[v.length - 1], n: v.length };
}

console.log('=== CONTROL: harness VACÍO (¿la sonda mide ~0ms?) ===');
const vacioRuns = [];
for (let i = 0; i < 5; i++) { vacioRuns.push(await medirUrl(`http://localhost:${8892}/`, { cpu: 4, puerto: 9503 })); await sleep(200); }
console.log('vacío t0t1Ms:', stats(vacioRuns.map(x => x.t0t1Ms)));
console.log('vacío scriptMs:', stats(vacioRuns.map(x => x.scriptMs)));

console.log('');
console.log(`=== INTERCALADO A(orig)/B(stripped), CPU x4, N=${N} pares ===`);
const pairs = [];
for (let i = 0; i < N; i++) {
  const a = await medirUrl(`http://localhost:8890/`, { cpu: 4, puerto: 9501 });
  await sleep(150);
  const b = await medirUrl(`http://localhost:8891/`, { cpu: 4, puerto: 9502 });
  await sleep(150);
  pairs.push({ i, orig: a, strip: b });
  console.log(`run ${i}: orig t0t1=${a.t0t1Ms}ms script=${a.scriptMs}ms task=${a.taskMs}ms  |  strip t0t1=${b.t0t1Ms}ms script=${b.scriptMs}ms task=${b.taskMs}ms  |  Δt0t1=${(a.t0t1Ms - b.t0t1Ms).toFixed(1)}ms`);
}

const origT0T1 = pairs.map(p => p.orig.t0t1Ms);
const stripT0T1 = pairs.map(p => p.strip.t0t1Ms);
const deltas = pairs.map(p => p.orig.t0t1Ms - p.strip.t0t1Ms);
const origScript = pairs.map(p => p.orig.scriptMs);
const stripScript = pairs.map(p => p.strip.scriptMs);
const deltasScript = pairs.map(p => p.orig.scriptMs - p.strip.scriptMs);

console.log('');
console.log('orig t0t1Ms:', stats(origT0T1));
console.log('strip t0t1Ms:', stats(stripT0T1));
console.log('DELTA pareado t0t1Ms (orig-strip) por corrida:', deltas.map(d => d.toFixed(1)));
console.log('DELTA pareado t0t1Ms stats:', stats(deltas));
console.log('');
console.log('orig scriptMs:', stats(origScript));
console.log('strip scriptMs:', stats(stripScript));
console.log('DELTA pareado scriptMs stats:', stats(deltasScript));
