// _medir-chat-asesorado.mjs — la barra de escribirle al coach, ANTES y DESPUÉS de tocar .mta
//
// `#cn-msg-in` (clase `.mta`) es el campo donde el ASESORADO le escribe a su coach, y es la única
// de las 7 clases de campo de la app que no llega a 16px. Subirlo cambia la caja, así que antes de
// cambiar nada se mide qué pasa con la barra: alto, si el botón de enviar sigue dentro, y si algo
// se desborda a lo ancho.
//
//   node scripts/e2e/_medir-chat-asesorado.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { EMAIL, PASS } from './_creds.mjs';

const PORT = 8801, DP = 9301, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-chatmta-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
  '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=393,852', APP]);
async function findPage() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true });
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(900);
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
const dentro = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'&&!!CUR.clientId})()`, 30000);
if (!dentro) {
  const por = await ev(`(()=>{const l=document.getElementById('lerr')||document.querySelector('.lerr');return {err:l?(l.innerText||'').trim():null, login:!!document.getElementById('lu'), cliente:(typeof CUR!=='undefined'&&CUR.clientId)||null};})()`);
  console.log('EL LOGIN NO ENTRÓ:', JSON.stringify(por));
  try{chrome.kill()}catch{}; try{srv.kill()}catch{}; process.exit(1);
}
for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(120); }
// Las pestañas se pintan despues del login: buscarlas de una es una carrera (medido: una
// corrida las encuentra y la siguiente no).
await waitFor(`!!document.querySelector('.cntab[onclick*="cn-messages"]')`, 20000);
const abrio = await ev(`(()=>{const b=document.querySelector('.cntab[onclick*="cn-messages"]');if(!b) return 'sin pestaña'; cnTab('cn-messages',b); return getComputedStyle(document.getElementById('cn-messages')).display;})()`);
await sleep(900);
if (!abrio || abrio === 'none' || String(abrio).startsWith('sin')) { console.log('NO ABRIÓ la pestaña de mensajes:', abrio); process.exit(1); }
await ev(`document.fonts.ready`); await sleep(400);

const diag = await ev(`(()=>{
  const sec=document.getElementById('cn-messages');
  const t=document.getElementById('cn-msg-in');
  return {
    seccionExiste: !!sec,
    seccionDisplay: sec?getComputedStyle(sec).display:null,
    seccionClases: sec?sec.className:null,
    textoSeccion: sec?(sec.innerText||'').replace(/\s+/g,' ').trim().slice(0,120):null,
    campoExiste: !!t,
    campoDisplay: t?getComputedStyle(t).display:null,
    padreOculto: t?(()=>{let e=t.parentElement;while(e){if(getComputedStyle(e).display==='none')return (e.id||e.className||e.tagName)+'';e=e.parentElement;}return null;})():null,
    tier: (()=>{try{const c=DB.clients.find(x=>x.id===CUR.clientId);return c&&c.tier;}catch(e){return 'ERR';}})()
  };
})()`);
console.log('DIAGNÓSTICO:', JSON.stringify(diag, null, 2));

const m = await ev(`(()=>{
  const t=document.getElementById('cn-msg-in'); if(!t) return {falta:true};
  const cs=getComputedStyle(t), r=t.getBoundingClientRect();
  const barra=t.parentElement, br=barra.getBoundingClientRect();
  const vw=window.innerWidth, vh=window.innerHeight;
  let desborde=0;
  barra.querySelectorAll('*').forEach(el=>{ const x=el.getBoundingClientRect(); desborde=Math.max(desborde, Math.round(x.right-vw)); });
  const btn=[...barra.querySelectorAll('button')].pop();
  const bt=btn?btn.getBoundingClientRect():null;
  return {
    fontSize: cs.fontSize,
    campo: {alto:Math.round(r.height), ancho:Math.round(r.width)},
    barra: {alto:Math.round(br.height), top:Math.round(br.top), bottom:Math.round(br.bottom)},
    dentroDePantalla: br.bottom<=vh+1,
    desbordeAncho: Math.max(0,desborde),
    botonEnviar: bt?{alto:Math.round(bt.height), ancho:Math.round(bt.width), dentro: bt.right<=vw+1}:null
  };
})()`);

console.log(JSON.stringify(m, null, 2));
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(0);
