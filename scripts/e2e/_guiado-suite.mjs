// Suite E2E del GUIADO post-clásica (tarea #19, 2026-07-07): puerto de los escenarios
// S3-S22 de _repro-plancha.mjs al mundo F5 donde "Hoy" ES el guiado embebido (no hay
// flag ax_ui_guided, ni overlay openGuidedMode, ni vista clásica). Cambios de fondo:
//   · setup = renderClientToday embebe (antes: setUiGuided + openGuidedMode overlay)
//   · S5: gmFinishEarly ya NO cierra el guiado (embebido = el tab; solo limpia timers)
//   · S9: el volumen se verifica en el historial (totalVol) — #prog-vol murió en F5b
//   · S15: atrás con descanso abierto lo MINIMIZA a banner (v288), ya no lo salta;
//     con plancha (hold) lo CANCELA (v245). La contraprueba overlay murió con F5.
//   · S12/S16 (flag + interruptor) quedaron obsoletos — los cubre _verify-f5a.mjs
//   · S20b: el throw del embebido cae a la TARJETA DE ERROR "Recargar la app" (la
//     clásica de respaldo murió en F5b). Sigue siendo el escenario final destructivo.
// Igual que el original: login real (samuel), server local, Chrome headless por CDP.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = 8767;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-guiado-' + Date.now();
const SHOTS = 'C:/Users/KRONOS/Desktop/AVI/_shots-guiado';
mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9267', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
chrome.on('error', e => { console.error('chrome', e); process.exit(1); });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9267/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
const shot = async name => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(r.data, 'base64')); } catch {} };

await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (name, cond, extra = '') => { const line = (cond ? 'OK ' : 'FAIL ') + name + (extra ? ' — ' + extra : ''); results.push(line); log('  ' + line); };

