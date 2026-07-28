// Capturas de MODALES (Grupo D) — pre-login, contenido estático. Verificación visual de
// jerarquía / botón primario / render tras el fix de foco. Ambos temas.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { afirmador, afirmaPantalla, afirmaCaptura, salir } from './_afirma.mjs';
const A = afirmador('modales del coach');

const PORT = 8791, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-shmod-' + Date.now();
const OUT = process.env.MODALS_OUT || (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-modal-shots';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9291', '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP]);
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9291/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw 0; }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 1e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n); } catch (e) { console.log('  shot', n, 'ERR:', e.message); } };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(800);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(900);
await waitFor(`typeof om==='function' && !!document.getElementById('m-client')`);
await ev(`document.fonts.ready`); await sleep(600);
// ocultar el overlay de carga (cubre la pantalla pre-login con z alto)
await ev(`(()=>{const l=document.getElementById('avi-loading');if(l)l.style.display='none';})()`);
await sleep(200);

const modals = ['m-client', 'm-ex', 'm-notif', 'm-backup'];
for (const theme of ['dark', 'light']) {
  await ev(`(typeof setTheme==='function')&&setTheme('${theme}')`); await sleep(400);
  for (const mid of modals) {
    await ev(`document.querySelectorAll('.mdbg.on').forEach(m=>m.classList.remove('on'));om('${mid}')`);
    await sleep(500);
    const st = await ev(`(()=>{const m=document.getElementById('${mid}');if(!m)return{abre:false};
      const bg=m.closest('.mdbg')||m; const r=m.getBoundingClientRect();
      return {abre:(bg.classList.contains('on')||getComputedStyle(m).display!=='none')&&r.height>0,
        txt:(m.innerText||'').trim().length, ancho:document.documentElement.scrollWidth};})()`);
    A.ok(st.abre, `${theme}/${mid}: el modal abre`, st);
    A.ok(st.txt >= 30, `${theme}/${mid}: el modal pinta contenido (${st.txt})`, st);
    A.ok(st.ancho <= 390, `${theme}/${mid}: no se sale del ancho`, st);
    await shot(`${theme}-${mid}`);
    await ev(`cm('${mid}')`); await sleep(150);
  }
}
ws.close();
salir(A, { chrome, srv, out: OUT });
