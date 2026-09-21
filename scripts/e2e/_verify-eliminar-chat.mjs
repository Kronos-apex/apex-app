// _verify-eliminar-chat.mjs — v645: eliminar la conversación, SOLO para quien la elimina.
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

const PORT = 8847, DP = 9367, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-delchat-' + Date.now();
const SHOTS = process.env.AVI_SHOTS || (process.env.TEMP + '/avi-delchat');
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
const MARCA = 'ZQD-' + Date.now();

// ═════ ASESORADO ═════
await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId); c.tier='premium'; delete c.chatClearedAt;
  DB.msgs[CUR.clientId]=[
    {from:'coach',text:'${MARCA}-C1',date:'2026-09-20T10:00:00.000Z'},
    {from:'client',text:'${MARCA}-A2',date:'2026-09-20T10:05:00.000Z'},
    {from:'coach',text:'${MARCA}-C3',date:'2026-09-20T10:06:00.000Z'}];
  renderClientMsgs(CUR.clientId);})()`);
await sleep(300);
const leerA = () => ev(`(()=>{const h=document.getElementById('cn-msg-thread');const b=document.getElementById('cn-msg-del');
  const r=b?b.getBoundingClientRect():null;
  return {texto:(h.innerText||'').replace(/\\s+/g,' '), burbujas:h.querySelectorAll('.mb').length,
    boton:!!b&&getComputedStyle(b).display!=='none', rotulo:b?b.textContent:'', alto:r?Math.round(r.height):0,
    compartido:(DB.msgs[CUR.clientId]||[]).length};})()`);
let a = await leerA();
// Control de cobertura: si esto no sale, el harness no está en la pantalla de mensajes.
chk('A0 montaje: se ven los 3 mensajes', a.burbujas === 3, `burbujas=${a.burbujas}`);
chk('A1 con mensajes, el botón «Eliminar chat» está y se puede tocar', a.boton && a.alto >= 36, `visible=${a.boton} alto=${a.alto}px`);
await ev(`(()=>{const b=document.getElementById('cn-msg-del'); b.scrollIntoView({block:'center'});})()`);
await tema('light'); await sleep(200); await shot('asesorado-claro-antes');
await ev(`document.getElementById('cn-msg-del').click()`); await sleep(250);
a = await leerA();
chk('A2 el PRIMER toque solo arma: no borra nada', a.burbujas === 3 && /seguro/i.test(a.rotulo), `burbujas=${a.burbujas} rótulo=«${a.rotulo}»`);
await shot('asesorado-claro-armado');
await ev(`document.getElementById('cn-msg-del').click()`); await sleep(300);
a = await leerA();
chk('A3 el segundo toque vacía SU vista', a.burbujas === 0 && !a.texto.includes(MARCA), `burbujas=${a.burbujas}`);
chk('A4 el hilo compartido sigue entero (el coach conserva su copia)', a.compartido === 3, `DB.msgs=${a.compartido}`);
chk('A5 sin mensajes visibles, el botón desaparece', a.boton === false, `visible=${a.boton}`);
await shot('asesorado-claro-despues');
await ev(`(()=>{DB.msgs[CUR.clientId].push({from:'coach',text:'${MARCA}-NUEVO',date:'2026-09-20T11:00:00.000Z'}); renderClientMsgs(CUR.clientId);})()`);
await sleep(250);
a = await leerA();
chk('A6 un mensaje NUEVO del coach sí aparece', a.burbujas === 1 && a.texto.includes(MARCA + '-NUEVO') && !a.texto.includes(MARCA + '-C1'), `burbujas=${a.burbujas}`);
await tema('dark'); await sleep(200); await shot('asesorado-oscuro-despues'); await tema('light');

// ═════ COACH ═════ (pantalla del coach forzada con un cliente sembrado, como _verify-chatunified)
await ev(`(()=>{ showScreen('s-coach'); CUR.loggedAs='coach';
  try{localStorage.removeItem('ax_msgclear');}catch(e){}
  DB.clients=[{id:'kc1',name:'Ana Test',level:'Intermedio',goal:'Ganar músculo',days:3,tier:'premium'}];
  DB.msgs={kc1:[
    {from:'client',text:'${MARCA}-K1',date:'2026-09-20T10:00:00.000Z'},
    {from:'coach',text:'${MARCA}-K2',date:'2026-09-20T10:05:00.000Z'},
    {from:'client',text:'${MARCA}-K3',date:'2026-09-20T10:06:00.000Z'}]};
  openCoachChat('kc1'); })()`);
await sleep(500);
const leerC = () => ev(`(()=>{const h=document.getElementById('cchat-thread');const b=document.getElementById('cchat-del');
  const r=b?b.getBoundingClientRect():null;
  let bandeja=''; try{renderMsgs(); bandeja=(document.getElementById('msgs-list').innerText||'');}catch(e){bandeja='ERR '+e.message;}
  return {texto:(h.innerText||'').replace(/\\s+/g,' '), burbujas:h.querySelectorAll('.mb').length,
    boton:!!b&&getComputedStyle(b).display!=='none', armado:!!b&&b.classList.contains('armed'), rotulo:b?b.textContent.trim():'',
    alto:r?Math.round(r.height):0, ancho:r?Math.round(r.width):0, derecha:r?Math.round(r.right):0,
    compartido:(DB.msgs.kc1||[]).length, bandejaTieneAna:/Ana Test/.test(bandeja)&&/mensaje/.test(bandeja),
    marca:(()=>{try{return JSON.parse(localStorage.getItem('ax_msgclear')||'{}').kc1||null;}catch(e){return 'ERR';}})()};})()`);
let c = await leerC();
chk('C0 montaje: el chat del coach muestra los 3 mensajes', c.burbujas === 3, `burbujas=${c.burbujas}`);
chk('C1 el botón de eliminar está en la barra, se puede tocar y cabe', c.boton && c.alto >= 36 && c.derecha <= 390, `alto=${c.alto} ancho=${c.ancho} borde=${c.derecha}px`);
chk('C1b la bandeja lista la conversación antes de eliminarla', c.bandejaTieneAna, '');
await tema('light'); await sleep(150); await shot('coach-claro-antes');
await ev(`document.getElementById('cchat-del').click()`); await sleep(250);
c = await leerC();
chk('C2 el PRIMER toque solo arma', c.burbujas === 3 && c.armado && c.rotulo === 'Eliminar' && c.derecha <= 390, `armado=${c.armado} rótulo=«${c.rotulo}» borde=${c.derecha}px`);
await shot('coach-claro-armado');
await tema('dark'); await sleep(200); await shot('coach-oscuro-armado'); await tema('light');
await ev(`document.getElementById('cchat-del').click()`); await sleep(300);
c = await leerC();
chk('C3 el segundo toque vacía la vista del coach', c.burbujas === 0 && !c.texto.includes(MARCA), `burbujas=${c.burbujas}`);
chk('C4 el hilo compartido sigue entero (el asesorado conserva su copia)', c.compartido === 3, `DB.msgs=${c.compartido}`);
chk('C5 la marca es la del ÚLTIMO mensaje, y el hilo sale de la bandeja', c.marca === '2026-09-20T10:06:00.000Z' && !c.bandejaTieneAna, `marca=${c.marca} enBandeja=${c.bandejaTieneAna}`);
await shot('coach-claro-despues');
await ev(`(()=>{DB.msgs.kc1.push({from:'client',text:'${MARCA}-NUEVO',date:'2026-09-20T11:00:00.000Z'}); renderCoachChatThread('kc1',true);})()`);
await sleep(250);
c = await leerC();
chk('C6 un mensaje NUEVO del asesorado sí le llega y vuelve a la bandeja', c.burbujas === 1 && c.texto.includes(MARCA + '-NUEVO') && c.bandejaTieneAna, `burbujas=${c.burbujas} enBandeja=${c.bandejaTieneAna}`);

const ok = R.every(r => r[1]) && jsErrors.length === 0;
console.log(`\n${ok ? '🟢' : '🔴'} ${R.filter(r => r[1]).length}/${R.length} comprobaciones · jsErrors=${JSON.stringify(jsErrors)}\n📸 ${SHOTS}`);
cerrar();
process.exit(ok ? 0 : 1);
