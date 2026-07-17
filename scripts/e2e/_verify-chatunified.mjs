// _verify-chatunified.mjs — SESIÓN K (v363): la ficha del asesorado ya NO tiene input propio.
// La sección Mensajes de p-detail muestra un PREVIEW (últimos 2, solo lectura) + botón «Abrir
// chat» → openCoachChat (chat de pantalla completa, UI única). Este harness prueba:
//   K1  el preview pinta los últimos 2 mensajes y la nota «+N más» cuando hay >2
//   K2  ya NO existe el input inline #msg-in ni sendCoachMsg (un solo lugar para escribir)
//   K3  el botón «Abrir chat» existe y abre #coach-chat (openCoachChat) con el back-stack sano
//   K4  enviar desde el chat de pantalla completa se REFLEJA en el preview al volver a la ficha
// Reusa el andamiaje de _test-coach-back.mjs (login QA + s-coach + cliente sembrado).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';

const PORT = 8791, APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-chatunified-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9291', '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP]);
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9291/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw 0; }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 1e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
  if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception');
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await sleep(800);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(800);
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`);
// cerrar el tour de novedades si saltó
await ev(`(()=>{try{if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));if(typeof ntClose==='function')ntClose(false);}catch(e){}})()`);

// Forzar s-coach + sembrar un cliente CON 3 mensajes (para probar el preview de 2 + «+1 más»)
await ev(`(()=>{
  showScreen('s-coach'); CUR.loggedAs='coach';
  document.querySelectorAll('#s-coach .panel').forEach(p=>p.classList.remove('on'));
  document.getElementById('p-home').classList.add('on');
  document.querySelectorAll('.sbi').forEach(s=>s.classList.remove('on'));
  document.getElementById('sbi-home').classList.add('on');
  navReset(null);
  const onP=document.querySelector('#s-coach .panel.on'); AVINAV.curTab=(onP&&onP.id)||'p-home';
  DB.clients=[{id:'kc1',name:'Ana Test',level:'Intermedio',goal:'Ganar músculo',days:3}];
  DB.msgs=DB.msgs||{}; DB.msgs['kc1']=[
    {from:'client',text:'Hola coach, ¿cómo voy?',date:'2026-07-15T10:00:00.000Z'},
    {from:'coach', text:'Muy bien, sigue así 💪',date:'2026-07-15T11:00:00.000Z'},
    {from:'client',text:'¿Subo el peso en sentadilla?',date:'2026-07-16T09:00:00.000Z'}
  ];
  window.__KCID='kc1';
  try{ if(typeof _heavyLoaded!=='undefined') _heavyLoaded['kc1']=true; }catch(e){}
  if(history.state===null) history.pushState({aviGuard:1},'');
})()`);
await sleep(200);

const results = [];
const check = (name, cond, extra='') => { results.push((cond?'✅':'❌')+' '+name+(extra?' — '+extra:'')); };

// ── Abrir la ficha del asesorado → renderDetailMsgs pinta el PREVIEW ──
await ev(`openDetail(window.__KCID)`);
await waitFor(`(()=>{const d=document.getElementById('p-detail');return d&&d.classList.contains('on')})()`);
await sleep(250);

// K1 — el preview muestra los últimos 2 mensajes + nota «+1 más»
const bubbles = await ev(`document.querySelectorAll('#d-msgs .mb').length`);
const lastBubble = await ev(`(()=>{const b=document.querySelectorAll('#d-msgs .mb');return b.length?b[b.length-1].textContent:''})()`);
const moreNote = await ev(`(()=>{return /más/.test(document.getElementById('d-msgs').textContent) && /\\+1/.test(document.getElementById('d-msgs').textContent)})()`);
check('K1 preview: solo los últimos 2 mensajes (no los 3)', bubbles===2, 'bubbles='+bubbles);
check('K1 preview: la última burbuja es el mensaje más reciente', lastBubble==='¿Subo el peso en sentadilla?', JSON.stringify(lastBubble));
check('K1 preview: nota «+1 mensaje más» presente', moreNote===true, 'moreNote='+moreNote);

// K2 — ya NO existe input inline ni sendCoachMsg
const noInput = await ev(`document.getElementById('msg-in')===null`);
const noSend = await ev(`typeof sendCoachMsg==='undefined'`);
check('K2 no queda el textarea inline #msg-in', noInput===true, 'noInput='+noInput);
check('K2 sendCoachMsg fue eliminada (una sola UI para escribir)', noSend===true, 'noSend='+noSend);

// K3 — botón «Abrir chat» existe y abre el chat de pantalla completa
const btnOk = await ev(`(()=>{const b=[...document.querySelectorAll('#p-detail .mrow button')].find(x=>/Abrir chat/i.test(x.textContent));return !!b})()`);
check('K3 botón «Abrir chat» presente en la ficha', btnOk===true, 'btnOk='+btnOk);
const layersBefore = await ev(`AVINAV.layers||0`);
await ev(`(()=>{const b=[...document.querySelectorAll('#p-detail .mrow button')].find(x=>/Abrir chat/i.test(x.textContent));if(b)b.click();})()`);
await waitFor(`(()=>{const e=document.getElementById('coach-chat');return e&&e.classList.contains('on')})()`);
await sleep(250);
const chatOpen = await ev(`(()=>{const e=document.getElementById('coach-chat');return !!(e&&e.classList.contains('on'))})()`);
const chatId = await ev(`_cchatId`);
const layersAfter = await ev(`AVINAV.layers||0`);
check('K3 «Abrir chat» abre #coach-chat (pantalla completa)', chatOpen===true, 'chatOpen='+chatOpen);
check('K3 el chat abierto es el del asesorado correcto', chatId==='kc1', 'cchatId='+chatId);
check('K3 el chat entra como LAYER (atrás lo cierra, no sale de la app)', layersAfter>layersBefore, `before=${layersBefore} after=${layersAfter}`);

// K3b — atrás cierra el chat y reabre la ficha (no sale de la app)
await ev(`_aviHandleBack()`); await sleep(300);
const backToDetail = await ev(`(()=>{const d=document.getElementById('p-detail');const c=document.getElementById('coach-chat');return d&&d.classList.contains('on') && !(c&&c.classList.contains('on'))})()`);
check('K3b atrás cierra el chat y vuelve a la ficha', backToDetail===true, 'backToDetail='+backToDetail);

// K4 — enviar desde pantalla completa se refleja en el preview de la ficha al volver
await ev(`openCoachChat('kc1')`);
await waitFor(`(()=>{const e=document.getElementById('coach-chat');return e&&e.classList.contains('on')})()`);
await ev(`(()=>{const ta=document.getElementById('cchat-in');ta.value='Dale, sube 2.5kg y me cuentas';})()`);
await ev(`sendCoachChatMsg()`);
await sleep(250);
const msgCount = await ev(`(DB.msgs['kc1']||[]).length`);
check('K4 el mensaje se guardó en la conversación', msgCount===4, 'count='+msgCount);
// volver a la ficha (sendCoachChatMsg ya re-pinta el preview si p-detail está on; verificamos el DOM)
await ev(`_aviHandleBack()`); await sleep(300);
const previewLast = await ev(`(()=>{const b=document.querySelectorAll('#d-msgs .mb');return b.length?b[b.length-1].textContent:''})()`);
check('K4 el preview de la ficha refleja el mensaje enviado', previewLast==='Dale, sube 2.5kg y me cuentas', JSON.stringify(previewLast));

// ── INVITAR A ABRIR LA APP (adopción, ítem c, v364) ──
// El botón 🔔 vive en la barra del chat del coach. Con teléfono → WhatsApp (canal que SÍ llega a
// quien no ha abierto la app); sin teléfono → prellena el chat interno (el coach lo envía).
await ev(`openCoachChat('kc1')`);
await waitFor(`(()=>{const e=document.getElementById('coach-chat');return e&&e.classList.contains('on')})()`);
// stub window.open para capturar la URL sin abrir pestañas reales
await ev(`(()=>{window.__opened=[];window.open=(u)=>{window.__opened.push(u);return null;};})()`);

// A1 — el botón existe en la barra del chat
const inviteBtn = await ev(`!!document.querySelector('#coach-chat .cchat-bar .cchat-invite')`);
check('A1 botón «Invitar a abrir la app» en la barra del chat', inviteBtn===true, 'btn='+inviteBtn);

// A2 — CON teléfono → abre WhatsApp con el número y el mensaje de «abre AVI»
await ev(`(()=>{const c=DB.clients.find(x=>x.id==='kc1');c.phone='+57 300 123 4567';})()`);
await ev(`(()=>{window.__opened=[];const b=document.querySelector('#coach-chat .cchat-invite');if(b)b.click();})()`);
await sleep(150);
const waUrl = await ev(`(window.__opened&&window.__opened[0])||''`);
check('A2 con teléfono abre WhatsApp (wa.me + número limpio)', /^https:\/\/wa\.me\/573001234567\?text=/.test(waUrl), JSON.stringify(waUrl.slice(0,60)));
check('A2 el mensaje invita a ABRIR la app', /Abre%20AVI/i.test(waUrl)&&/activar%20tus%20recordatorios/i.test(waUrl), 'urlLen='+waUrl.length);
const chatUntouchedWA = await ev(`document.getElementById('cchat-in').value===''`);
check('A2 con teléfono NO ensucia el chat interno (solo WhatsApp)', chatUntouchedWA===true, 'chatEmpty='+chatUntouchedWA);

// A3 — SIN teléfono → prellena el chat interno (el coach envía), NO abre WhatsApp
await ev(`(()=>{const c=DB.clients.find(x=>x.id==='kc1');c.phone='';document.getElementById('cchat-in').value='';window.__opened=[];})()`);
await ev(`(()=>{const b=document.querySelector('#coach-chat .cchat-invite');if(b)b.click();})()`);
await sleep(150);
const openedNone = await ev(`(window.__opened||[]).length===0`);
const prefilled = await ev(`/Abre AVI un momentito/.test(document.getElementById('cchat-in').value)`);
check('A3 sin teléfono NO abre WhatsApp', openedNone===true, 'opened='+openedNone);
check('A3 sin teléfono prellena el chat interno (coach lo envía)', prefilled===true, 'prefilled='+prefilled);
const notSentAlone = await ev(`(DB.msgs['kc1']||[]).length===4`);
check('A3 NADA se envía solo (el mensaje sigue sin salir)', notSentAlone===true, 'count='+(await ev(`(DB.msgs['kc1']||[]).length`)));

// ── jsErrors ──
check('Sin errores JS en toda la corrida', jsErrors.length===0, jsErrors.join(' | '));

console.log('\n──── RESULTADOS CHAT UNIFICADO (K) + INVITAR A ABRIR LA APP (adopción v364) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
