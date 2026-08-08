// ─────────────────────────────────────────────────────────────────────────────
// _verify-selfpain.mjs — EL DOLOR QUE REPORTA EL COACH EN SU PROPIO ENTRENO LE LLEGA
//
// Bug reportado por el PO (2026-08-08), textual: «marqué dolor en la pierna izquierda en los
// abductores, le envié mensaje al coach —o sea, me envié mensaje— pero no me llegó al panel de
// coach, por lo que no pude hacer nada».
//
// CAUSA: entrenando con «Mi entrenamiento» (COACH_SELF) él NO es un cliente — sus datos viven en
// SU PROPIA fila. El aviso se creaba como mensaje de chat en esa fila, y el panel del coach solo
// lee los hilos de las filas de CLIENTE, así que se guardaba donde ninguna pantalla lo muestra.
// Es la familia del bug de v371, donde la tarjeta «Mi entrenamiento» leía de un cliente que no
// existía porque el coach no se entrena a sí mismo como cliente.
//
// QUÉ AFIRMA: no que se guarde un dato, sino que **el coach lo VEA** — que es lo que él no pudo.
// Y el control es que a un ASESORADO REAL le siga llegando por su vía de siempre: si esto lo
// arreglara apagando el aviso para todos, sería haber borrado la feature.
//
//   node scripts/e2e/_verify-selfpain.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { afirmador, salir } from './_afirma.mjs';
const A = afirmador('dolor del coach en su propio entreno');
const PORT = 8811, DP = 9311, APP = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
   '--user-data-dir=' + process.env.TEMP + '/selfpain-' + Date.now(), '--no-first-run',
   '--window-size=390,844', APP]);
async function fp() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id).res(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 25000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(700);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP }); await sleep(900);
const listo = await waitFor(`typeof renderMyTrainingCard==='function' && typeof painSubmit==='function' && typeof painCareAdd==='function'`);
A.ok(listo, 'los módulos cargaron');

// ── 1) EL CASO DEL PO: el coach entrenándose a sí mismo reporta dolor ────────────────────────
const hoy = new Date().toISOString();
const mont = await ev(`(()=>{try{
  CUR.loggedAs='client'; COACH_SELF=true;      // «Mi entrenamiento»: vista de asesorado, sigue siendo el coach
  DB.clients=[{id:'meCoach',name:'Andres',tier:'premium',days:3,level:'Intermedio'}];
  CUR.clientId='meCoach';
  DB.msgs={};
  window.GM=window.GM||{}; GM.routine={id:'rSelf'};
  GM.exercises=[{id:'e45',name:'Abducción de Cadera en Máquina',muscle:'gluteo'}];
  window._pushSpy=0; window.pushToClient=function(){ window._pushSpy++; };
  gmReportPain(0);
  painPick('area','cara externa del muslo o glúteo (abductores)');
  painPick('side','izquierda');
  painPick('level',2);
  painSubmit();
  return 'ok';
}catch(e){return 'ERR '+(e&&e.message)}})()`);
A.ok(mont === 'ok', 'el coach puede completar el reporte de dolor en su propio entreno', mont);

const guardado = await ev(`(()=>{const c=DB.clients[0];const a=painCareActive(c.painCare)||[];
  return {n:a.length, area:a[0]&&a[0].area, side:a[0]&&a[0].side, level:a[0]&&a[0].level};})()`);
// 🔴 Antes de v459 «abductores» NI SIQUIERA EXISTÍA como zona: caía en «otra zona» y no excluía nada.
A.ok(guardado.n === 1 && /abductores/.test(guardado.area || ''),
  'el reporte se guarda con la zona REAL que él marcó (abductores, que antes no existía)', guardado);
A.ok(guardado.side === 'izquierda', 'guarda el LADO que marcó', guardado);

// 🔒 Lo que fallaba: no se manda un mensaje a sí mismo, porque cae donde nada lo muestra.
const sinRuido = await ev(`(()=>({msgs:Object.keys(DB.msgs||{}).length, push:window._pushSpy}))()`);
A.ok(sinRuido.msgs === 0 && sinRuido.push === 0,
  'NO se crea un mensaje ni un push «al coach» cuando el coach es él mismo', sinRuido);

// ── 2) LO QUE DE VERDAD PEDÍA: que lo VEA en su panel ────────────────────────────────────────
const enPanel = await ev(`(()=>{try{
  COACH_SELF=false; CUR.loggedAs='coach';
  const prof={name:'Andres',days:3,painCare:DB.clients[0].painCare};
  const dt=new Date();
  COACH_OWN_ROW={profile:prof, routines:[{id:'r1',day:'Lunes',exercises:[{id:'e1'}]}],
    history:[{id:'h1',routineId:'r1',date:dt.toISOString(),doneSets:5,totalSets:5,exercises:[]}]};
  showScreen('s-coach');
  renderMyTrainingCard();
  const el=document.getElementById('h-mytraining');
  return {visible: !!el && el.style.display!=='none', txt:(el?el.innerText:'')};
}catch(e){return {err:String(e&&e.message)}}})()`);
A.ok(enPanel.visible, 'la tarjeta «Mi entrenamiento» se pinta en su Inicio', enPanel.err || '');
A.ok(/Reportaste dolor/i.test(enPanel.txt || ''),
  '🔴 EL COACH VE SU PROPIO REPORTE DE DOLOR EN SU PANEL (esto es lo que no pasaba)', (enPanel.txt || '').slice(0, 160));
A.ok(/abductores/i.test(enPanel.txt || '') && /izquierda/i.test(enPanel.txt || ''),
  'la tarjeta dice la zona y el lado, que es lo que necesita para decidir', (enPanel.txt || '').slice(0, 160));

// ── 3) CONTROL: a un ASESORADO REAL le sigue llegando por su vía ─────────────────────────────
// Sin esto, «arreglarlo» apagando el aviso para todos pasaría por verde — y sería haber borrado
// la feature en vez de arreglarla.
const real = await ev(`(()=>{try{
  COACH_SELF=false; CUR.loggedAs='client';
  DB.clients=[{id:'cReal',name:'Nataly',tier:'premium'}];
  CUR.clientId='cReal'; DB.msgs={}; window._pushSpy=0;
  GM.exercises=[{id:'e45',name:'Abducción de Cadera en Máquina',muscle:'gluteo'}];
  gmReportPain(0); painPick('area','rodilla'); painPick('side','derecha'); painPick('level',2); painSubmit();
  const hilo=(DB.msgs['cReal']||[]);
  return {msgs:hilo.length, texto:hilo[0]&&hilo[0].text, push:window._pushSpy};
}catch(e){return {err:String(e&&e.message)}}})()`);
A.ok(real.msgs === 1 && real.push === 1,
  'CONTROL: a un asesorado REAL sí se le crea el aviso al coach y su push', real);
A.ok(/derecha/.test(real.texto || ''), 'el aviso al coach incluye el LADO', real.texto);

ws.close();
salir(A, { chrome, srv });
