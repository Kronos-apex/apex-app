// ¿El botón de ver la contraseña SIGUE funcionando tras cambiar el emoji por un SVG?
// El candado de la suite mira el código; esto prueba la CONDUCTA: que el campo se revele, que el
// icono cambie y que la etiqueta para lectores de pantalla cambie con él.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8861, RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1400);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=9371',
   '--user-data-dir=' + process.env.TEMP + '/ojo-' + Date.now(), '--no-first-run',
   '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9371/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const errs = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') errs.push(m.params?.exceptionDetails?.exception?.description || 'x'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
for (let i = 0; i < 90; i++) { if (await ev(`typeof window._aviUpdateBusy!=='undefined'`)) break; await sleep(500); }

// 🔒 CONTROL DE MONTAJE: el formulario de entrar está OCULTO en la bienvenida, y un svg dentro de
//    algo oculto mide 0x0 — la primera corrida dio el tamaño en cero y el defecto era mío.
await ev(`(()=>{const c=document.getElementById('cin-cta');if(c)c.style.display='none';
  const card=document.getElementById('cin-card');if(card)card.style.display='block';return true;})()`);
await sleep(500);
const r = await ev(`(()=>{
  const inp=document.getElementById('lp');
  const btn=document.querySelector('button[onclick*="togglePass(this,\\'lp\\')"]');
  if(!inp||!btn) return {error:'no encuentro el campo o el botón'};
  const svg=btn.querySelector('svg'), uso=btn.querySelector('use');
  const r0=svg?svg.getBoundingClientRect():null;
  const antes={tipo:inp.type, href:uso&&uso.getAttribute('href'), label:btn.getAttribute('aria-label'),
               ancho:r0?Math.round(r0.width):0, alto:r0?Math.round(r0.height):0};
  btn.click();
  const despues={tipo:inp.type, href:uso&&uso.getAttribute('href'), label:btn.getAttribute('aria-label'),
                 sigueElSvg:!!btn.querySelector('svg')};
  btn.click();
  const vuelta={tipo:inp.type, href:uso&&uso.getAttribute('href')};
  return {antes,despues,vuelta};
})()`);
console.log(JSON.stringify(r, null, 2));
const ok = r && !r.error && r.antes.tipo === 'password' && r.despues.tipo === 'text'
  && r.antes.href === '#i-eye' && r.despues.href === '#i-eye-off' && r.vuelta.href === '#i-eye'
  && r.despues.sigueElSvg && r.antes.label !== r.despues.label
  && r.antes.ancho >= 14 && r.antes.alto >= 14;
console.log('\n' + (ok ? '✅ el ojo REVELA, cambia de icono, vuelve, y el svg sobrevive al toque'
  : '❌ algo se rompió al cambiar el emoji por el SVG'));
console.log('jsErrors:', JSON.stringify(errs.slice(0, 2)));
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exitCode = ok && !errs.length ? 0 : 1;
