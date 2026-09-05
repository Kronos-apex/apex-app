// REPRO de los saltos en la pantalla de entrenamiento (reporte del PO, 4-sep-2026):
//   «cuando le doy en mostrar calentamiento da un salto hacia abajo, y lo mismo pasa cuando
//    subo o bajo un ejercicio: dan saltos raros o se demora en ejecutar la accion».
//
// QUE MIDE, en el guiado embebido con 6 ejercicios de peso (la pantalla scrollea de verdad):
//   1) SALTO = cuanto se movio en pixeles la tarjeta que la persona estaba MIRANDO, medida
//      como el rect.top del ancla antes vs despues de la accion. 0 = no se movio nada.
//      (El scrollTop a secas no sirve: el contenido cambia de alto y un scrollTop igual puede
//      significar otra vista. El ancla es lo que ve el ojo.)
//   2) LATENCIA = ms desde el click hasta que el DOM refleja la accion.
//   3) RENDERS = cuantas veces se repinta #gm-body por accion (contador instrumentado).
//   4) El scroll DIFERIDO: se vuelve a medir 700ms despues, porque openGuidedEmbedded programa
//      un gmScrollToCurrent a los 120ms con behavior:'smooth' — el salto que llega tarde.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';

const PORT = 8771;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-saltos-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9271', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
chrome.on('error', e => { console.error('chrome', e); process.exit(1); });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9271/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
const check = (name, cond, extra = '') => { const line = (cond ? 'OK   ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''); results.push(line); log('  ' + line); };

async function freshLogin() {
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function'&&!document.getElementById('avi-loading'))})()`, 60000);
  let inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  if (!inApp) {
    await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
    await ev(`doLogin()`);
    await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 60000);
    inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  }
  if (!inApp) throw new Error('login');
  await sleep(2000);
  const sesionOk = await ev(`!!(typeof CUR!=='undefined'&&CUR.clientId&&typeof DB!=='undefined'&&(DB.clients||[]).some(x=>x.id===CUR.clientId))`);
  if (!sesionOk) throw new Error('login no completo (rate limit?)');
  for (let k = 0; k < 8; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';try{if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));if(typeof ntClose==='function')ntClose(false);}catch(e){}})()`); await sleep(150); }
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}})()`);
}

// Rutina de 6 ejercicios de PESO (peso_reps) → el guiado embebido es largo y scrollea.
async function setR() {
  return await ev(`(()=>{try{
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const today=days[new Date().getDay()];
    const peso=DB.exercises.filter(e=>exTrack(e)==='peso_reps').slice(0,6)
      .map(e=>{const x=JSON.parse(JSON.stringify(e));x.sets=3;x.reps='10';return x;});
    Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));
    try{clearTodayMood(CUR.clientId);}catch(e){}
    c.routines=[{id:'rTest', day:today, name:'Repro saltos', exercises:peso}];
    CUR.todayWorking=null; CUR.todayOverride=null; CUR.todayRenderedDay=null;
    navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);
    renderClientToday(c);
    if(typeof expandTodayWorkout==='function')expandTodayWorkout();
    const g=document.getElementById('guided-mode');
    return JSON.stringify({today, n:peso.length, nombres:peso.map(e=>e.name),
      embedded:g.classList.contains('gm-embedded')&&!g.classList.contains('hidden'),
      cards:document.querySelectorAll('#gm-body .gm-ex-card').length});
  }catch(e){return JSON.stringify({err:String(e&&e.stack||e)});}})()`);
}

// Contador de repintados de #gm-body (envuelve gmRender una sola vez).
const instrument = () => ev(`(()=>{ if(window.__gmCount!=null) { window.__gmRenders=0; return 'ya'; }
  window.__gmRenders=0; const orig=window.gmRender; window.gmRender=function(){ window.__gmRenders++; return orig.apply(this,arguments); }; window.__gmCount=1; return 'ok'; })()`);

// Ancla = tarjeta que la persona esta mirando. Devuelve su posicion en la VENTANA.
const anchorTop = id => ev(`(()=>{const e=document.getElementById(${JSON.stringify(id)});return e?Math.round(e.getBoundingClientRect().top):null})()`);
const scrollTop = () => ev(`(()=>{const b=document.querySelector('#s-client .cnbody');return b?Math.round(b.scrollTop):null})()`);
const scrollTo = px => ev(`(()=>{const b=document.querySelector('#s-client .cnbody');if(b){b.style.scrollBehavior='auto';b.scrollTop=${px};}return b?Math.round(b.scrollTop):null})()`);

const report = { pre: {}, warm: {}, mover: {} };
try {
  await freshLogin();
  log('\n=== SETUP: 6 ejercicios de peso en el guiado embebido ===');
  const setup = JSON.parse(await setR());
  log('  ' + JSON.stringify(setup));
  if (!setup.embedded) throw new Error('el guiado no abrio — fixture malo, no motor');
  await sleep(600);
  await instrument();

  // ───────── A) MOSTRAR CALENTAMIENTO (sets de aproximacion del ejercicio 3) ─────────
  log('\n=== A: "Mostrar" sets de calentamiento del ejercicio 3 ===');
  await scrollTo(0);
  // Dejar la tarjeta 3 arriba de la pantalla, como quien va por ese ejercicio.
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody');const c=document.getElementById('gm-ex-2');if(b&&c){b.style.scrollBehavior='auto';b.scrollTop=b.scrollTop+c.getBoundingClientRect().top-120;}})()`);
  await sleep(400);
  const aSt0 = await scrollTop(), aTop0 = await anchorTop('gm-ex-2');
  await ev(`window.__gmRenders=0`);
  const t0 = Date.now();
  await ev(`(()=>{const c=document.getElementById('gm-ex-2');const b=[...c.querySelectorAll('.gm-warm-toggle button')][0];if(b)b.click();return !!b})()`);
  await waitFor(`!!document.getElementById('gm-aux-2-w0')`, 4000);
  report.warm.latenciaMs = Date.now() - t0;
  const aTop1 = await anchorTop('gm-ex-2'), aSt1 = await scrollTop();
  report.warm.renders = await ev(`window.__gmRenders`);
  await sleep(700); // deja pasar cualquier scroll diferido/suave
  const aTop2 = await anchorTop('gm-ex-2'), aSt2 = await scrollTop();
  report.warm.scrollTop = [aSt0, aSt1, aSt2];
  report.warm.anclaTop = [aTop0, aTop1, aTop2];
  report.warm.saltoPx = (aTop1 == null || aTop0 == null) ? null : Math.abs(aTop1 - aTop0);
  report.warm.saltoPxDiferido = (aTop2 == null || aTop0 == null) ? null : Math.abs(aTop2 - aTop0);
  log(`  ancla(top): ${aTop0} -> ${aTop1} -> ${aTop2}   scrollTop: ${aSt0} -> ${aSt1} -> ${aSt2}`);
  check('A · la tarjeta mirada NO se mueve al mostrar calentamiento (<=8px)', report.warm.saltoPx != null && report.warm.saltoPx <= 8, `salto ${report.warm.saltoPx}px`);
  check('A · y sigue quieta 700ms despues (sin scroll diferido)', report.warm.saltoPxDiferido != null && report.warm.saltoPxDiferido <= 8, `salto ${report.warm.saltoPxDiferido}px`);

  // ───────── A2) "Mostrar" del ULTIMO ejercicio, con la pantalla ABAJO del todo ─────────
  // (si el repintado colapsa el alto del contenedor con el scroll al fondo, el scrollTop se
  //  recorta y al volver a crecer la vista queda en otro sitio: el "salto hacia abajo")
  log('\n=== A2: "Mostrar" del ultimo ejercicio con el scroll al FONDO ===');
  const nEx = setup.n;
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody');if(b){b.style.scrollBehavior='auto';b.scrollTop=b.scrollHeight;}})()`);
  await sleep(400);
  const cSt0 = await scrollTop(), cTop0 = await anchorTop('gm-ex-' + (nEx - 1));
  await ev(`window.__gmRenders=0`);
  await ev(`(()=>{const c=document.getElementById('gm-ex-${nEx - 1}');const b=[...c.querySelectorAll('.gm-warm-toggle button')][0];if(b)b.click();return !!b})()`);
  await sleep(500);
  const cTop1 = await anchorTop('gm-ex-' + (nEx - 1)), cSt1 = await scrollTop();
  report.warm.fondo = { scrollTop: [cSt0, cSt1], anclaTop: [cTop0, cTop1], saltoPx: (cTop0 == null || cTop1 == null) ? null : Math.abs(cTop1 - cTop0) };
  log(`  ancla(top): ${cTop0} -> ${cTop1}   scrollTop: ${cSt0} -> ${cSt1}`);
  check('A2 · con el scroll al fondo tampoco salta (<=8px)', report.warm.fondo.saltoPx != null && report.warm.fondo.saltoPx <= 8, `salto ${report.warm.fondo.saltoPx}px`);

  // ───────── A3) La TARJETA de calentamiento de la sesion (el ▼ de arriba) ─────────
  log('\n=== A3: abrir la tarjeta "Calentamiento — ..." (▼ de arriba) ===');
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody');const c=document.getElementById('gm-ex-1');if(b&&c){b.style.scrollBehavior='auto';b.scrollTop=b.scrollTop+c.getBoundingClientRect().top-300;}})()`);
  await sleep(400);
  const dSt0 = await scrollTop(), dTop0 = await anchorTop('gm-ex-1');
  const wuVisible0 = await ev(`(()=>{const e=document.getElementById('wu-body');return !!(e&&e.classList.contains('open'))})()`);
  await ev(`(()=>{const h=document.querySelector('#wu-wrap .wu-header');if(h)h.click();return !!h})()`);
  await sleep(600);
  const dTop1 = await anchorTop('gm-ex-1'), dSt1 = await scrollTop();
  report.warm.tarjetaSesion = { abiertaAntes: wuVisible0, scrollTop: [dSt0, dSt1], anclaTop: [dTop0, dTop1], saltoPx: (dTop0 == null || dTop1 == null) ? null : Math.abs(dTop1 - dTop0) };
  log(`  ancla(top): ${dTop0} -> ${dTop1}   scrollTop: ${dSt0} -> ${dSt1}`);
  check('A3 · abrir el calentamiento de la sesion no empuja lo que se esta leyendo (<=8px)', report.warm.tarjetaSesion.saltoPx != null && report.warm.tarjetaSesion.saltoPx <= 8, `salto ${report.warm.tarjetaSesion.saltoPx}px`);
  // 🔒 CONTROL DE COBERTURA (lo que le faltaba a esta sonda, y por eso aprobo un HTML roto):
  // medir pixeles y la clase `open` NO prueba que el toggle MUESTRE Y OCULTE. Si las filas del
  // calentamiento se salen de #wu-body —basta con que la etiqueta quede mal cerrada— quedan
  // visibles SIEMPRE, el chevron gira, la clase cambia, no hay salto… y la feature esta muerta.
  // Se mide lo que ve el ojo: alto real de las filas, y que vivan DENTRO del contenedor.
  const wuEstado = async () => JSON.parse(await ev(`(()=>{
    const body=document.getElementById('wu-body'); const wrap=document.getElementById('wu-wrap');
    const filas=[...(wrap?wrap.querySelectorAll('.wu-ex-row'):[])];
    return JSON.stringify({
      filas: filas.length,
      dentro: filas.filter(f=>body&&body.contains(f)).length,
      visibles: filas.filter(f=>f.getClientRects().length>0).length,
      open: !!(body&&body.classList.contains('open'))
    });
  })()`));
  const wuAbierto = await wuEstado();
  await ev(`(()=>{const h=document.querySelector('#wu-wrap .wu-header');if(h)h.click();})()`); await sleep(400);
  const wuCerrado = await wuEstado();
  await ev(`(()=>{const h=document.querySelector('#wu-wrap .wu-header');if(h)h.click();})()`); await sleep(400);
  report.warm.toggleReal = { abierto: wuAbierto, cerrado: wuCerrado };
  check('A3-control · las filas del calentamiento viven DENTRO de #wu-body', wuAbierto.filas > 0 && wuAbierto.dentro === wuAbierto.filas, JSON.stringify(wuAbierto));
  check('A3-control · abierto se VEN todas', wuAbierto.open && wuAbierto.visibles === wuAbierto.filas, JSON.stringify(wuAbierto));
  check('A3-control · cerrado NO se ve ninguna', !wuCerrado.open && wuCerrado.visibles === 0, JSON.stringify(wuCerrado));

  // ───────── A4) EL CASO DEL PO: con el calentamiento de la sesion ABIERTO, tocar "Mostrar" ─────────
  // Cualquier repintado del guiado vuelve a pintar la tarjeta de calentamiento CERRADA (su
  // "abierto" no se guarda en ninguna parte) → el contenido de arriba encoge de golpe y la lista
  // se desplaza sola. Ese es el "salto" que se ve al tocar Mostrar.
  log('\n=== A4: calentamiento de la sesion ABIERTO + tocar "Mostrar" de un ejercicio ===');
  const abierta = await ev(`(()=>{const e=document.getElementById('wu-body');return !!(e&&e.classList.contains('open'))})()`);
  if (!abierta) { await ev(`(()=>{const h=document.querySelector('#wu-wrap .wu-header');if(h)h.click();})()`); await sleep(400); }
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody');const c=document.getElementById('gm-ex-1');if(b&&c){b.style.scrollBehavior='auto';b.scrollTop=b.scrollTop+c.getBoundingClientRect().top-120;}})()`);
  await sleep(400);
  const eSt0 = await scrollTop(), eTop0 = await anchorTop('gm-ex-1');
  await ev(`(()=>{const c=document.getElementById('gm-ex-1');const b=[...c.querySelectorAll('.gm-warm-toggle button')][0];if(b)b.click();return !!b})()`);
  await sleep(600);
  const eTop1 = await anchorTop('gm-ex-1'), eSt1 = await scrollTop();
  const sigueAbierta = await ev(`(()=>{const e=document.getElementById('wu-body');return !!(e&&e.classList.contains('open'))})()`);
  report.warm.conTarjetaAbierta = { scrollTop: [eSt0, eSt1], anclaTop: [eTop0, eTop1], saltoPx: (eTop0 == null || eTop1 == null) ? null : Math.abs(eTop1 - eTop0), sigueAbierta };
  log(`  ancla(top): ${eTop0} -> ${eTop1}   scrollTop: ${eSt0} -> ${eSt1}   calentamiento sigue abierto: ${sigueAbierta}`);
  check('A4 · el calentamiento abierto SIGUE abierto tras repintar', sigueAbierta === true);
  check('A4 · y la lista no salta al tocar "Mostrar" (<=8px)', report.warm.conTarjetaAbierta.saltoPx != null && report.warm.conTarjetaAbierta.saltoPx <= 8, `salto ${report.warm.conTarjetaAbierta.saltoPx}px`);

  // ───────── B) BAJAR un ejercicio (boton ↓ del ejercicio 3) ─────────
  log('\n=== B: bajar el ejercicio 3 (boton ↓) ===');
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody');const c=document.getElementById('gm-ex-2');if(b&&c){b.style.scrollBehavior='auto';b.scrollTop=b.scrollTop+c.getBoundingClientRect().top-120;}})()`);
  await sleep(400);
  const bSt0 = await scrollTop(), bTop0 = await anchorTop('gm-ex-2');
  const nombres0 = await ev(`JSON.stringify([...document.querySelectorAll('#gm-body .gm-ex-name')].map(e=>e.textContent))`);
  await ev(`window.__gmRenders=0`);
  const t1 = Date.now();
  await ev(`(()=>{const c=document.getElementById('gm-ex-2');const bs=c.querySelectorAll('.cex-reorder button');if(bs[1])bs[1].click();return !!bs[1]})()`);
  await waitFor(`JSON.stringify([...document.querySelectorAll('#gm-body .gm-ex-name')].map(e=>e.textContent))!==${JSON.stringify(nombres0)}`, 5000);
  report.mover.latenciaMs = Date.now() - t1;
  const bTop1 = await anchorTop('gm-ex-2'), bSt1 = await scrollTop();
  report.mover.renders = await ev(`window.__gmRenders`);
  await sleep(900); // el gmScrollToCurrent diferido (120ms + smooth) cae aqui
  const bTop2 = await anchorTop('gm-ex-2'), bSt2 = await scrollTop();
  report.mover.scrollTop = [bSt0, bSt1, bSt2];
  report.mover.anclaTop = [bTop0, bTop1, bTop2];
  report.mover.saltoPx = (bTop1 == null || bTop0 == null) ? null : Math.abs(bTop1 - bTop0);
  report.mover.saltoPxDiferido = (bTop2 == null || bTop0 == null) ? null : Math.abs(bTop2 - bTop0);
  report.mover.ordenCambio = (await ev(`JSON.stringify([...document.querySelectorAll('#gm-body .gm-ex-name')].map(e=>e.textContent))`)) !== nombres0;
  log(`  ancla(top): ${bTop0} -> ${bTop1} -> ${bTop2}   scrollTop: ${bSt0} -> ${bSt1} -> ${bSt2}`);
  check('B · el orden cambio de verdad', report.mover.ordenCambio);
  check('B · la lista NO salta al bajar un ejercicio (<=8px)', report.mover.saltoPx != null && report.mover.saltoPx <= 8, `salto ${report.mover.saltoPx}px`);
  check('B · y sigue quieta 900ms despues (sin scroll diferido)', report.mover.saltoPxDiferido != null && report.mover.saltoPxDiferido <= 8, `salto ${report.mover.saltoPxDiferido}px`);
  check('B · un solo repintado del guiado por toque', report.mover.renders === 1, `renders=${report.mover.renders}`);
  check('B · responde en menos de 400ms', report.mover.latenciaMs < 400, `${report.mover.latenciaMs}ms`);

  // ───────── C) CAMBIAR el ejercicio (boton 🔄, el vecino de ↑↓) ─────────
  // Traia el patron viejo del reorden: dos repintados y el scroll diferido del re-embebido.
  log('\n=== C: cambiar el ejercicio 2 con 🔄 ===');
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody');const c=document.getElementById('gm-ex-1');if(b&&c){b.style.scrollBehavior='auto';b.scrollTop=b.scrollTop+c.getBoundingClientRect().top-120;}})()`);
  await sleep(400);
  const cTop0b = await anchorTop('gm-ex-1');
  const nom0 = await ev(`(()=>{const e=document.querySelector('#gm-ex-1 .gm-ex-name');return e?e.textContent:null})()`);
  await ev(`window.__gmRenders=0`);
  const t2 = Date.now();
  // Los dos pasos que da la persona: 🔄 abre el selector, y elegir uno aplica el cambio.
  await ev(`(()=>{const c=document.getElementById('gm-ex-1');const bs=c.querySelectorAll('.cex-reorder button');if(bs[2])bs[2].click();})()`);
  await sleep(400);
  await ev(`(()=>{const otro=DB.exercises.find(e=>exTrack(e)==='peso_reps'&&e.name!==${JSON.stringify(nom0)});if(otro)_applySubstitute(JSON.parse(JSON.stringify(otro)));})()`);
  await waitFor(`(()=>{const e=document.querySelector('#gm-ex-1 .gm-ex-name');return e&&e.textContent!==${JSON.stringify(nom0)}})()`, 5000);
  const latC = Date.now() - t2;
  const cTop1b = await anchorTop('gm-ex-1');
  const rendC = await ev(`window.__gmRenders`);
  await sleep(900);
  const cTop2b = await anchorTop('gm-ex-1');
  report.sustituir = { anclaTop: [cTop0b, cTop1b, cTop2b], renders: rendC, latenciaMs: latC,
    saltoPx: (cTop0b == null || cTop1b == null) ? null : Math.abs(cTop1b - cTop0b),
    saltoPxDiferido: (cTop0b == null || cTop2b == null) ? null : Math.abs(cTop2b - cTop0b) };
  log(`  ancla(top): ${cTop0b} -> ${cTop1b} -> ${cTop2b}   renders: ${rendC}`);
  check('C · cambiar el ejercicio no mueve la lista (<=8px)', report.sustituir.saltoPx != null && report.sustituir.saltoPx <= 8, `salto ${report.sustituir.saltoPx}px`);
  check('C · y sigue quieta 900ms despues (sin scroll diferido)', report.sustituir.saltoPxDiferido != null && report.sustituir.saltoPxDiferido <= 8, `salto ${report.sustituir.saltoPxDiferido}px`);
  check('C · un solo repintado del guiado', rendC === 1, `renders=${rendC}`);

} catch (e) { report.fatal = e.message; }
finally {
  await ev(`(()=>{try{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));}catch(e){}})()`);
  report.jsErrors = [...new Set(jsErrors)].slice(0, 8);
  log('\n===REPORT===\n' + JSON.stringify(report, null, 2));
  log('\n' + results.join('\n'));
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  log(`\n${results.length - fails}/${results.length} OK`);
  ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
  await sleep(300); process.exit(0);
}
