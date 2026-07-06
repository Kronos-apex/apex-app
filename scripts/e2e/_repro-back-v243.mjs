// Verificación avi-v243 — Clase 3 auditoría 2026-06-30:
//   #7  ficha técnica (#exdetail-bg) y lightbox (#ex-lightbox) ahora empujan capa (navOpenLayer)
//   #11 "← Volver a asesorados" pasa por history.back() (sin atrás muerto)
// Basado en _repro-back.mjs (v223). Sirve el repo local + Chrome headless por CDP.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';

const PORT = 8764;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-back243-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9264', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
chrome.on('error', e => { console.error('chrome', e); process.exit(1); });
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9264/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
const check = (name, cond, extra = '') => { const line = (cond ? 'OK ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''); results.push(line); log('  ' + line); };
const snap = async (label) => {
  const s = await ev(`(()=>{
    const on=id=>{const e=document.getElementById(id);return !!(e&&e.classList.contains('on'))};
    return JSON.stringify({
      inApp: location.href.includes('localhost'),
      H: history.length,
      lay: (typeof AVINAV!=='undefined')?AVINAV.layers:'?',
      stk: (typeof AVINAV!=='undefined')?AVINAV.stack.length:'?',
      sroom: on('session-room'), exroom: on('exercise-room'),
      ficha: on('exdetail-bg'), lb: on('ex-lightbox')
    });
  })()`);
  log(`    ${label.padEnd(22)} -> ${s}`);
  return JSON.parse(s);
};
const back = async () => { await ev(`history.back()`); await sleep(500); };

async function freshLogin() {
  await send('Page.navigate', { url: APP });
  await sleep(500);
  await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
  await send('Page.navigate', { url: APP });
  await sleep(500);
  // La sesión auth queda viva en el perfil: tras la 1ª escena la app entra SOLA. Llamar
  // doLogin() encima dispara un _enterAuthSession duplicado cuyo initClientView tardío hace
  // navReset EN MEDIO de la escena (artefacto del harness, no de la app). Solo login real
  // si la pantalla de login está visible sin sesión entrando.
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&!document.getElementById('avi-loading'))})()`, 25000);
  const inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  if (!inApp) {
    await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
    await ev(`doLogin()`);
    await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 20000);
  }
  await sleep(2500); // deja asentar la entrada de sesión (initClientView/navReset del boot)
  for (let k = 0; k < 8; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.tier='premium';DB.history=DB.history||{};const dt=new Date();DB.history[CUR.clientId]=[{id:'h0',routineId:'r0',routineName:'Pierna',date:dt.toISOString(),startedAt:new Date(dt.getTime()-52*60000).toISOString(),durationSec:3120,kcal:331,totalVol:3200,doneSets:10,totalSets:10,exercises:[{id:'e13',muscle:'piernas',name:'Sentadilla',track:'peso_reps',sets:[{kg:'45',reps:'10',done:true}]}]}];})()`);
  await sleep(500);
}