async function freshLogin() {
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function'&&!document.getElementById('avi-loading'))})()`, 60000);
  // UN solo doLogin con espera larga; NUNCA reintentar encima (gotcha _enterAuthSession v243)
  let inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  for (let intento = 1; !inApp && intento <= 2; intento++) {
    await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
    await ev(`doLogin()`);
    await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 60000);
    inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
    if (!inApp && intento === 1) {
      log('  login lento: recarga completa y reintento');
      await send('Page.navigate', { url: APP });
      await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function')})()`, 40000);
      inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
    }
  }
  if (!inApp) { log('FATAL: no se pudo entrar a la app (login)'); throw new Error('login'); }
  await sleep(2500);
  for (let k = 0; k < 8; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
  // El poll de 15s (_pollAuthClient) pisaría la rutina inyectada — apagado SOLO en el harness
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}})()`);
}

// Inyecta una rutina de prueba como la de HOY y deja "Hoy" re-renderizada (embebe el guiado).
// mkExs: cuerpo JS que devuelve el array de ejercicios (corre en la página, con lib() a mano).
async function setR(name, mkExs, extra = '') {
  return await ev(`(()=>{try{
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const today=days[new Date().getDay()];
    const lib=id=>JSON.parse(JSON.stringify(DB.exercises.find(e=>e.id===id)));
    const byTrack=t=>JSON.parse(JSON.stringify(DB.exercises.find(e=>exTrack(e)===t)));
    Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));
    try{clearTodayMood(CUR.clientId);}catch(e){}
    const exs=(${mkExs})({lib,byTrack});
    c.routines=[{id:'rTest', day:today, name:${JSON.stringify(name)}, ${extra} exercises:exs}];
    CUR.todayWorking=null; CUR.todayOverride=null; CUR.todayRenderedDay=null;
    navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);
    renderClientToday(c);
    const g=document.getElementById('guided-mode');
    return JSON.stringify({today, tracks:exs.map(e=>exTrack(e)), embedded:g.classList.contains('gm-embedded'), hidden:g.classList.contains('hidden')});
  }catch(e){return JSON.stringify({err:String(e&&e.stack||e)});}})()`);
}
const clean = () => ev(`(()=>{try{clearTodayMood(CUR.clientId);}catch(e){}if(DB.history&&DB.history[CUR.clientId])DB.history[CUR.clientId]=DB.history[CUR.clientId].filter(h=>h.routineId!=='rTest');Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));['workout-finish','wf','m-wf'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on','show');e.style.display='none';}});})()`);

try {
  await freshLogin();
  log('\n=== SETUP: rutina cardio/HIIT con plancha embebida en "Hoy" ===');
  let setup = await setR('Cardio HIIT Test', `({lib,byTrack})=>{const h=lib('e189');h.sets=2;h.hiit={work:2,rest:1};const p=lib('e17');p.sets=2;const c=byTrack('cardio')||lib('e17');return [h,p,c];}`);
  log('  setup: ' + setup);
  await sleep(500);
  const st = JSON.parse(setup);
  check('setup: tracks hiit/tiempo', st.tracks && st.tracks[0] === 'hiit' && st.tracks[1] === 'tiempo', setup);
  check('setup: "Hoy" ES el guiado embebido (post-F5)', st.embedded && !st.hidden, setup);

  // ── S3: isométrico · ▶ CRONO no marca de una (el bug original de la plancha) ──
  log('\n=== S3: plancha isométrica · ▶ CRONO (3s) ===');
  // La plancha debe ser el PASO ACTUAL para que, al terminar de aguantar, encadene el
  // descanso (v299): se marca el HIIT previo directo y gmRebuild recalcula el paso.
  await ev(`(()=>{setDone('rTest',0,0,true);setDone('rTest',0,1,true);gmRebuild();closeStartCard();})()`);
  await sleep(400);
  await ev(`(()=>{const row=document.getElementById('gm-set-1-0');const inp=row.querySelector('.gm-sinput[data-field="secs"]');inp.value='3';row.querySelector('.gm-timer-go').click();})()`);
  await sleep(500);
  let s = JSON.parse(await ev(`JSON.stringify({
    done:isDone('rTest',1,0),
    rowDone:(document.getElementById('gm-set-1-0')||{classList:{contains:()=>'?'}}).classList.contains('set-done'),
    overlay:!document.getElementById('gm-rest-overlay').classList.contains('hidden'),
    gmHold:document.getElementById('gm-rest-overlay').classList.contains('gm-hold'),
    title:(document.getElementById('gm-rest-title')||{}).textContent,
    skip:(document.querySelector('#gm-rest-overlay .gm-rest-skip')||{}).textContent
  })`));
  await shot('s3-hold-encurso');
  check('S3 durante: serie NO marcada', !s.done && !s.rowDone, JSON.stringify(s));
  check('S3 durante: overlay AMBAR con Aguanta', s.overlay && s.gmHold && /Aguanta/.test(s.title || ''), 'title=' + s.title);
  check('S3 durante: botón dice Cancelar', /Cancelar/.test(s.skip || ''), 'skip=' + s.skip);
  await sleep(4200);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',1,0),overlay:!document.getElementById('gm-rest-overlay').classList.contains('hidden'),gmHold:document.getElementById('gm-rest-overlay').classList.contains('gm-hold'),title:(document.getElementById('gm-rest-title')||{}).textContent,skip:(document.querySelector('#gm-rest-overlay .gm-rest-skip')||{}).textContent,rest:!!GM.restTimer})`));
  check('S3 al terminar: marcada y el DESCANSO ARRANCA solo (v299)', s.done && s.overlay && !s.gmHold && /completada/.test(s.title || '') && /Saltar/.test(s.skip || '') && s.rest, JSON.stringify(s));
  await ev(`gmSkipRest()`); // cierra el descanso para que S3x arranque limpio
  await sleep(300);

  // ── S3x: cancelar el hold con el botón del overlay ──
  log('\n=== S3x: ▶ CRONO y "⏹ Cancelar" ===');
  await ev(`(()=>{setDone('rTest',1,1,false);gmRender();closeStartCard();})()`);
  await sleep(500);
  await ev(`(()=>{const row=document.getElementById('gm-set-1-1');row.querySelector('.gm-sinput[data-field="secs"]').value='30';row.querySelector('.gm-timer-go').click();})()`);
  await sleep(1200);
  await ev(`(()=>{document.querySelector('#gm-rest-overlay .gm-rest-skip').click();})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',1,1),overlay:!document.getElementById('gm-rest-overlay').classList.contains('hidden'),gmHold:document.getElementById('gm-rest-overlay').classList.contains('gm-hold'),skip:(document.querySelector('#gm-rest-overlay .gm-rest-skip')||{}).textContent,startCard:!!document.getElementById('gm-start-card')})`));
  check('S3x cancelar: NO marca, overlay cerrado/restaurado, SIN tarjeta siguiente', !s.done && !s.overlay && !s.gmHold && /Saltar/.test(s.skip || '') && !s.startCard, JSON.stringify(s));

  // ── S4: HIIT · ▶ Iniciar no marca rondas de una ──
  log('\n=== S4: HIIT (2s/1s × 2) · ▶ Iniciar ===');
  await ev(`(()=>{for(let si=0;si<2;si++)setDone('rTest',0,si,false);gmRender();})()`);
  await sleep(400);
  await ev(`document.getElementById('gm-hiit-btn-0').click()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({d0:isDone('rTest',0,0),d1:isDone('rTest',0,1),phase:(document.getElementById('gm-hiit-phase-0')||{}).textContent})`));
  check('S4 durante: rondas NO marcadas de una', !s.d0 && !s.d1, JSON.stringify(s));
  check('S4 durante: fase TRABAJO visible', /TRABAJO/.test(s.phase || ''), 'phase=' + s.phase);
  await sleep(7000);
  s = JSON.parse(await ev(`JSON.stringify({d0:isDone('rTest',0,0),d1:isDone('rTest',0,1),disp:(document.getElementById('gm-hiit-disp-0')||{}).textContent})`));
  check('S4 al terminar: 2/2 rondas y ✓', s.d0 && s.d1 && s.disp === '✓', JSON.stringify(s));

  // ── S5: P2 finalizar/reiniciar + P10 reset diario (embebido: finalizar NO cierra el tab) ──
  log('\n=== S5: Reiniciar + Finalizar (P2) y reset diario (P10) — embebido ===');
  s = JSON.parse(await ev(`JSON.stringify({acts:!!document.getElementById('gm-session-actions')})`));
  check('S5 P2: fila Reiniciar/Finalizar presente', s.acts, JSON.stringify(s));
  await ev(`(()=>{window.confirm=()=>true;gmResetSession();})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({d00:isDone('rTest',0,0),d01:isDone('rTest',0,1),d10:isDone('rTest',1,0),step:GM.currentStep,embedded:_gmIsEmbedded(),visible:!document.getElementById('guided-mode').classList.contains('hidden')})`));
  check('S5 P2 reiniciar: todo desmarcado, paso 0, guiado sigue embebido', !s.d00 && !s.d01 && !s.d10 && s.step === 0 && s.embedded && s.visible, JSON.stringify(s));
  await ev(`(()=>{setDone('rTest',0,0,true);gmRender();gmFinishEarly();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const h=(DB.history[CUR.clientId]||[]).find(x=>x.routineId==='rTest');return {embedded:_gmIsEmbedded(),visible:!document.getElementById('guided-mode').classList.contains('hidden'),hist:!!h,doneSets:h&&h.doneSets,timers:!!(GM.restTimer||GM.hiit||GM.holding)};})())`));
  check('S5 P2 finalizar: guarda historial parcial (1 serie); el embebido NO se oculta (es el tab) y sin timers', s.hist && s.doneSets === 1 && s.embedded && s.visible && !s.timers, JSON.stringify(s));
  // P10: cambio de día → el siguiente render de "Hoy" resetea la sesión (prepareTodaySession)
  await ev(`(()=>{localStorage.setItem('session_date_rTest','Tue Jan 01 2030');CUR.todayRenderedDay=null;renderClientToday(DB.clients.find(x=>x.id===CUR.clientId));})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({d00:isDone('rTest',0,0),step:GM.currentStep,embedded:_gmIsEmbedded()})`));
  check('S5 P10: en día nuevo el embebido resetea la sesión solo', !s.d00 && s.step === 0 && s.embedded, JSON.stringify(s));
  await clean();

  // ── S6: P1 check-in de ánimo dentro del guiado ──
  log('\n=== S6: check-in de ánimo (P1) ===');
  await setR('Animo Simple Test', `({byTrack})=>{const r=byTrack('reps');r.sets=2;return [r];}`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({chooser:!!document.querySelector('#gm-body .checkin-card'),btns:document.querySelectorAll('#gm-body .mood-btn').length})`));
  check('S6 P1: chooser de ánimo visible dentro del guiado', s.chooser && s.btns > 0, JSON.stringify(s));
  await ev(`(()=>{document.querySelector('#gm-body .mood-btn').click();})()`);
  await sleep(700);
  s = JSON.parse(await ev(`JSON.stringify({mood:getTodayMood(CUR.clientId),chooser:!!document.querySelector('#gm-body .checkin-card'),embedded:_gmIsEmbedded(),steps:GM.steps.length})`));
  check('S6 P1: al elegir se guarda el ánimo, el chooser se va y el guiado se reconstruye', !!s.mood && !s.chooser && s.embedded && s.steps > 0, JSON.stringify(s));
  await clean();

  // ── S7: P3 reordenar (las claves de sesión viajan con el ejercicio) ──
  log('\n=== S7: reordenar ↑/↓ con serie hecha + dropset + log (P3) ===');
  await setR('Reorden Test', `({lib,byTrack})=>{const h=lib('e189');h.sets=2;h.hiit={work:2,rest:1};const p=lib('e17');p.sets=2;const c=byTrack('cardio')||lib('e17');return [h,p,c];}`);
  await sleep(600);
  s = JSON.parse(await ev(`JSON.stringify({tools:document.querySelectorAll('#gm-body .cex-reorder').length})`));
  check('S7 P3: botones reordenar/sustituir presentes en las tarjetas', s.tools >= 3, JSON.stringify(s));
  await ev(`(()=>{setDone('rTest',1,0,true);localStorage.setItem('drop_rTest_1_0','1');localStorage.setItem('log_rTest_1_0_secs','45');gmMoveEx(1,1);})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({exAt2:(GM.exercises[2]||{}).name,d2:isDone('rTest',2,0),drop2:localStorage.getItem('drop_rTest_2_0'),secs2:localStorage.getItem('log_rTest_2_0_secs'),d1:isDone('rTest',1,0),steps:GM.steps.length,embedded:_gmIsEmbedded(),startCard:!!document.getElementById('gm-start-card')})`));
  log('    tras bajar la plancha -> ' + JSON.stringify(s));
  check('S7 P3: la plancha bajó CON su serie hecha, su dropset y sus segundos; sin tarjeta extra', /lancha/.test(s.exAt2 || '') && s.d2 && s.drop2 === '1' && s.secs2 === '45' && !s.d1 && s.steps > 0 && s.embedded && !s.startCard, JSON.stringify(s));
  await clean();

  // ── S8: P3 · reordenar la tarjeta HIIT MIENTRAS corre (timer no queda huérfano) ──
  log('\n=== S8: mover la tarjeta HIIT con el intervalo en curso (P3) ===');
  await setR('HIIT Reorden Test', `({lib,byTrack})=>{const h=lib('e189');h.sets=2;h.hiit={work:2,rest:1};const p=lib('e17');p.sets=2;return [h,p];}`);
  await sleep(600);
  await ev(`document.getElementById('gm-hiit-btn-0').click()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({hiitLive:!!GM.hiit})`));
  check('S8 P3: HIIT corriendo antes de reordenar', s.hiitLive, JSON.stringify(s));
  await ev(`gmMoveEx(0,1)`);
  await sleep(600);
  s = JSON.parse(await ev(`JSON.stringify({hiitCleared:!GM.hiit,steps:GM.steps.length,embedded:_gmIsEmbedded()})`));
  check('S8 P3: al reordenar el HIIT en curso, el intervalo se cancela y el guiado se reconstruye', s.hiitCleared && s.steps > 0 && s.embedded, JSON.stringify(s));
  await sleep(2500);
  s = JSON.parse(await ev(`JSON.stringify({hiitStillNull:!GM.hiit})`));
  check('S8 P3: pasados 2.5s el intervalo viejo no revivió ni marcó rondas fantasma', s.hiitStillNull, JSON.stringify(s));
  await clean();

  // ── S9: P4 · lastre (peso añadido) para peso corporal ──
  log('\n=== S9: lastre para peso corporal (P4) ===');
  await setR('Corporal Test', `({byTrack})=>{const r=byTrack('reps');r.sets=2;return [r];}`);
  await sleep(600);
  s = JSON.parse(await ev(`JSON.stringify({toggle:!!document.querySelector('#gm-body .gm-lastre-toggle'),kgBefore:!!document.querySelector('#gm-set-0-0 .gm-sinput[data-field="kg"]'),repsBefore:!!document.querySelector('#gm-set-0-0 .gm-sinput[data-field="reps"]')})`));
  check('S9 P4: toggle de lastre presente; sin activar la fila muestra REPS y NO KG', s.toggle && s.repsBefore && !s.kgBefore, JSON.stringify(s));
  await ev(`document.querySelector('#gm-body .gm-lastre-toggle button').click()`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify({kgAfter:!!document.querySelector('#gm-set-0-0 .gm-sinput[data-field="kg"]'),repsAfter:!!document.querySelector('#gm-set-0-0 .gm-sinput[data-field="reps"]'),on:localStorage.getItem('lastre_rTest_0')})`));
  check('S9 P4: al activar lastre aparece la celda KG junto a REPS y el estado persiste', s.kgAfter && s.repsAfter && s.on === '1', JSON.stringify(s));
  await ev(`(()=>{const r=document.getElementById('gm-set-0-0');r.querySelector('.gm-sinput[data-field="kg"]').value='10';r.querySelector('.gm-sinput[data-field="reps"]').value='12';gmToggleSet(0,0,0);})()`);
  await sleep(300);
  // el volumen visible del hero clásico murió en F5b → la prueba de que el lastre SUMA
  // volumen es la entrada de historial (updateClientProgress → saveSessionToHistory)
  await ev(`(()=>{if(GM.restTimer)gmSkipRest();updateClientProgress(GM.routine);})()`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const h=(DB.history[CUR.clientId]||[]).find(x=>x.routineId==='rTest');return {kg:getLog('rTest',0,0,'kg'),reps:getLog('rTest',0,0,'reps'),done:isDone('rTest',0,0),vol:h&&h.totalVol};})())`));
  check('S9 P4: la serie con lastre guarda kg y reps y suma volumen (10×12=120 en historial)', s.kg === '10' && s.reps === '12' && s.done && s.vol === 120, JSON.stringify(s));
  await clean();

  // ── S10: P12 · cabecera de rutina (nombre + nota + por-qué) ──
  log('\n=== S10: cabecera nombre/nota/por-qué (P12) ===');
  await setR('Rutina Prueba P12', `({byTrack})=>{const r=byTrack('reps');r.sets=2;return [r];}`, `note:'Cuida la técnica hoy', why:'Toca empuje para equilibrar la semana',`);
  await sleep(600);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const h=document.querySelector('#gm-body .gm-routine-head');const txt=h?h.textContent:'';return {head:!!h,name:/Rutina Prueba P12/.test(txt),note:/Cuida la técnica hoy/.test(txt),why:/equilibrar la semana/.test(txt),pills:/2 series/.test(txt)};})())`));
  check('S10 P12: la cabecera muestra nombre, nota, por-qué y pills', s.head && s.name && s.note && s.why && s.pills, JSON.stringify(s));
  await clean();

  // ── S11: P11 · foto del ejercicio en la tarjeta ──
  log('\n=== S11: thumb de foto del ejercicio (P11) ===');
  await setR('Foto Test', `()=>{const w=DB.exercises.find(e=>exImgSrc(e));const ex=JSON.parse(JSON.stringify(w));ex.sets=1;return [ex];}`);
  await sleep(600);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const ic=document.querySelector('#gm-ex-0 .gm-ex-icon');const img=ic?ic.querySelector('img.exicon-img'):null;return {icon:!!ic,img:!!img,src:img?(img.getAttribute('src')||'').slice(-24):''};})())`));
  check('S11 P11: la tarjeta pinta la foto del ejercicio (img.exicon-img) cuando existe', s.icon && s.img && /\.jpg$/.test(s.src), JSON.stringify(s));
  await clean();

  // ── S13: básicos del embebido (marcar serie; completar todo NO oculta el tab) ──
  log('\n=== S13: marcar y completar en el embebido ===');
  await setR('Embebido Test', `({byTrack})=>{const r=byTrack('reps');r.sets=2;return [r];}`, `note:'Nota E',`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const g=document.getElementById('guided-mode');const con=document.getElementById('cn-today-body');return {inTab:!!(con&&con.contains(g)),embedded:g.classList.contains('gm-embedded'),hidden:g.classList.contains('hidden'),body:!!document.getElementById('gm-body'),cards:document.querySelectorAll('#gm-body .gm-ex-card').length};})())`));
  check('S13: "Hoy" muestra el guiado embebido (dentro del tab, con tarjetas)', s.inTab && s.embedded && !s.hidden && s.body && s.cards >= 1, JSON.stringify(s));
  await ev(`(()=>{const chk=document.getElementById('gm-chk-0-0');if(chk)chk.click();})()`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',0,0),embedded:_gmIsEmbedded()})`));
  check('S13: marcar una serie desde el embebido funciona y sigue embebido', s.done && s.embedded, JSON.stringify(s));
  await ev(`(()=>{if(GM.restTimer)gmSkipRest();const chk=document.getElementById('gm-chk-0-1');if(chk)chk.click();})()`);
  await sleep(700);
  s = JSON.parse(await ev(`JSON.stringify({allDone:isDone('rTest',0,0)&&isDone('rTest',0,1),hidden:document.getElementById('guided-mode').classList.contains('hidden'),embedded:_gmIsEmbedded(),btnHidden:(document.getElementById('gm-action-btn')||{style:{}}).style.display==='none'})`));
  check('S13: al completar TODO el embebido no se oculta (queda en el tab) y el botón "Cerrar" desaparece', s.allDone && !s.hidden && s.embedded && s.btnHidden, JSON.stringify(s));
  await clean();

  // ── S14: el poll en vivo NO corta la serie del embebido ──
  log('\n=== S14: poll en vivo con timer del embebido en curso ===');
  await setR('Poll Test', `({lib,byTrack})=>{const h=lib('e189');h.sets=2;h.hiit={work:2,rest:1};const r=byTrack('reps');r.sets=2;return [h,r];}`);
  await sleep(500);
  // (el chooser de ánimo convive con las tarjetas — NO se elige: pickMood ADAPTARÍA la rutina)
  await ev(`(()=>{const b=document.getElementById('gm-hiit-btn-0');if(b)b.click();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({hiitLive:!!GM.hiit,embedded:_gmIsEmbedded()})`));
  check('S14: HIIT del embebido corriendo antes del poll', s.hiitLive && s.embedded, JSON.stringify(s));
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.routines[0].name='Plan Cambiado';renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({hiitStillLive:!!GM.hiit,embedded:_gmIsEmbedded()})`));
  check('S14: el poll NO cortó el HIIT en curso (timer vivo, sigue embebido)', s.hiitStillLive && s.embedded, JSON.stringify(s));
  await sleep(9000);
  s = JSON.parse(await ev(`JSON.stringify({hiitDone:!GM.hiit})`));
  check('S14: el HIIT termina normalmente tras el poll', s.hiitDone, JSON.stringify(s));
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({embedded:_gmIsEmbedded(),name:/Plan Cambiado/.test((document.querySelector('#gm-body .gm-routine-head')||{textContent:''}).textContent)})`));
  check('S14: sin timer vivo, un render posterior sí aplica el plan nuevo (refresco diferido)', s.embedded && s.name, JSON.stringify(s));
  await clean();

  // ── S15: atrás con el guiado embebido (tab + descanso MINIMIZA v288 + hold CANCELA v245) ──
  log('\n=== S15: atrás con el guiado embebido (F3 + v288) ===');
  await setR('Atras Test', `({lib,byTrack})=>{const r=byTrack('reps');r.sets=2;const p=lib('e17');p.sets=2;return [r,p];}`);
  await sleep(500);
  // (el chooser de ánimo convive con las tarjetas — NO se elige: pickMood ADAPTARÍA la rutina)
  s = JSON.parse(await ev(`JSON.stringify({closed:_aviCloseTopOverlay(),embedded:_gmIsEmbedded(),hidden:document.getElementById('guided-mode').classList.contains('hidden')})`));
  check('S15 F3: atrás NO cierra el guiado embebido (es un tab, no un overlay)', s.closed === false && s.embedded && !s.hidden, JSON.stringify(s));
  // Descanso REAL abierto (marcar una serie lo lanza) → atrás lo MINIMIZA a banner (v288)
  await ev(`(()=>{const chk=document.getElementById('gm-chk-0-0');if(chk)chk.click();})()`);
  await sleep(600);
  s = JSON.parse(await ev(`JSON.stringify({restOpen:!document.getElementById('gm-rest-overlay').classList.contains('hidden'),timer:!!GM.restTimer})`));
  check('S15 v288: marcar una serie abre el descanso fullscreen', s.restOpen && s.timer, JSON.stringify(s));
  s = JSON.parse(await ev(`JSON.stringify({closed:_aviCloseTopOverlay(),restHidden:document.getElementById('gm-rest-overlay').classList.contains('hidden'),timerVivo:!!GM.restTimer,mini:!!document.getElementById('gm-rest-mini'),embedded:_gmIsEmbedded()})`));
  log('    descanso + back -> ' + JSON.stringify(s));
  check('S15 v288: atrás con descanso abierto lo MINIMIZA (banner presente, conteo sigue) sin cerrar el guiado', s.closed === true && s.restHidden && s.timerVivo && s.mini && s.embedded, JSON.stringify(s));
  await ev(`gmSkipRest()`);
  await sleep(300);
  // Plancha (hold) en curso → atrás CANCELA el crono (acción explícita v245), no minimiza
  await ev(`(()=>{const row=document.getElementById('gm-set-1-0');row.querySelector('.gm-sinput[data-field="secs"]').value='30';row.querySelector('.gm-timer-go').click();})()`);
  await sleep(800);
  s = JSON.parse(await ev(`JSON.stringify({closed:_aviCloseTopOverlay(),done:isDone('rTest',1,0),overlay:!document.getElementById('gm-rest-overlay').classList.contains('hidden'),holding:!!GM.holding,mini:!!document.getElementById('gm-rest-mini')})`));
  log('    hold + back -> ' + JSON.stringify(s));
  check('S15 v245: atrás con la plancha en curso CANCELA el crono (no marca, sin banner)', s.closed === true && !s.done && !s.overlay && !s.holding && !s.mini, JSON.stringify(s));
  // La ficha ❓ desde el embebido empuja capa propia → atrás la cierra por capa
  await ev(`(()=>{window._s15lay0=AVINAV.layers;openExDetail(GM.exercises[0].id);})()`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify({fichaOpen:document.getElementById('exdetail-bg').classList.contains('on'),layerUp:AVINAV.layers>window._s15lay0})`));
  check('S15 F3: la ficha ❓ desde el embebido abre y empuja una capa de navegación', s.fichaOpen && s.layerUp, JSON.stringify(s));
  await ev(`(()=>{_closeExDetail&&_closeExDetail();if(AVINAV.layers>window._s15lay0)AVINAV.layers=window._s15lay0;})()`);
  await clean();

  // ── S17: "¿Cómo te sientes?" chooser → banner → cambiar (con scroll al tope) ──
  log('\n=== S17: check-in de ánimo embebido (chooser → banner → cambiar) ===');
  await setR('Animo Test', `({byTrack})=>{const base=byTrack('reps');return Array.from({length:4},()=>{const e=JSON.parse(JSON.stringify(base));e.sets=3;return e;});}`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({embedded:_gmIsEmbedded(),chooser:!!document.querySelector('#gm-body .checkin-card'),btns:document.querySelectorAll('#gm-body .mood-btn').length,banner:!!document.querySelector('#gm-body button[onclick*="gmChangeMood"]')})`));
  check('S17 P1: el embebido muestra el chooser antes de elegir', s.embedded && s.chooser && s.btns > 0 && !s.banner, JSON.stringify(s));
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody');if(b)b.scrollTop=9999;})()`);
  await ev(`(()=>{document.querySelector('#gm-body .mood-btn').click();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({mood:getTodayMood(CUR.clientId),chooser:!!document.querySelector('#gm-body .checkin-card'),banner:!!document.querySelector('#gm-body button[onclick*="gmChangeMood"]'),embedded:_gmIsEmbedded(),sc:(document.querySelector('#s-client .cnbody')||{}).scrollTop})`));
  check('S17 P2: al elegir se guarda el ánimo, aparece el banner y la pantalla SUBE al tope', !!s.mood && !s.chooser && s.banner && s.embedded && s.sc === 0, JSON.stringify(s));
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody');if(b)b.scrollTop=9999;})()`);
  await ev(`(()=>{document.querySelector('#gm-body button[onclick*="gmChangeMood"]').click();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({mood:getTodayMood(CUR.clientId),chooser:!!document.querySelector('#gm-body .checkin-card'),banner:!!document.querySelector('#gm-body button[onclick*="gmChangeMood"]'),embedded:_gmIsEmbedded(),sc:(document.querySelector('#s-client .cnbody')||{}).scrollTop})`));
  check('S17 P3: "Cambiar cómo me siento" limpia el ánimo, devuelve el chooser y sube al tope', !s.mood && s.chooser && !s.banner && s.embedded && s.sc === 0, JSON.stringify(s));
  await clean();

  // ── S18: PÉRDIDA DE DATOS · un 2º entreno de la misma rutina el mismo día NO borra el 1º ──
  log('\n=== S18: reiniciar y reentrenar el mismo día NO pisa el entreno hecho ===');
  await setR('Pierna Test', `({byTrack})=>{const r=byTrack('peso_reps');r.sets=2;return [r];}`);
  await sleep(400);
  const sidMorning = await ev(`(()=>{const rt=CUR.activeRoutine;setDone(rt.id,0,0,true);setLog(rt.id,0,0,'kg',20);setLog(rt.id,0,0,'reps',10);setDone(rt.id,0,1,true);setLog(rt.id,0,1,'kg',20);setLog(rt.id,0,1,'reps',10);updateClientProgress(rt);return currentSessionId(rt.id);})()`);
  await sleep(300);
  await ev(`(()=>{['workout-finish','wf','m-wf'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on','show');e.style.display='none';}});})()`);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const es=(DB.history[CUR.clientId]||[]).filter(h=>h.routineId==='rTest');return {n:es.length,completo:es.some(h=>h.doneSets===2&&h.totalSets===2)};})())`));
  check('S18 mañana: queda 1 entrada de rTest, completa (2/2)', s.n === 1 && s.completo && !!sidMorning, JSON.stringify(s));
  const sidTarde = await ev(`(()=>{window.confirm=()=>true;resetSession();return currentSessionId(CUR.activeRoutine.id);})()`);
  await sleep(300);
  check('S18 reiniciar: la sesión cambia de id (nueva sesión)', !!sidTarde && sidTarde !== sidMorning, 'S1=' + sidMorning + ' S2=' + sidTarde);
  await ev(`(()=>{const rt=CUR.activeRoutine;setDone(rt.id,0,0,true);setLog(rt.id,0,0,'kg',15);setLog(rt.id,0,0,'reps',8);updateClientProgress(rt);})()`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const es=(DB.history[CUR.clientId]||[]).filter(h=>h.routineId==='rTest');return {n:es.length,completoIntacto:es.some(h=>h.doneSets===2&&h.totalSets===2),parcial:es.some(h=>h.doneSets===1)};})())`));
  check('S18 tarde: el entreno de la MAÑANA sigue intacto (2/2) y el nuevo es entrada APARTE (1/2)', s.n === 2 && s.completoIntacto && s.parcial, JSON.stringify(s));
  await ev(`(()=>{if(DB.history&&DB.history[CUR.clientId])DB.history[CUR.clientId]=DB.history[CUR.clientId].filter(h=>h.routineId!=='rTest');svNow('ax_hist',DB.history);})()`);
  await clean();

  // ── S19: LAYOUT · los botones ↑↓🔄 dentro de pantalla con letra GRANDE (xl) ──
  log('\n=== S19: reorder ↑↓🔄 dentro de pantalla con texto GRANDE (data-fs=xl) ===');
  await ev(`setTextSize('xl')`);
  await setR('Reorder XL Test', `({byTrack})=>{const mk=n=>{const e=JSON.parse(JSON.stringify(byTrack('reps')));e.sets=2;e.name=n;return e;};return [mk('Sentadilla búlgara con mancuernas'),mk('Peso muerto rumano a una pierna'),mk('Zancadas caminando largas')];}`);
  await sleep(600);
  // (el chooser de ánimo convive con las tarjetas — NO se elige: pickMood ADAPTARÍA la rutina)
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const fs=document.documentElement.getAttribute('data-fs');
    const btns=[...document.querySelectorAll('#gm-body .gm-ex-card .cex-reorder button')];
    const vw=window.innerWidth;
    let worstRight=0, minLeft=1e9, offscreen=0, n=btns.length;
    btns.forEach(b=>{const r=b.getBoundingClientRect(); if(r.width>0){ worstRight=Math.max(worstRight,r.right); minLeft=Math.min(minLeft,r.left); if(r.right>vw+0.5||r.left<-0.5)offscreen++; }});
    return {fs,vw:Math.round(vw),n,worstRight:Math.round(worstRight),minLeft:Math.round(minLeft),offscreen};
  })())`));
  log('    medición xl -> ' + JSON.stringify(s));
  check('S19: con letra xl los botones ↑↓🔄 están DENTRO de la pantalla', s.fs === 'xl' && s.n >= 6 && s.offscreen === 0 && s.worstRight <= s.vw + 1 && s.minLeft >= -1, JSON.stringify(s));
  await ev(`setTextSize('normal')`);
  await clean();

  // ── S21: tooltip educativo del guiado (❓ video + 💨 respiración) y la × persiste ──
  log('\n=== S21: tooltip guiado (❓ video + 💨 respiración) + cierre persistente ===');
  await ev(`localStorage.removeItem('apex_tip_done_'+CUR.clientId)`);
  await setR('Tip Guiado Test', `({byTrack})=>{const mk=()=>{const e=JSON.parse(JSON.stringify(byTrack('reps')));e.sets=2;return e;};return [mk(),mk()];}`);
  await sleep(400);
  await sleep(900); // showExTooltip corre con 600ms de retardo tras el render
  s = JSON.parse(await ev(`JSON.stringify((()=>{const t=document.getElementById('ex-first-tip');const body=document.getElementById('gm-body');const inBody=!!(t&&body&&body.contains(t));const html=t?t.innerHTML:'';const beforeCard=!!(t&&t.nextElementSibling&&t.nextElementSibling.classList.contains('gm-ex-card'));return{present:!!t,inBody,video:/❓/.test(html)&&/video/i.test(html),breath:/💨/.test(html)&&/respirar/i.test(html),beforeCard};})())`));
  check('S21: el tooltip aparece en #gm-body, sobre la 1ª tarjeta, con ❓ video + 💨 respiración', s.present && s.inBody && s.video && s.breath && s.beforeCard, JSON.stringify(s));
  await ev(`dismissExTooltip()`);
  await ev(`gmRender()`);
  await sleep(200);
  s = JSON.parse(await ev(`JSON.stringify({gone:!document.getElementById('ex-first-tip'),done:localStorage.getItem('apex_tip_done_'+CUR.clientId)==='1'})`));
  check('S21: la × cierra el tooltip y NO reaparece tras re-render', s.gone && s.done, JSON.stringify(s));
  await ev(`localStorage.removeItem('apex_tip_done_'+CUR.clientId)`);
  await clean();

  // ── S22: calentamiento/movilidad en el guiado ──
  log('\n=== S22: calentamiento/movilidad + toggle "mostrar" dentro del guiado ===');
  await setR('Calentamiento Test', `({byTrack})=>{const mk=()=>{const e=JSON.parse(JSON.stringify(byTrack('peso_reps')));e.sets=3;return e;};return [mk(),mk()];}`);
  await sleep(400);
  // (el chooser de ánimo convive con las tarjetas — NO se elige: pickMood ADAPTARÍA la rutina)
  s = JSON.parse(await ev(`JSON.stringify((()=>{const body=document.getElementById('gm-body');const wrap=document.getElementById('wu-wrap');const inBody=!!(body&&wrap&&body.contains(wrap));const card=!!document.querySelector('#gm-body .wu-card');const rows=document.querySelectorAll('#gm-body .wu-ex-row').length;const reps=[...document.querySelectorAll('#gm-body .wu-ex-reps')].filter(e=>e.textContent.trim()).length;const toggle=!!document.getElementById('wu-chev');const guide=!!document.querySelector('#gm-body .wu-guide-btn');const openBefore=(()=>{const b=document.getElementById('wu-body');return b?b.classList.contains('open'):null})();return{inBody,card,rows,reps,toggle,guide,openBefore};})())`));
  check('S22: el guiado muestra la tarjeta de calentamiento (reps + toggle + 🎥 guía)', s.inBody && s.card && s.rows > 0 && s.reps > 0 && s.toggle && s.guide, JSON.stringify(s));
  const _openB = s.openBefore;
  s = JSON.parse(await ev(`JSON.stringify((()=>{const card=document.querySelector('#gm-body .gm-ex-card');const tg=card&&card.querySelector('.gm-warm-toggle');const btn=tg&&tg.querySelector('button');return{hdr:!!tg,btnTxt:btn?btn.textContent.trim():null};})())`));
  check('S22c: cada ejercicio de peso muestra "🔥 Sets de calentamiento" con botón Mostrar', s.hdr && s.btnTxt === 'Mostrar', JSON.stringify(s));
  await ev(`gmToggleExWarm(0)`); await sleep(200);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const card=document.querySelector('#gm-body .gm-ex-card');const tg=card&&card.querySelector('.gm-warm-toggle button');const shown=localStorage.getItem('wshow_rTest_0');return{btnTxt:tg?tg.textContent.trim():null,shown};})())`));
  check('S22c: al tocar "Mostrar" aparece la fila de aproximación y el botón pasa a "Ocultar"', s.btnTxt === 'Ocultar' && s.shown === '1', JSON.stringify(s));
  await ev(`gmToggleExWarm(0)`); await sleep(100);
  await ev(`toggleWarmup()`);
  await sleep(150);
  s = JSON.parse(await ev(`JSON.stringify({openAfter:(()=>{const b=document.getElementById('wu-body');return b?b.classList.contains('open'):null})()})`));
  check('S22: el botón "mostrar/ocultar" (toggleWarmup) cambia el estado del calentamiento', s.openAfter !== _openB && s.openAfter !== null, JSON.stringify({before:_openB, after:s.openAfter}));
  await clean();

  // ── S20: BLINDAJE post-F5 — "Hoy" NUNCA queda en blanco ──
  // (a) hueco null en exercises → prepareTodaySession lo filtra.
  // (b) si el embebido LANZA (p.ej. #gm-body ausente por un SW/index viejo), F5b lo cae a la
  //     TARJETA DE ERROR con "Recargar la app" (la clásica de respaldo ya no existe).
  //     DESTRUCTIVO del nodo #guided-mode → SIEMPRE al final; nada guiado corre después.
  log('\n=== S20: blindaje (hueco null filtrado; throw del embebido → tarjeta de error) ===');
  await setR('Null Hole Test', `({byTrack})=>{const mk=()=>{const e=JSON.parse(JSON.stringify(byTrack('reps')));e.sets=2;return e;};return [mk(),null,mk()];}`);
  await sleep(400);
  // (el chooser de ánimo convive con las tarjetas — NO se elige: pickMood ADAPTARÍA la rutina)
  s = JSON.parse(await ev(`JSON.stringify({embedded:_gmIsEmbedded(),cards:document.querySelectorAll('#gm-body .gm-ex-card').length,notBlank:((document.getElementById('cn-today-body')||{}).innerHTML||'').length>0})`));
  check('S20a: hueco null en exercises → filtrado; el guiado embebe los 2 reales sin blanco', s.embedded && s.cards === 2 && s.notBlank, JSON.stringify(s));
  await ev(`(()=>{const b=document.getElementById('gm-body');if(b)b.id='gm-body-HIDDEN';const c=DB.clients.find(x=>x.id===CUR.clientId);CUR.todayRenderedDay=null;renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const html=((document.getElementById('cn-today-body')||{}).innerHTML||'');return {errorCard:/Recargar la app/.test(html),notBlank:html.trim().length>0};})())`));
  check('S20b: si el embebido LANZA, "Hoy" muestra la tarjeta de error "Recargar la app", NO queda en blanco', s.errorCard && s.notBlank, JSON.stringify(s));
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);

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
