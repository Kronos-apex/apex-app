// Smoke test de arranque — red de seguridad para la capa de "glue" de index.html
// (que NO tiene tests unitarios, a diferencia de apex-core.js). Levanta un server
// estático, abre la app en Chrome headless del sistema vía CDP y FALLA si:
//   · hay alguna excepción JS no capturada al arrancar, o
//   · no cargó el core (generarRutinas) o la UI (renderClientToday) — eso delata
//     errores de sintaxis / parse en apex-core.js o en el script de index.html, o
//   · no se pinta la pantalla de login (#s-login).
// Sin dependencias: usa el WebSocket nativo de Node 24. Uso: node scripts/smoke.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css',
  '.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.mp4':'video/mp4',
  '.webp':'image/webp','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      // En producción la app vive en /apex-app/ → espeja esa base para que las rutas
      // absolutas (manifest, iconos) resuelvan igual que en GitHub Pages.
      if (p.startsWith('/apex-app/')) p = p.slice('/apex-app'.length);
      if (p === '/' || p === '/apex-app') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function cdp(ws) {
  let id = 0; const pending = new Map(); const events = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result); }
    else if (m.method) events.push(m);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
  return { send, events };
}

async function main() {
  const server = await startServer();
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/index.html`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'avi-smoke-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', `--user-data-dir=${tmp}`,
    '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });

  let fail = null;
  try {
    // Espera a que Chrome publique su puerto de depuración.
    const portFile = path.join(tmp, 'DevToolsActivePort');
    let dport = null;
    for (let i = 0; i < 100 && !dport; i++) {
      if (fs.existsSync(portFile)) dport = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
      else await sleep(100);
    }
    if (!dport) throw new Error('Chrome no arrancó (sin DevToolsActivePort)');

    // Busca el target de página.
    let wsUrl = null;
    for (let i = 0; i < 50 && !wsUrl; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${dport}/json`)).json();
        const pg = list.find(t => t.type === 'page');
        if (pg) wsUrl = pg.webSocketDebuggerUrl;
      } catch {}
      if (!wsUrl) await sleep(100);
    }
    if (!wsUrl) throw new Error('No se encontró el target de página de Chrome');

    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const { send, events } = await cdp(ws);
    await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');

    await send('Page.navigate', { url });
    // Espera al load + un margen para que arranque la app.
    for (let i = 0; i < 100; i++) { if (events.some(e => e.method === 'Page.loadEventFired')) break; await sleep(100); }
    await sleep(2500);

    // Recolecta señales de error.
    const exceptions = events.filter(e => e.method === 'Runtime.exceptionThrown')
      .map(e => e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || 'excepción');
    const consoleErrors = events.filter(e => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')
      .map(e => (e.params.args || []).map(a => a.value || a.description || a.type).join(' '));
    const logErrors = events.filter(e => e.method === 'Log.entryAdded' && e.params.entry?.level === 'error')
      .map(e => e.params.entry.text);

    const checks = await send('Runtime.evaluate', { returnByValue: true, expression: `({
      hasLogin: !!document.getElementById('s-login'),
      coreLoaded: typeof generarRutinas === 'function',
      uiLoaded: typeof renderClientToday === 'function',
      bodyKids: document.body ? document.body.children.length : 0
    })` });
    const r = checks.result.value;

    // Captura opcional para revisión visual: node scripts/smoke.mjs --shot
    if (process.argv.includes('--shot')) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const out = path.join(import.meta.dirname, '_smoke-shot.png');
      fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
      console.log('  📸 screenshot:', out);
    }

    console.log('— Smoke de arranque —');
    console.log('  #s-login presente :', r.hasLogin);
    console.log('  core cargado      :', r.coreLoaded, '(generarRutinas)');
    console.log('  UI cargada        :', r.uiLoaded, '(renderClientToday)');
    console.log('  hijos en <body>   :', r.bodyKids);
    if (consoleErrors.length) console.log('  ⚠️ console.error :', consoleErrors.length, '→', consoleErrors.slice(0,5));
    if (logErrors.length)     console.log('  ⚠️ errores de log:', logErrors.length, '→', logErrors.slice(0,5));

    const problems = [];
    if (exceptions.length) problems.push('excepciones JS no capturadas: ' + exceptions.slice(0,5).join(' | '));
    if (!r.hasLogin)   problems.push('no se pintó la pantalla de login (#s-login)');
    if (!r.coreLoaded) problems.push('apex-core.js no cargó (generarRutinas indefinido) — ¿error de sintaxis?');
    if (!r.uiLoaded)   problems.push('el script de index.html no cargó (renderClientToday indefinido) — ¿error de sintaxis?');
    if (!r.bodyKids)   problems.push('<body> vacío');
    if (problems.length) fail = problems;

    try { ws.close(); } catch {}
  } catch (e) {
    fail = [e.message];
  } finally {
    try { chrome.kill(); } catch {}
    try { server.close(); } catch {}
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }

  if (fail) { console.error('\n❌ SMOKE FALLÓ:\n  - ' + fail.join('\n  - ')); process.exit(1); }
  console.log('\n✅ SMOKE OK — la app arranca sin errores y pinta el login.');
  process.exit(0);
}
main();
