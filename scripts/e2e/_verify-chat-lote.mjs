// _verify-chat-lote.mjs — v646-v649: el lote del chat (contexto, respuestas del coach, visto, fotos).
//
// Decisión del PO (21-sep-2026): como «Vaciar chat» de WhatsApp — coach y asesorado pueden,
// cada uno para sí; el otro conserva su copia. Este harness mide lo que se VE (innerText y
// display reales), no el código:
//   A1-A6  asesorado: el botón aparece con mensajes, el primer toque solo ARMA, el segundo
//          vacía SU vista, el hilo compartido (DB.msgs) sigue entero, un mensaje nuevo del
//          coach SÍ aparece, y sin mensajes el botón no está.
//   C1-C6  coach: lo mismo en el chat de pantalla completa, más la bandeja (el hilo eliminado
//          sale de la lista) y la ficha (preview vacío).
// Escribe solo en memoria del navegador; el sello `cloudWriteSealed` impide tocar la nube
// desde localhost — no se desactiva.
//
//   node scripts/e2e/_verify-eliminar-chat.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { EMAIL, PASS } from './_creds.mjs';

const PORT = 8851, DP = 9371, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-chatlote-' + Date.now();
const SHOTS = process.env.AVI_SHOTS || (process.env.TEMP + '/avi-chatlote');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
  '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP]);
const cerrar = () => { try { chrome.kill(); } catch {} try { srv.kill(); } catch {} };
async function findPage() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
const fs = await import('node:fs');
fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (nombre) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${SHOTS}/${nombre}.png`, Buffer.from(r.data, 'base64')); };
// El tema se FIJA en los dos sitios: la preferencia del sistema Y el `data-theme` que la app pone
// desde el ajuste guardado de la cuenta — con solo el primero, la cuenta QA sale oscura siempre.
const tema = async t => {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: t }] });
  await ev(`document.documentElement.setAttribute('data-theme',${JSON.stringify(t)})`);
};

await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await tema('light');
await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(900);
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
const dentro = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'&&!!CUR.clientId})()`, 30000);
if (!dentro) { console.log('❌ EL LOGIN NO ENTRÓ (ojo con el rate limit: ~2-3 min entre corridas)'); cerrar(); process.exit(1); }
for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize','news-tour'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(120); }
await waitFor(`!!document.querySelector('.cntab[onclick*="cn-messages"]')`, 20000);
await ev(`(()=>{const b=document.querySelector('.cntab[onclick*="cn-messages"]');if(b)cnTab('cn-messages',b);})()`);
await sleep(600);

const R = [];
const chk = (nombre, ok, detalle) => { R.push([nombre, ok, detalle]); console.log(`${ok ? '✅' : '❌'} ${nombre}${detalle ? ' — ' + detalle : ''}`); };

// ═════ v646 · CONTEXTO DE LA RESPUESTA RÁPIDA ═════
// Sesión de HOY plantada en memoria (el sello impide que suba) y un chip de verdad pulsado.
await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId); c.tier='premium'; delete c.chatClearedAt;
  DB.msgs[CUR.clientId]=[];
  const hoy=new Date(); hoy.setHours(Math.max(0,hoy.getHours()-1));
  DB.history[CUR.clientId]=[{id:'sx-lote',date:hoy.toISOString(),routineName:'Pierna LOTE',doneSets:3,totalSets:8,
    exercises:[{name:'Hip Thrust LOTE',sets:[{kg:'80',reps:'10',done:true},{kg:'90',reps:'8',done:true}]},{name:'Curl LOTE',sets:[{kg:'30',reps:'12',done:true}]}]}].concat(DB.history[CUR.clientId]||[]);
  renderClientMsgs(CUR.clientId);})()`);
await sleep(300);
await ev(`(()=>{const b=[...document.querySelectorAll('#cn-msg-quick button')].find(x=>/dolió/.test(x.textContent)); b.click();})()`);
await sleep(400);
const x1 = await ev(`(()=>{const ms=DB.msgs[CUR.clientId]||[]; const m=ms[ms.length-1]||{};
  const h=document.getElementById('cn-msg-thread'); const card=h.querySelector('.mctx');
  return {ctx:m.ctx||null, card:card?card.innerText:'', lineas:card?card.querySelectorAll('.mctx-l').length:-1};})()`);
chk('X1 el chip «Algo me dolió» viaja con el entreno de hoy', x1.ctx && x1.ctx.rutina === 'Pierna LOTE' && x1.ctx.ejs.length === 2, JSON.stringify(x1.ctx && x1.ctx.ejs));
chk('X2 el asesorado ve la tarjeta COMPACTA (sabe que su coach la ve)', /Pierna LOTE/.test(x1.card) && x1.lineas === 0, `«${x1.card}» líneas=${x1.lineas}`);
await tema('light'); await sleep(150); await shot('ctx-asesorado');
const ctxMsg = JSON.stringify(x1.ctx);
// Control de discriminación: sin sesión de hoy, NO hay contexto.
await ev(`(()=>{DB.history[CUR.clientId]=(DB.history[CUR.clientId]||[]).filter(s=>s.id!=='sx-lote'&&new Date(s.date).toDateString()!==new Date().toDateString());
  const b=[...document.querySelectorAll('#cn-msg-quick button')].find(x=>/duda/.test(x.textContent)); b.click();})()`);
await sleep(300);
const x3 = await ev(`(()=>{const ms=DB.msgs[CUR.clientId]; return ms[ms.length-1].ctx||null;})()`);
chk('X3 sin entreno hoy, el mensaje va SIN contexto', x3 === null, JSON.stringify(x3));

// Lado del coach: el mismo mensaje en su chat.
await ev(`(()=>{ showScreen('s-coach'); CUR.loggedAs='coach';
  try{localStorage.removeItem('ax_msgclear');}catch(e){}
  DB.clients=[{id:'kc1',name:'Ana Test',level:'Intermedio',goal:'Ganar músculo',days:3,tier:'premium'}];
  DB.msgs={kc1:[{from:'client',text:'🤕 Algo me dolió',date:new Date().toISOString(),ctx:${ctxMsg}}]};
  openCoachChat('kc1'); })()`);
await sleep(400);
const x4 = await ev(`(()=>{const card=document.querySelector('#cchat-thread .mctx'); return {txt:card?card.innerText:'', lineas:card?card.querySelectorAll('.mctx-l').length:0};})()`);
chk('X4 el coach ve la rutina y CADA ejercicio con su carga', /Pierna LOTE/.test(x4.txt) && x4.lineas === 2 && /90 kg × 8/.test(x4.txt), `«${x4.txt.replace(/\n/g,' | ')}»`);
await tema('light'); await sleep(150); await shot('ctx-coach-claro');
await tema('dark'); await sleep(150); await shot('ctx-coach-oscuro'); await tema('light');

// @@SECCIONES@@

const ok = R.every(r => r[1]) && jsErrors.length === 0;
console.log(`\n${ok ? '🟢' : '🔴'} ${R.filter(r => r[1]).length}/${R.length} comprobaciones · jsErrors=${JSON.stringify(jsErrors)}\n📸 ${SHOTS}`);
cerrar();
process.exit(ok ? 0 : 1);
