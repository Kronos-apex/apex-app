// REPRO del boton ATRAS por PANTALLAS (reporte del PO, 4-sep-2026):
//   «cuando le doy atras en las pantallas de AVI casi nunca regresa al inicio... si estoy en
//    perfil y entro a alimentacion me devuelve a mi perfil, y si doy de nuevo atras se sale de
//    la app. Quiero que si le doy atras dos veces regrese dos veces atras, y asi sucesivamente».
//
// QUE MIDE: cada atras del sistema, paso a paso, anotando en que pantalla queda y —lo que
// importa— si la app quedo parada sobre una entrada de historial que YA NO ES SUYA
// (`history.state===null`): eso es el borde donde Android cierra la app al siguiente atras.
//
// LOS DOS MUNDOS:
//   · NORMAL      — Chrome tal cual (aqui la logica JS siempre se vio bien; por eso el bug
//                   «se sale a la segunda» era irreproducible en escritorio desde v211).
//   · SABOTAJE    — se neutraliza `history.pushState` MIENTRAS se esta despachando un popstate,
//                   que es justo lo que el WebView del TWA pierde a veces (nota de app-1-infra).
//                   Una navegacion que solo sobrevive re-empujando dentro del popstate se cae
//                   aqui; una que empuja su entrada AL NAVEGAR HACIA ADELANTE, no.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';

