// Verificación de comportamiento de MODALES (Grupo D) — pantalla PRE-login, sin credenciales.
// (1) tap-fuera (click en el fondo .mdbg) cierra TODOS los modales, incl. los declarados
//     después de los <script> (m-notif/m-nut/m-med/m-payment/m-photos/m-qwcfg/m-delacct);
// (2) foco: al abrir, el foco entra al modal; Tab cicla dentro (atrapado); al cerrar, vuelve
//     al disparador; (3) Escape cierra.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';

const PORT = 8789, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-modals-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9289', '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP]);
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9289/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw 0; }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 1e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(800);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(900);
await waitFor(`typeof om==='function' && !!document.getElementById('m-notif')`);

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { console.log(`  ${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`); ok ? pass++ : fail++; };

// Simula click en el FONDO del modal (target === .mdbg)
const clickBackdrop = async id => ev(`(()=>{const m=document.getElementById('${id}');if(!m)return'no-modal';m.dispatchEvent(new MouseEvent('click',{bubbles:true}));return m.classList.contains('on');})()`);

// ── (1) tap-fuera cierra ──
for (const id of ['m-help', 'm-notif', 'm-nut', 'm-payment', 'm-photos', 'm-qwcfg', 'm-med', 'm-delacct']) {
  await ev(`om('${id}')`); await sleep(120);
  const stillOpen = await clickBackdrop(id);
  await ev(`document.getElementById('${id}').classList.remove('on')`);
  check(`tap-fuera cierra ${id}`, stillOpen === false, stillOpen === true ? 'siguió ABIERTO' : '');
}

// ── (2) Escape cierra ──
await ev(`om('m-notif')`); await sleep(100);
await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`); await sleep(100);
check('Escape cierra m-notif', (await ev(`document.getElementById('m-notif').classList.contains('on')`)) === false);

// ── (3) foco entra al abrir ──
await ev(`(()=>{const b=document.createElement('button');b.id='__trg';b.textContent='trigger';document.body.appendChild(b);b.focus();})()`);
await ev(`om('m-help')`); await sleep(200);
const focusIn = await ev(`(()=>{const m=document.getElementById('m-help');return m.contains(document.activeElement);})()`);
check('foco entra al modal al abrir', focusIn === true, focusIn === false ? 'foco quedó fuera' : '');

// ── (4) foco vuelve al disparador al cerrar (m-help se abrió con __trg enfocado) ──
await ev(`cm('m-help')`); await sleep(200);
const restored = await ev(`document.activeElement && document.activeElement.id==='__trg'`);
check('foco vuelve al disparador al cerrar', restored === true, restored === false ? 'no se restauró' : '');

// ── (5) Tab atrapado: en un modal con varios focusables, Tab desde el ÚLTIMO vuelve al PRIMERO ──
await sleep(100);
const trap = await ev(`(()=>{const m=document.getElementById('m-client');om('m-client');const f=[...m.querySelectorAll('a[href],button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(e=>e.offsetParent!==null);if(f.length<2)return'pocos-focusables:'+f.length;f[f.length-1].focus();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));const atFirst=document.activeElement===f[0];m.classList.remove('on');return atFirst;})()`);
check('Tab desde el último vuelve al primero (atrapado)', trap === true, typeof trap === 'string' ? trap : (trap === false ? 'se escapó' : ''));

console.log(`\n  Modales: ${pass}/${pass + fail} OK`);
ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fail ? 1 : 0);
