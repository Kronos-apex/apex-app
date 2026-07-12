// BOOT-CHECK DE PRODUCCIÓN — paso fijo pos-deploy (adoptado 2026-07-12 a pedido de Camilo).
// El curl confirma que el ARCHIVO está servido; esto confirma que la app ARRANCA sin errores
// contra la URL real y trae el código nuevo. Uso: `node scripts/e2e/_prodcheck.mjs [vNNN]`
// (vNNN opcional = versión esperada, p.ej. 326; si se pasa, falla si prod sirve otra).
//
// 🔒 CANDADO (bug 2026-07-12): NUNCA usar "DOM presente" (#s-login / funciones top-level) como
// señal de "app lista" — existen al PARSEAR. El boot real (initPWA + tema + sesión) corre DENTRO
// de `syncFromCloud().then()` (app-2) → en prod tarda ~4s por la red a Supabase. Se espera el
// SÍMBOLO REAL post-boot: `window._aviUpdateBusy` (lo define initPWA) con timeout amplio.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const EXPECT = (process.argv[2] || '').replace(/^v/, '').trim(); // '326' | ''
const URL = 'https://kronos-apex.github.io/apex-app/?nocache=' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9293', '--user-data-dir=' + process.env.TEMP + '/prodcheck-' + Date.now(), '--no-first-run', '--window-size=390,844', URL]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9293/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('kronos-apex')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');

// Señal REAL de "app booteada": _aviUpdateBusy lo define initPWA (tras syncFromCloud). Timeout amplio.
const t0 = Date.now(); let booted = false;
while (Date.now() - t0 < 45000) { if (await ev(`typeof window._aviUpdateBusy==='function'`)) { booted = true; break; } await sleep(500); }
const secs = Math.round((Date.now() - t0) / 1000);
const served = (await ev(`(document.querySelector('script[src*="app-1-infra"]')||{}).src||''`) || '').match(/\?v=(\d+)/);
const version = served ? served[1] : '?';
const feats = JSON.parse(await ev(`JSON.stringify({login:!!document.getElementById('s-login'),core:typeof generarRutinas==='function',renderToday:typeof renderClientToday==='function'})`));

const versionOK = !EXPECT || version === EXPECT;
const pass = booted && feats.login && feats.core && feats.renderToday && jsErrors.length === 0 && versionOK;
console.log(`boot (initPWA) definido:  ${booted}  (tras ${secs}s)`);
console.log(`version servida:          v${version}${EXPECT ? '  (esperada v' + EXPECT + ' → ' + (versionOK ? 'OK' : 'NO COINCIDE') + ')' : ''}`);
console.log(`login/core/renderToday:   ${feats.login}/${feats.core}/${feats.renderToday}`);
console.log(`jsErrors:                 ${JSON.stringify(jsErrors)}`);
console.log(pass ? `\n✅ PROD OK — la app arranca limpio en v${version}` : `\n❌ PROD FALLA — revisar antes de dar por bueno el deploy`);
chrome.kill(); process.exit(pass ? 0 : 1);
