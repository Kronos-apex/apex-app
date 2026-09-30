// _verify-sesion-cerrada.mjs — v693 · cuando el SERVIDOR cierra la sesión, la persona sale al login y se le dice.
//
// Nace de R17 A1 (docs/auditoria-construido-2026-09-30/A1-entrar.md, Q1): con la sesión revocada la app
// entraba «como sin red», lo que se anotaba no subía y nadie avisaba. Este harness reproduce la revocación
// con la cuenta QA de ASESORADO (~/.avi/e2e-creds.json) y NINGUNA otra: inicia sesión en el navegador (app
// LOCAL, con el sello cloudWriteSealed: no escribe datos a producción), guarda la foto del localStorage y
// cierra sesión a mano — `signOut` es global, así que esos tokens quedan revocados en el servidor. Luego
// restaura la foto en 5 escenarios de red.
//   Controles: (A) con la sesión VÁLIDA entra y se queda, sin aviso · (B) salir a mano NO muestra el aviso.
//   Esperado tras v693: 1-2 → login CON aviso, sin entrar · 3-5 → entra sin red y, al volver la red, login
//   CON aviso · en todos, lo anotado sigue en la copia local con la marca de pendiente.
// exit 1 si algo falla. Rate limit del login ~2-3 min: hace UN solo inicio de sesión.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir, homedir } from 'node:os';
const require = createRequire(import.meta.url);
const WebSocket = require('ws');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const C = JSON.parse(readFileSync(join(homedir(), '.avi', 'e2e-creds.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
const PORT = 8931, DBG = 9531;
const srv = createServer((req, res) => {
  const ruta = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html';
  const f = join(ROOT, ruta);
  if (!existsSync(f) || !f.startsWith(ROOT)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(f));
});
await new Promise(r => srv.listen(PORT, r));
const APP = `http://localhost:${PORT}/`;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + DBG,
  '--user-data-dir=' + join(tmpdir(), 'avi-v693-' + Date.now()), '--no-first-run', '--window-size=390,844', 'about:blank']);
let ver; for (let i = 0; i < 60 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${DBG}/json/version`)).json(); } catch { await sleep(300); } }
const ws = new WebSocket(ver.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const sesiones = new Set(); const jsErrors = [];
let modo = 'normal';           // normal | colgada | lenta | (offline por emulación)
const pausados = [];
const send = (method, params = {}, sessionId) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); });
ws.on('message', d => { const m = JSON.parse(d);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || m.error); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'exception');
  if (m.method === 'Fetch.requestPaused') {
    const esNube = /supabase\.co/.test(m.params.request.url);
    if (esNube && modo === 'colgada') pausados.push({ s: m.sessionId, rid: m.params.requestId });
    else if (esNube && modo === 'lenta') setTimeout(() => send('Fetch.continueRequest', { requestId: m.params.requestId }, m.sessionId).catch(() => {}), 4500);
    else send('Fetch.continueRequest', { requestId: m.params.requestId }, m.sessionId);
  }
  if (m.method === 'Target.attachedToTarget') enganchar(m.params.sessionId, m.params.targetInfo.type); });
async function enganchar(s, tipo) {
  if (sesiones.has(s)) return; sesiones.add(s);
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] }, s);
  await send('Network.enable', {}, s).catch(() => {});
  if (tipo === 'page') { await send('Page.enable', {}, s); await send('Runtime.enable', {}, s); }
  await send('Runtime.runIfWaitingForDebugger', {}, s);
}
await new Promise(r => ws.on('open', r));
await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
const { targetInfos } = await send('Target.getTargets');
const { sessionId: P } = await send('Target.attachToTarget', { targetId: targetInfos.find(t => t.type === 'page').targetId, flatten: true });
await enganchar(P, 'page');
await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, P);
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }, P); return r && r.result ? r.result.value : null; };
const setOffline = async v => { for (const s of sesiones) await send('Network.emulateNetworkConditions', { offline: v, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, s).catch(() => {}); };
const soltar = async () => { modo = 'normal'; for (const p of pausados.splice(0)) await send('Fetch.failRequest', { requestId: p.rid, errorReason: 'Aborted' }, p.s).catch(() => {}); await setOffline(false); };

const ESTADO = `(()=>{ const vis=id=>{const e=document.getElementById(id);return !!(e&&getComputedStyle(e).display!=='none'&&e.offsetParent!==null)};
  const av=document.getElementById('lclosed');
  return { listo:!!window._aviUpdateBusy, splash:!!document.getElementById('avi-loading'), cliente:vis('s-client'), login:vis('s-login'),
    aviso:vis('lclosed'), avisoTxt:(av&&av.textContent)||'', auth:!!localStorage.getItem('avi_auth'),
    pendiente:Object.keys(localStorage).filter(k=>k.startsWith('ax_udirty_')).map(k=>localStorage.getItem(k)).join(','),
    copia:Object.keys(localStorage).filter(k=>k.startsWith('ax_udcache_')).length }; })()`;
const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const esperar = async (cond, ms) => { const t0 = Date.now(); let s = null; while (Date.now() - t0 < ms) { s = await ev(ESTADO); if (s && cond(s)) return { s, t: Date.now() - t0 }; await sleep(250); } return { s, t: null }; };

// ── Inicio de sesión A (el ÚNICO de la corrida) ──
await send('Page.navigate', { url: APP }, P);
await esperar(s => s.listo, 20000);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(C.email)};document.getElementById('lp').value=${JSON.stringify(C.pass)};doLogin();return 1})()`);
const dentro = await esperar(s => s.cliente, 45000);
if (!dentro.t && dentro.t !== 0) { console.error('🔴 sonda rota: no entró con la cuenta QA', JSON.stringify(dentro.s)); chrome.kill(); srv.close(); process.exit(1); }
await sleep(5000);   // que se guarde la copia local de su fila
const S = JSON.parse(await ev(`JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])))`));
if (!S.avi_auth || !Object.keys(S).some(k => k.startsWith('ax_udcache_'))) { console.error('🔴 sonda rota: sin sesión o sin copia local guardada'); chrome.kill(); srv.close(); process.exit(1); }

// ── Control A: con la sesión VÁLIDA, recargar → entra y se queda, sin aviso ──
await send('Page.navigate', { url: APP }, P);
const ca = await esperar(s => s.listo && s.cliente, 20000);
await sleep(8000);
const ca2 = await ev(ESTADO);
check('A control: con la sesión válida entra y a los 8 s sigue adentro, sin aviso', ca.t != null && ca2.cliente && !ca2.aviso, JSON.stringify({ entra: ca.t, sigue: ca2.cliente, aviso: ca2.aviso }));

// ── Control B: salir a mano → login SIN aviso. Y como `signOut` es global, revoca los tokens de S. ──
await ev(`logout()`);
const cb = await esperar(s => s.login, 10000);
await sleep(2500);
const cb2 = await ev(ESTADO);
check('B control: salir a mano deja el login SIN el aviso de sesión cerrada', cb.t != null && cb2.login && !cb2.aviso, JSON.stringify({ login: cb2.login, aviso: cb2.aviso }));

// ── Los 5 escenarios, con la sesión ya revocada por el servidor ──
async function escenario(nombre, { vencer, red, entraSinRed }) {
  await soltar();
  await send('Page.navigate', { url: APP + 'manifest.json' }, P); await sleep(600);
  const st = JSON.parse(JSON.stringify(S));
  if (vencer) { const o = JSON.parse(st.avi_auth); o.expires_at = Math.floor(Date.now() / 1000) - 3600; st.avi_auth = JSON.stringify(o); }
  // Sin marca de pendiente de antes: la que se vea al final tiene que venir del peso que se anota aquí.
  for (const k of Object.keys(st)) if (k.startsWith('ax_udirty_')) delete st[k];
  await ev(`(()=>{ localStorage.clear(); const d=${JSON.stringify(st)}; for(const k in d) localStorage.setItem(k,d[k]); return 1; })()`);
  if (red === 'offline') await setOffline(true);
  if (red === 'colgada') modo = 'colgada';
  if (red === 'lenta') modo = 'lenta';
  await send('Page.navigate', { url: APP }, P);
  if (!entraSinRed) {
    const r = await esperar(s => s.listo && !s.splash && (s.cliente || (s.login && s.aviso)), 20000);
    check(`${nombre}: sale al login CON el aviso y no entra`, r.t != null && r.s.login && r.s.aviso && !r.s.cliente, JSON.stringify({ t: r.t, login: r.s && r.s.login, aviso: r.s && r.s.aviso, cliente: r.s && r.s.cliente }));
    check(`${nombre}: la copia local se queda`, r.s && r.s.copia > 0, JSON.stringify({ copia: r.s && r.s.copia }));
    return;
  }
  const e = await esperar(s => s.listo && s.cliente, 20000);
  check(`${nombre}: sin respuesta de la nube entra con su copia (v688, por diseño)`, e.t != null, JSON.stringify({ t: e.t }));
  // Anota un peso SIN escribir en producción: réplica de UD.upsertOwn que lanza lo mismo si no hay sesión.
  await ev(`(()=>{ UD.upsertOwn = async function(patch){ const c=AUTH.client();const u=await AUTH.getUser();if(!c||!u)throw new Error('Sin sesión'); return null; };
    const el=document.getElementById('bw-kg'); if(el){ el.value='71.5'; try{ logBodyWeight(); }catch(_e){} } return 1; })()`);
  await sleep(1500);
  await soltar(); await ev(`window.dispatchEvent(new Event('online'))`);
  const f = await esperar(s => s.login && s.aviso, 45000);
  check(`${nombre}: al volver la red sale al login CON el aviso`, f.t != null && !f.s.cliente, JSON.stringify({ t: f.t, login: f.s && f.s.login, aviso: f.s && f.s.aviso, cliente: f.s && f.s.cliente }));
  check(`${nombre}: lo anotado sigue guardado (copia + marca de pendiente)`, f.s && f.s.copia > 0 && /1/.test(f.s.pendiente), JSON.stringify({ copia: f.s && f.s.copia, pendiente: f.s && f.s.pendiente }));
}
await escenario('1 red buena · token SIN vencer', { vencer: false, red: 'normal', entraSinRed: false });
await escenario('2 red buena · token VENCIDO', { vencer: true, red: 'normal', entraSinRed: false });
await escenario('3 WiFi colgada · token vencido', { vencer: true, red: 'colgada', entraSinRed: true });
await escenario('4 SIN red · token vencido', { vencer: true, red: 'offline', entraSinRed: true });
await escenario('5 red lenta (+4,5 s) · token vencido', { vencer: true, red: 'lenta', entraSinRed: true });

const txt = (await ev(ESTADO)).avisoTxt;
check('T el aviso dice qué pasó y que lo anotado está guardado', /sesión se cerró/.test(txt) && /guardado/.test(txt), txt);
check('Z cero errores de JavaScript', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));
console.log(results.join('\n'));
try { ws.close(); } catch {} chrome.kill(); srv.close();
process.exit(results.every(r => r.startsWith('✅')) ? 0 : 1);
