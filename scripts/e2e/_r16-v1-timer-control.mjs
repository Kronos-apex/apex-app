// _r16-v1-timer-control.mjs — CONTROL puro de CDP: un setTimeout de 3.2s, en about:blank,
// bajo la MISMA emulación de red que _r16-v1-splash-cpu4-4g.mjs, SIN una sola línea de AVI.
// Si esto tampoco dispara, el defecto es del PROBE/Chrome headless, no de la app.
import { spawn } from 'node:child_process';
import WebSocket from 'ws';
const PUERTO = 9481;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${PUERTO}`,
  '--user-data-dir=' + process.env.TEMP + '/r16v1-timer-' + Date.now(),
  '--no-first-run', 'about:blank'
]);
let page = null;
for (let i = 0; i < 60 && !page; i++) { try { const t = await (await fetch(`http://localhost:${PUERTO}/json/list`)).json(); page = t.find(x => x.type === 'page'); } catch {} if (!page) await sleep(300); }
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true }))?.result?.value;
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
console.log('Red throttled a 1.6 Mbps / 150ms RTT. Armando setTimeout(3200) puro en about:blank...');
await ev(`window.__marca=Date.now(); window.__listo=false; setTimeout(()=>{window.__listo=true;window.__tardo=Date.now()-window.__marca;},3200);1`);
for (let s = 0; s <= 20; s += 2) {
  await sleep(2000);
  const r = await ev(`({listo:window.__listo, tardo:window.__tardo||null, ahora:Date.now()-window.__marca})`);
  console.log(`  t=${s+2}s · listo=${r.listo} · tardó=${r.tardo} · reloj_pagina=${r.ahora}ms`);
  if (r.listo) break;
}
try { ws.close(); } catch {} chrome.kill();
process.exit(0);
