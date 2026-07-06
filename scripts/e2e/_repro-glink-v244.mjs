// Verificación avi-v244 — retorno de "Conectar mi Google" (caso Luz 2026-07-02):
//   G1  volver de Google con #error= en el hash → toast en español (antes se PERDÍA en silencio)
//       + flag ax_glink_pending consumido + hash limpiado de la URL
//   G2  retorno exitoso (identidad google presente) → toast de éxito + hint fuera de standalone
//   G3  retorno sin confirmar (sin identidad google) → toast honesto
//   G4  sin flag → el handler no hace nada (boot normal intacto)
// Basado en _repro-back-v243.mjs. Sirve el repo local + Chrome headless por CDP.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';

const PORT = 8765;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-glink244-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9265', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
chrome.on('error', e => { console.error('chrome', e); process.exit(1); });
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9265/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };

await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (name, cond, extra = '') => { const line = (cond ? 'OK ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''); results.push(line); log('  ' + line); };
const toastTxt = () => ev(`(()=>{const t=document.getElementById('toast');return (t&&t.classList.contains('on'))?t.textContent:''})()`);
// Espera a que el toast contenga un texto dado (el handler corre 1.5s tras detectar sesión)
const waitToast = async (needle, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { const x = await toastTxt(); if (x && x.indexOf(needle) >= 0) return x; await sleep(300); } return await toastTxt(); };

async function bootClean() {
  await send('Page.navigate', { url: APP });
  await sleep(500);
  await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
}

async function ensureLoggedIn() {
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&!document.getElementById('avi-loading'))})()`, 25000);
  let inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  for (let tryN = 0; tryN < 3 && !inApp; tryN++) {
    if (tryN) await sleep(4000); // GoTrue a veces devuelve fallo transitorio (rate limit)
    await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
    await ev(`doLogin()`);
    await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 20000);
    inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  }
  await sleep(2000);
  for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
}

try {
  // ── Setup: login real una vez (deja la sesión auth viva en el perfil) ──
  await bootClean();
  await send('Page.navigate', { url: APP });
  await ensureLoggedIn();
  const logged = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  if (!logged) {
    const dbg = await ev(`JSON.stringify({lerr:(document.getElementById('lerr')||{}).textContent||'', loginOn:(()=>{const e=document.getElementById('s-login');return e?getComputedStyle(e).display:'?'})(), splash:!!document.getElementById('avi-loading'), authReady:(typeof AUTH!=='undefined')?AUTH.ready():'?'})`);
    log('  DEBUG setup: ' + dbg);
  }
  check('setup: sesión samuel entrada', logged);

  // ── G1: recarga CON flag + hash de error de GoTrue (lo que Luz habría visto si fallaba) ──
  log('\n=== G1: boot con ax_glink_pending + #error_code=identity_already_exists ===');
  await ev(`localStorage.setItem('ax_glink_pending',String(Date.now()))`);
  // OJO: navegar de APP a APP#hash es same-document (no recarga, no re-parsea _OAUTH_RET).
  // Pasar por about:blank fuerza una carga completa, como el retorno real desde Google.
  await send('Page.navigate', { url: 'about:blank' }); await sleep(400);
  await send('Page.navigate', { url: APP + '#error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user' });
  const t1 = await waitToast('Ese Google ya está usado');
  check('G1 toast de error en ESPAÑOL visible', t1.indexOf('Ese Google ya está usado') >= 0, 'toast="' + t1 + '"');
  // Hallazgo Lucas: con white-space:nowrap el mensaje largo se salía de la pantalla.
  const tbox = await ev(`(()=>{const r=document.getElementById('toast').getBoundingClientRect();return JSON.stringify({w:Math.round(r.width),l:Math.round(r.left),rgt:Math.round(r.right),vw:window.innerWidth})})()`);
  const tb = JSON.parse(tbox);
  check('G1 toast CABE en el viewport (multilínea)', tb.l >= 0 && tb.rgt <= tb.vw && tb.w <= tb.vw - 30, tbox);
  check('G1 flag consumido', (await ev(`localStorage.getItem('ax_glink_pending')`)) === null);
  check('G1 hash limpiado de la URL', (await ev(`location.hash`)) === '', 'hash=' + (await ev(`location.hash`)));
  const guard1 = await ev(`history.state&&(history.state.aviGuard===1||history.state.aviLayer===1)?1:0`);
  check('G1 guard del atrás intacto tras replaceState', guard1 === 1, 'state=' + JSON.stringify(await ev(`history.state`)));

  // ── G2: retorno EXITOSO (identidad google presente) → toast de éxito + hint no-standalone ──
  // Recarga LIMPIA (sin hash): en la vida real cada retorno de Google es una carga nueva,
  // y _OAUTH_RET es const de parse-time — llamar el handler sobre la página de G1 (que
  // cargó con #error=) contaminaría el caso.
  log('\n=== G2: retorno exitoso (getUser con identidad google) ===');
  await send('Page.navigate', { url: 'about:blank' }); await sleep(400);
  await send('Page.navigate', { url: APP });
  await waitFor(`typeof AUTH!=='undefined'&&AUTH.ready()&&typeof _handleGoogleLinkReturn==='function'`, 15000);
  await sleep(2500); // deja pasar el _handleGoogleLinkReturn del boot (sin flag = inerte)
  await ev(`(()=>{localStorage.setItem('ax_glink_pending',String(Date.now()));AUTH.getUser=async()=>({id:'x',identities:[{provider:'google'}]});})()`);
  await ev(`_handleGoogleLinkReturn()`);
  const t2 = await waitToast('Google conectado', 6000);
  check('G2 toast de ÉXITO visible', t2.indexOf('✅ ¡Google conectado!') >= 0, 'toast="' + t2 + '"');
  check('G2 flag consumido', (await ev(`localStorage.getItem('ax_glink_pending')`)) === null);
  const t2b = await waitToast('volver a la app AVI', 9000);
  check('G2 hint no-standalone (vuelve a la app por el ícono)', t2b.indexOf('volver a la app AVI') >= 0, 'toast="' + t2b + '"');

  // ── G3: retorno SIN confirmar (sin identidad google) → toast honesto ──
  log('\n=== G3: retorno sin identidad google ===');
  await ev(`(()=>{localStorage.setItem('ax_glink_pending',String(Date.now()));AUTH.getUser=async()=>({id:'x',identities:[{provider:'email'}]});})()`);
  await ev(`_handleGoogleLinkReturn()`);
  const t3 = await waitToast('No se pudo confirmar', 6000);
  check('G3 toast honesto "no se pudo confirmar"', t3.indexOf('No se pudo confirmar') >= 0, 'toast="' + t3 + '"');

  // ── G4: SIN flag → el handler no toca nada ──
  log('\n=== G4: sin flag, handler inerte ===');
  await ev(`(()=>{const t=document.getElementById('toast');t.classList.remove('on');t.textContent='';})()`);
  await ev(`_handleGoogleLinkReturn()`);
  await sleep(1200);
  const t4 = await toastTxt();
  check('G4 sin flag: sin toast', t4 === '', 'toast="' + t4 + '"');

  // ── G5: flag VIEJO (>10 min, usuario abandonó en Google) → descarte silencioso ──
  log('\n=== G5: flag viejo, descarte silencioso ===');
  await ev(`(()=>{localStorage.setItem('ax_glink_pending',String(Date.now()-11*60*1000));const t=document.getElementById('toast');t.classList.remove('on');t.textContent='';})()`);
  await ev(`_handleGoogleLinkReturn()`);
  await sleep(1200);
  const t5 = await toastTxt();
  check('G5 flag viejo: sin toast espurio', t5 === '', 'toast="' + t5 + '"');
  check('G5 flag viejo igual se consume', (await ev(`localStorage.getItem('ax_glink_pending')`)) === null);

} catch (e) { results.push('FATAL ' + e.message); }
finally {
  const errs = [...new Set(jsErrors)].slice(0, 8);
  log('\n===RESUMEN===');
  results.forEach(r => log(r));
  log('jsErrors: ' + JSON.stringify(errs));
  const bad = results.filter(r => !r.startsWith('OK'));
  log(bad.length ? `\n${bad.length} FALLA(S)` : '\nTODO OK');
  ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
  await sleep(300); process.exit(bad.length ? 1 : 0);
}