const PORT = 8773;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-backpant-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9273', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
chrome.on('error', e => { console.error('chrome', e); process.exit(1); });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9273/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
  if (!(await ev(`!!(typeof CUR!=='undefined'&&CUR.clientId)`))) throw new Error('login no completo (rate limit?)');
  for (let k = 0; k < 8; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';try{if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));if(typeof ntClose==='function')ntClose(false);}catch(e){}})()`); await sleep(150); }
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}})()`);
}

// CONTADOR DE PROFUNDIDAD: entradas de historial por encima de la RAIZ de la app (el guard, que
// ya estaba puesto cuando arranca este contador). Es la unica medida honesta de «cuanto le falta
// a Android para cerrar la app»: idx=0 es la raiz —Inicio, sano— y **idx<0 significa que la app
// se cayo por debajo de su propia raiz**, que es donde el TWA se cierra y donde ya ningun atras
// vuelve a responder. (Primera version de esta sonda: usaba `history.state===null`, que da
// FALSO NEGATIVO en cuanto quedan entradas viejas de la app por debajo.)
const contador = () => ev(`(()=>{ if(window.__idx!=null) return 'ya'; window.__idx=0;
  const op=history.pushState.bind(history); const or=history.replaceState.bind(history);
  history.pushState=function(){ window.__idx++; return op.apply(history,arguments); };
  history.replaceState=function(){ return or.apply(history,arguments); };
  window.addEventListener('popstate',()=>{ window.__idx--; }, true);
  return 'ok'; })()`);

// El WebView del TWA pierde el pushState hecho DENTRO del popstate (nota de app-1-infra.js).
// 🔒 CONTROL DE DISCRIMINACION: el sabotaje se decide por la PILA DE LLAMADA (el pushState sale
// de dentro de `_aviHandleBack`), no por un listener de popstate: un listener registrado despues
// del de la app corre DESPUES de ella —aunque sea de captura, porque en el propio target manda el
// orden de registro— y el sabotaje salia VERDE sin morder nada.
const sabotear = () => ev(`(()=>{ if(window.__sabot) return 'ya'; window.__sabot=1; window.__dropped=0;
  const op=history.pushState.bind(history);
  history.pushState=function(){ const st=(new Error()).stack||'';
    if(st.indexOf('_aviHandleBack')>=0){ window.__dropped++; return; }
    return op.apply(history,arguments); };
  return 'ok'; })()`);

const snap = async label => {
  const s = await ev(`(()=>{
    const rooms=[...document.querySelectorAll('.sroom')].filter(r=>r.classList.contains('on')).map(r=>r.id.replace('-room',''));
    const tab=((document.querySelector('#s-client .cnp.on')||{}).id||'').replace('cn-','');
    return JSON.stringify({tab, rooms, idx: window.__idx, alBorde: window.__idx<0, lay:AVINAV.layers, stk:AVINAV.stack.length, armed:AVINAV.exitArmed?1:0});
  })()`);
  log(`    ${String(label).padEnd(16)} -> ${s}`);
  return JSON.parse(s);
};
const back = async () => { await ev(`history.back()`); await sleep(450); };
// Deja al asesorado en Hoy, con el stack limpio y —esto importa— con una PROFUNDIDAD CONOCIDA:
// si el escenario anterior terminó en el fondo (con el aviso de salida puesto, que a propósito NO
// repone entrada hasta que vence), el siguiente arrancaría descuadrado y mediría otra cosa.
const enInicio = async () => {
  await ev(`(()=>{ AVINAV.exitArmed=false; navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);
    if(!(history.state&&typeof history.state.n==='number')) navPush('aviGuard'); })()`);
  await sleep(250);
};

const report = {};
try {
  await freshLogin();
  await contador();

  // ───────── S1: EL CASO DEL PO — Perfil → Alimentación → atrás, atrás ─────────
  for (const modo of ['normal', 'sabotaje']) {
    if (modo === 'sabotaje') { log('\n>>> SABOTAJE ACTIVO: el pushState dentro del popstate se pierde (WebView del TWA)'); await sabotear(); }
    log(`\n=== S1 (${modo}): Hoy → Perfil → habitación de Alimentación → ATRÁS x3 ===`);
    await enInicio();
    await ev(`cnTab('cn-profile',_cnTabEl('cn-profile'))`); await sleep(350);
    await snap('en Perfil');
    await ev(`openNutritionRoom(CUR.clientId)`); await sleep(450);
    const s0 = await snap('alimentación');
    const b1 = await back(), q1 = await snap('ATRÁS #1');
    const q2 = (await back(), await snap('ATRÁS #2'));
    const q3 = (await back(), await snap('ATRÁS #3'));
    report['s1_' + modo] = { s0, q1, q2, q3 };
    check(`S1 (${modo}) · el atrás #1 cierra Alimentación y deja Perfil`, q1.rooms.length === 0 && q1.tab === 'profile', JSON.stringify(q1));
    check(`S1 (${modo}) · el atrás #2 vuelve a Inicio (no se sale)`, q2.tab === 'today' && !q2.alBorde, JSON.stringify(q2));
    // En Inicio el aviso SÍ deja la app en el fondo a propósito (ver S5): lo que no puede pasar
    // es salir en seco, sin avisar.
    check(`S1 (${modo}) · en Inicio el atrás #3 pide confirmación, no sale en seco`, q3.armed === 1 && q3.tab === 'today', JSON.stringify(q3));
  }
  report.dropped = await ev(`window.__dropped||0`);

  // ───────── S2: TRES pestañas de fondo — tres atrás, tres pasos ─────────
  log('\n=== S2 (sabotaje): Hoy → Rutinas → Progreso → Perfil → ATRÁS x3 ===');
  await enInicio();
  await ev(`cnTab('cn-routines',_cnTabEl('cn-routines'))`); await sleep(300);
  await ev(`cnTab('cn-history',_cnTabEl('cn-history'))`); await sleep(300);
  await ev(`cnTab('cn-profile',_cnTabEl('cn-profile'))`); await sleep(300);
  await snap('en Perfil');
  const t1 = (await back(), await snap('ATRÁS #1'));
  const t2 = (await back(), await snap('ATRÁS #2'));
  const t3 = (await back(), await snap('ATRÁS #3'));
  report.s2 = { t1, t2, t3 };
  check('S2 · atrás #1 → Progreso', t1.tab === 'history', JSON.stringify(t1));
  check('S2 · atrás #2 → Rutinas', t2.tab === 'routines', JSON.stringify(t2));
  check('S2 · atrás #3 → Inicio, y sigue dentro de la app', t3.tab === 'today' && !t3.alBorde, JSON.stringify(t3));

  // ───────── S3: habitaciones ANIDADAS sobre una pestaña ─────────
  log('\n=== S3 (sabotaje): Perfil → Alimentación → ficha de ejercicio encima → ATRÁS x3 ===');
  await enInicio();
  await ev(`cnTab('cn-history',_cnTabEl('cn-history'))`); await sleep(300);
  await ev(`openNutritionRoom(CUR.clientId)`); await sleep(400);
  await ev(`openExDetail((DB.exercises[0]||{}).id)`); await sleep(400);
  await snap('ficha sobre sala');
  const u1 = (await back(), await snap('ATRÁS #1'));
  const u2 = (await back(), await snap('ATRÁS #2'));
  const u3 = (await back(), await snap('ATRÁS #3'));
  report.s3 = { u1, u2, u3 };
  check('S3 · atrás #1 cierra la ficha y deja la sala abierta', u1.rooms.includes('nutrition'), JSON.stringify(u1));
  check('S3 · atrás #2 cierra la sala y deja Progreso', u2.rooms.length === 0 && u2.tab === 'history', JSON.stringify(u2));
  check('S3 · atrás #3 vuelve a Inicio', u3.tab === 'today' && !u3.alBorde, JSON.stringify(u3));

  // ───────── S4: MODAL sin capa propia encima de una pestaña (el unico camino que aun
  // re-empuja dentro del popstate: se comprueba que la reposicion DIFERIDA lo salva) ─────────
  log('\n=== S4 (sabotaje): Perfil → modal → ATRÁS x3 ===');
  await enInicio();
  await ev(`cnTab('cn-profile',_cnTabEl('cn-profile'))`); await sleep(300);
  await ev(`om('m-med')`); await sleep(300);
  await snap('modal abierto');
  const m1 = (await back(), await snap('ATRÁS #1'));
  const m2 = (await back(), await snap('ATRÁS #2'));
  const m3 = (await back(), await snap('ATRÁS #3'));
  report.s4 = { m1, m2, m3, dropped: await ev(`window.__dropped||0`) };
  check('S4 · atrás #1 cierra el modal y deja Perfil, sin perder profundidad', m1.tab === 'profile' && !m1.alBorde && m1.stk === 1, JSON.stringify(m1));
  check('S4 · atrás #2 vuelve a Inicio', m2.tab === 'today' && !m2.alBorde, JSON.stringify(m2));
  check('S4 · atrás #3 pide confirmación en vez de salir en seco', m3.armed === 1 && m3.tab === 'today', JSON.stringify(m3));
  check('S4 · el sabotaje SÍ mordió (si no, esta prueba no prueba nada)', report.s4.dropped > 0, `empujes descartados: ${report.s4.dropped}`);

  // ───────── S5: LA SALIDA. El doble-atrás tiene que poder CERRAR la app ─────────
  // 🔒 Con la reposición verificada de v572, si el aviso repusiera su entrada «atrás otra vez» se
  // la comería y volvería a avisar: la app no se cerraría NUNCA. (Antes se cerraba de chiripa,
  // porque el WebView perdía ese empuje.) Se mide el estado real: con el aviso puesto, por debajo
  // NO puede quedar ninguna entrada nuestra — solo así Android cierra al siguiente atrás.
  log('\n=== S5 (sabotaje): en Inicio, el atrás deja la app lista para cerrarse ===');
  await enInicio();
  let fondo = null;
  for (let k = 1; k <= 6 && !fondo; k++) {
    await back();
    const s = await snap('ATRÁS #' + k);
    const propia = await ev(`(()=>{const s=history.state;return !!(s&&typeof s.n==='number')})()`);
    if (s.armed === 1 && !propia) fondo = { presiones: k, ...s };
    if (s.tab !== 'today') break; // salió de Inicio: el escenario ya no aplica
  }
  report.s5 = { fondo };
  check('S5 · con el aviso puesto no queda ninguna entrada nuestra debajo (Android puede cerrar)', !!fondo, JSON.stringify(fondo));
  await sleep(2600);
  const colchon = await ev(`(()=>{const s=history.state;return !!(s&&typeof s.n==='number')})()`);
  report.s5.colchonRepuesto = colchon;
  check('S5 · si NO sale, al vencer el aviso vuelve el colchón (no se cierra en silencio)', colchon === true, `entrada propia: ${colchon}`);

} catch (e) { report.fatal = e.message; }
finally {
  report.jsErrors = [...new Set(jsErrors)].slice(0, 8);
  log('\n===REPORT===\n' + JSON.stringify(report, null, 2));
  log('\n' + results.join('\n'));
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  log(`\n${results.length - fails}/${results.length} OK`);
  ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
  await sleep(300); process.exit(0);
}
