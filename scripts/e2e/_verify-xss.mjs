// Verificación E2E de XSS (sesión E / re-barrido 2026-07-12). Regresión PERMANENTE del hueco
// que cazó Julián: el NOMBRE de ejercicio custom (texto libre) llegaba a innerHTML SIN esc()
// en los 2 builders → un ejercicio llamado `<img src=x onerror=...>` ejecutaba al abrir el
// editor. Fix: esc() en app-2:506 (renderTfExList→#tf-exlist) y app-3:1417 (renderRfExList→
// #rf-exlist). Aquí: inyectar el payload en ambos builders y afirmar que NO ejecuta y que
// el DOM contiene la forma ESCAPADA (&lt;img). Patrón preview-SIN-login (funciones globales).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8793;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-xss-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9295', '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9295/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 40000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

try {
  const ready = await waitFor(`typeof renderTfExList==='function' && typeof renderRfExList==='function' && !!document.getElementById('tf-exlist') && !!document.getElementById('rf-exlist')`, 60000);
  if (!ready) throw new Error('no cargaron los builders / contenedores');

  const PAYLOAD = '<img src=x onerror=window.__XSS__=(window.__XSS__||0)+1>';

  // X1 — builder de PLANTILLAS: nombre malicioso en tplExs → render → no ejecuta + escapado.
  await ev(`window.__XSS__=0; tplExs.length=0; tplExs.push({name:${JSON.stringify(PAYLOAD)},muscle:'Pecho',type:'Compuesto',sets:3,reps:10}); renderTfExList();`);
  await sleep(600); // dar tiempo a que un <img> vivo dispare onerror
  let r = JSON.parse(await ev(`JSON.stringify({xss:window.__XSS__||0, esc:document.getElementById('tf-exlist').innerHTML.includes('&lt;img'), rawImg:/<img src=x onerror/.test(document.getElementById('tf-exlist').innerHTML)})`));
  check('X1 plantillas: nombre <img onerror> NO ejecuta + queda escapado', r.xss === 0 && r.esc === true && r.rawImg === false, JSON.stringify(r));

  // X2 — builder de RUTINAS: nombre malicioso en CUR.routineExs → render → no ejecuta + escapado.
  await ev(`window.__XSS__=0; CUR.routineExs=[{name:${JSON.stringify(PAYLOAD)},muscle:'Pecho',type:'Compuesto',sets:3,reps:10,restSec:60}]; try{renderRfExList();}catch(e){window.__RFERR__=e.message;}`);
  await sleep(600);
  r = JSON.parse(await ev(`JSON.stringify({xss:window.__XSS__||0, esc:document.getElementById('rf-exlist').innerHTML.includes('&lt;img'), rawImg:/<img src=x onerror/.test(document.getElementById('rf-exlist').innerHTML), rferr:window.__RFERR__||null})`));
  check('X2 rutinas: nombre <img onerror> NO ejecuta + queda escapado', r.xss === 0 && r.esc === true && r.rawImg === false, JSON.stringify(r));

  // X3 — control negativo: confirmar que el mecanismo del test detectaría un XSS real (un <img
  //     onerror insertado CRUDO en el DOM SÍ prende el flag) → si X3 no prende, el test miente.
  await ev(`window.__XSSCTL__=0; const d=document.createElement('div'); d.innerHTML='<img src=x onerror=window.__XSSCTL__=1>'; document.body.appendChild(d);`);
  await sleep(600);
  const ctl = await ev(`window.__XSSCTL__||0`);
  check('X3 control: un <img onerror> CRUDO SÍ ejecuta (el test no miente)', ctl === 1, 'flag=' + ctl);

  const fails = results.filter(l => l.startsWith('FAIL'));
  log('\n' + (fails.length ? '❌ ' + fails.length + ' FALLA(S)' : '✅ TODO OK (' + results.length + '/' + results.length + ')'));
  process.exitCode = fails.length ? 1 : 0;
} catch (e) {
  log('💥 ERROR:', e.message); process.exitCode = 1;
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
  await sleep(300);
}