try {
  // ── S1 (#7 núcleo): sala sesión → sala ejercicio → FICHA → atrás ×4 ──
  log('\n=== S1: 2 salas + ficha "Ver técnica" -> ATRAS x4 (bug #7) ===');
  await freshLogin();
  await ev(`navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);`);
  const H0 = await ev(`history.length`);
  await ev(`openSessionRoom(CUR.clientId,'h0')`); await sleep(400);
  await ev(`openExerciseRoom(CUR.clientId,'e13')`); await sleep(400);
  await ev(`openExDetail('e13')`); await sleep(400);
  let s = await snap('2 salas + ficha');
  check('S1 ficha abierta, layers=3', s.ficha && s.lay === 3, 'lay=' + s.lay);
  check('S1 historial crecio 3', (await ev(`history.length`)) - H0 === 3, 'delta=' + ((await ev(`history.length`)) - H0));
  await back(); s = await snap('ATRAS #1');
  check('S1 atras1: cierra SOLO ficha (salas intactas)', !s.ficha && s.exroom && s.sroom && s.lay === 2, JSON.stringify(s));
  await back(); s = await snap('ATRAS #2');
  check('S1 atras2: cierra sala ejercicio', !s.exroom && s.sroom && s.lay === 1, JSON.stringify(s));
  await back(); s = await snap('ATRAS #3');
  check('S1 atras3: cierra sala sesion', !s.sroom && s.lay === 0, JSON.stringify(s));
  await back(); s = await snap('ATRAS #4');
  check('S1 atras4: sigue EN la app', s.inApp === true, JSON.stringify(s));

  // ── S2: lightbox ENCIMA de la ficha (encima de sala) ──
  log('\n=== S2: sala + ficha + lightbox -> ATRAS x3 ===');
  await freshLogin();
  await ev(`navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);`);
  await ev(`openSessionRoom(CUR.clientId,'h0')`); await sleep(400);
  await ev(`openExDetail('e13')`); await sleep(400);
  await ev(`openExImg('media/logo-transparente.png','Sentadilla')`); await sleep(400);
  s = await snap('sala+ficha+lightbox');
  check('S2 lightbox abierto, layers=3', s.lb && s.ficha && s.sroom && s.lay === 3, JSON.stringify(s));
  await back(); s = await snap('ATRAS #1');
  check('S2 atras1: cierra SOLO lightbox', !s.lb && s.ficha && s.sroom && s.lay === 2, JSON.stringify(s));
  await back(); s = await snap('ATRAS #2');
  check('S2 atras2: cierra ficha', !s.ficha && s.sroom && s.lay === 1, JSON.stringify(s));
  await back(); s = await snap('ATRAS #3');
  check('S2 atras3: cierra sala, sigue en app', !s.sroom && s.lay === 0 && s.inApp, JSON.stringify(s));

  // ── S3: cierre por UI (tap en el fondo de la ficha) consume SU capa ──
  log('\n=== S3: sala + ficha -> tap fondo (UI) -> ATRAS fisico ===');
  await freshLogin();
  await ev(`navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);`);
  await ev(`openSessionRoom(CUR.clientId,'h0')`); await sleep(400);
  await ev(`openExDetail('e13')`); await sleep(400);
  await ev(`document.getElementById('exdetail-bg').click()`); await sleep(500);
  s = await snap('tras tap fondo');
  check('S3 tap fondo: cierra ficha, sala intacta, layers=1', !s.ficha && s.sroom && s.lay === 1, JSON.stringify(s));
  await back(); s = await snap('ATRAS #1');
  check('S3 atras: cierra sala, sigue en app', !s.sroom && s.lay === 0 && s.inApp, JSON.stringify(s));

  // ── S4: Escape cierra el lightbox consumiendo su capa ──
  log('\n=== S4: ficha + lightbox -> Escape -> estado limpio ===');
  await freshLogin();
  await ev(`navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);`);
  await ev(`openExDetail('e13')`); await sleep(400);
  await ev(`openExImg('media/logo-transparente.png','Sentadilla')`); await sleep(400);
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`); await sleep(500);
  s = await snap('tras Escape');
  check('S4 Escape: cierra SOLO lightbox, ficha intacta, layers=1', !s.lb && s.ficha && s.lay === 1, JSON.stringify(s));
  await back(); s = await snap('ATRAS #1');
  check('S4 atras: cierra ficha, layers=0, en app', !s.ficha && s.lay === 0 && s.inApp, JSON.stringify(s));

  // ── S5 (#11): coach p-detail -> "Volver a asesorados" -> SIN atras muerto ──
  log('\n=== S5: coach detalle -> link Volver -> ATRAS (bug #11) ===');
  await freshLogin();
  await ev(`(()=>{
    showScreen('s-coach');
    CUR.loggedAs='coach';
    document.querySelectorAll('#s-coach .panel').forEach(p=>p.classList.remove('on'));
    document.getElementById('p-clients').classList.add('on');
    document.querySelectorAll('.sbi').forEach(x=>x.classList.remove('on'));
    document.getElementById('sbi-clients').classList.add('on');
    navReset(null); AVINAV.curTab='p-clients';
    if(!(DB.clients||[]).length){ DB.clients=[{id:'tc1',name:'Test Cliente',level:'Intermedio',goal:'Ganar músculo',days:3}]; }
    window.__TCID=DB.clients[0].id;
    try{ if(typeof _heavyLoaded!=='undefined') _heavyLoaded[window.__TCID]=true; }catch(e){}
  })()`);
  await sleep(300);
  await ev(`openDetail(window.__TCID)`); await sleep(400);
  const onPanel = async () => ev(`(()=>{const p=document.querySelector('#s-coach .panel.on');return p?p.id:'?'})()`);
  check('S5 en detalle: panel=p-detail, stack=1', (await onPanel()) === 'p-detail' && (await ev(`AVINAV.stack.length`)) === 1, (await onPanel()) + ' stk=' + (await ev(`AVINAV.stack.length`)));
  await ev(`document.querySelector('#p-detail .back').click()`); await sleep(500);
  check('S5 tras Volver: panel=p-clients, stack=0 (entrada consumida)', (await onPanel()) === 'p-clients' && (await ev(`AVINAV.stack.length`)) === 0, (await onPanel()) + ' stk=' + (await ev(`AVINAV.stack.length`)));
  await back();
  const armed = await ev(`AVINAV.exitArmed===true`);
  const inApp = await ev(`location.href.includes('localhost')`);
  check('S5 atras tras Volver: NO muerto (arma salida o navega), en app', inApp && ((await onPanel()) !== 'p-detail'), 'panel=' + (await onPanel()) + ' armed=' + armed);

} catch (e) { results.push('FATAL ' + e.message); }
finally {
  const errs = [...new Set(jsErrors)].slice(0, 8);
  log('\n===RESUMEN===');
  results.forEach(r => log(r));
  log('jsErrors: ' + JSON.stringify(errs));
  const bad = results.filter(r => !r.startsWith('OK'));
  log(bad.length ? `\n${bad.length} FALLA(S)` : '\nTODO OK');
  ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
  await sleep(300); process.exit(bad.length ? 1 : 0);
}
