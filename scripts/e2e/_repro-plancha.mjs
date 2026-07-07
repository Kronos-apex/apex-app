// *** ROTO desde F5 (2026-07-06): setUiGuided/uiGuided y la vista clasica ya no existen. ***
// *** Los escenarios GUIADOS (S5-S22) se portaran a un harness nuevo (tarea #19). ***
// *** NO correr contra el codigo actual; referencia historica de cobertura. ***
// Repro bug Camilo 2026-07-02: plancha (isométrico) en día cardio/HIIT — al oprimir ▶
// "aparece como si ya hubiera terminado". Barrido: isométrico + HIIT × clásica + guiado.
// Basado en _repro-back-v243.mjs. Sirve el repo local + Chrome headless por CDP (salta SW).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = 8766;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-plancha-' + Date.now(); // perfil fresco: uno fijo puede quedar retenido por un chrome zombie ("no page")
const SHOTS = 'C:/Users/KRONOS/Desktop/AVI/_shots-plancha';
mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9266', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
chrome.on('error', e => { console.error('chrome', e); process.exit(1); });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9266/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
  // Nota: en localhost el SW ni registra (scope /apex-app/ da 404) → no hay que limpiarlo.
  // Una sola navegación, como el diag que entra estable; esperar a que doLogin exista.
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function'&&!document.getElementById('avi-loading'))})()`, 60000);
  // Máquina lenta: UN solo doLogin con espera larga. NUNCA reintentar doLogin encima
  // (dispara _enterAuthSession duplicado — gotcha v243); si falla, recarga completa.
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
}

// Inyecta la rutina de prueba cardio/HIIT (HIIT + plancha isométrica + cardio) como la de HOY
// y limpia estado de sesión previo. Devuelve diagnóstico.
async function setupRoutine() {
  return await ev(`(()=>{try{
    // El poll de 15s (_pollAuthClient) pisa la rutina inyectada con la remota y
    // re-renderiza a mitad del escenario — lo apagamos SOLO en el harness.
    try{UD.loadOwn=async()=>null;}catch(e){}
    // F4: el guiado es el DEFAULT. Los escenarios clásicos (SETUP, S1–S2) y los del guiado
    // por OVERLAY (S3–S11, openGuidedMode encima de "Hoy") necesitan la CLÁSICA en "Hoy".
    // Fijamos OFF aquí; S12+ encienden/apagan el flag explícitamente por escenario.
    try{setUiGuided(false);}catch(e){}
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const today=days[new Date().getDay()];
    const lib=id=>JSON.parse(JSON.stringify(DB.exercises.find(e=>e.id===id)));
    const hiitEx=lib('e189'); hiitEx.sets=2; hiitEx.hiit={work:2,rest:1};   // HIIT corto para el test
    const plk=lib('e17'); plk.sets=2;                                        // Plancha Frontal isométrica
    const cEx=JSON.parse(JSON.stringify(DB.exercises.find(e=>exTrack(e)==='cardio')||lib('e17')));
    c.routines=[{id:'rTest', day:today, name:'Cardio HIIT Test', exercises:[hiitEx,plk,cEx]}];
    CUR.todayWorking=null; CUR.todayOverride=null;
    try{clearTodayMood(CUR.clientId);}catch(e){}
    Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));
    navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);
    renderClientToday(c); // cnTodayGuard salta el re-render si "Hoy" ya se pintó — forzamos con la rutina inyectada
    return JSON.stringify({today, tracks:(c.routines[0].exercises||[]).map(e=>exTrack(e)), rendered:(CUR.activeRoutine||{}).id, hasTimerGo:!!document.querySelector('.timer-go')});
  }catch(e){return JSON.stringify({err:String(e&&e.stack||e)});}})()`);
}

try {
  await freshLogin();
  log('\n=== SETUP: rutina cardio/HIIT con plancha (hoy) ===');
  let setup = await setupRoutine();
  log('  setup: ' + setup);
  const st = JSON.parse(setup);
  check('setup: tracks hiit/tiempo/cardio', st.tracks[0] === 'hiit' && st.tracks[1] === 'tiempo', JSON.stringify(st.tracks));
  check('setup: fila isométrica tiene ▶', st.hasTimerGo);

  // ── S1: CLÁSICA · isométrico · ▶ debe INICIAR cuenta, NO marcar hecho ──
  log('\n=== S1: clásica · plancha isométrica · ▶ (3s) ===');
  await ev(`(()=>{const row=document.getElementById('setrow_1_0');const inp=row.querySelector('.sinput[data-field="secs"]');inp.value='3';row.querySelector('.timer-go').click();})()`);
  await sleep(500);
  let s = JSON.parse(await ev(`JSON.stringify({
    done:isDone('rTest',1,0),
    rowDone:document.getElementById('setrow_1_0').classList.contains('sdone'),
    holding:document.getElementById('setrow_1_0').classList.contains('holding'),
    goTxt:(document.querySelector('#setrow_1_0 .timer-go')||{}).textContent,
    banner:!document.getElementById('rest-banner').classList.contains('hide'),
    hold:document.getElementById('rest-banner').classList.contains('hold'),
    title:(document.querySelector('#rest-banner .resttitle')||{}).textContent,
    skip:(document.querySelector('#rest-banner .restskip')||{}).textContent,
    num:(document.getElementById('rb-num')||{}).textContent
  })`));
  log('    durante hold -> ' + JSON.stringify(s));
  await shot('s1-clasica-hold-encurso');
  check('S1 durante: serie NO marcada hecha', !s.done && !s.rowDone, JSON.stringify(s));
  check('S1 durante: banner AMBAR y dice Aguanta', s.banner && s.hold && /Aguanta/.test(s.title || ''), 'title=' + s.title);
  check('S1 durante: fila resaltada y ▶ cuenta', s.holding && /s$/.test(s.goTxt || ''), 'goTxt=' + s.goTxt);
  check('S1 durante: botón dice Cancelar', /Cancelar/.test(s.skip || ''), 'skip=' + s.skip);
  await sleep(4200);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',1,0),rowDone:document.getElementById('setrow_1_0').classList.contains('sdone'),holding:document.getElementById('setrow_1_0').classList.contains('holding'),goTxt:(document.querySelector('#setrow_1_0 .timer-go')||{}).textContent,banner:!document.getElementById('rest-banner').classList.contains('hide'),hold:document.getElementById('rest-banner').classList.contains('hold')})`));
  log('    al terminar -> ' + JSON.stringify(s));
  await shot('s1-clasica-hold-fin');
  check('S1 al terminar: serie marcada, banner oculto, fila restaurada', s.done && s.rowDone && !s.banner && !s.hold && !s.holding && s.goTxt === '▶', JSON.stringify(s));

  // ── S1x: CANCELAR — segundo tap en ▶ detiene sin marcar ──
  log('\n=== S1x: clásica · ▶ y luego ▶ de nuevo (cancelar) ===');
  await ev(`(()=>{setDone('rTest',1,0,false);renderClientExList(CUR.activeRoutine);})()`);
  await sleep(300);
  await ev(`(()=>{const row=document.getElementById('setrow_1_0');row.querySelector('.sinput[data-field="secs"]').value='30';row.querySelector('.timer-go').click();})()`);
  await sleep(1200);
  await ev(`(()=>{document.querySelector('#setrow_1_0 .timer-go').click();})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',1,0),holding:document.getElementById('setrow_1_0').classList.contains('holding'),goTxt:(document.querySelector('#setrow_1_0 .timer-go')||{}).textContent,banner:!document.getElementById('rest-banner').classList.contains('hide')})`));
  check('S1x cancelar con ▶: NO marca, fila restaurada, banner oculto', !s.done && !s.holding && s.goTxt === '▶' && !s.banner, JSON.stringify(s));

  // ── S1y: CANCELAR — botón del banner durante el hold ──
  log('\n=== S1y: clásica · ▶ y luego "⏹ Cancelar" del banner ===');
  await ev(`(()=>{const row=document.getElementById('setrow_1_0');row.querySelector('.timer-go').click();})()`);
  await sleep(1200);
  await ev(`(()=>{document.querySelector('#rest-banner .restskip').click();})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',1,0),holding:document.getElementById('setrow_1_0').classList.contains('holding'),banner:!document.getElementById('rest-banner').classList.contains('hide'),skip:(document.querySelector('#rest-banner .restskip')||{}).textContent})`));
  check('S1y cancelar del banner: NO marca y restaura texto Saltar', !s.done && !s.holding && !s.banner && /Saltar/.test(s.skip || ''), JSON.stringify(s));

  // ── S1z: REGRESIÓN (Lucas QA) — descanso previo + hold + visibilitychange ──
  // El listener _restVis de un descanso anterior no debe matar el hold al volver la app.
  log('\n=== S1z: descanso previo → ▶ hold → visibilitychange ===');
  await ev(`(()=>{setDone('rTest',1,0,false);renderClientExList(CUR.activeRoutine);})()`);
  await sleep(300);
  await ev(`startClientRest(1,'Ejercicio previo')`); // descanso corto: su endAt vence enseguida
  await sleep(200);
  await ev(`(()=>{const row=document.getElementById('setrow_1_0');row.querySelector('.sinput[data-field="secs"]').value='4';row.querySelector('.timer-go').click();})()`);
  await sleep(1500); // el endAt del descanso viejo ya venció
  await ev(`document.dispatchEvent(new Event('visibilitychange'))`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',1,0),banner:!document.getElementById('rest-banner').classList.contains('hide'),hold:document.getElementById('rest-banner').classList.contains('hold'),holding:document.getElementById('setrow_1_0').classList.contains('holding')})`));
  check('S1z visibilitychange NO mata el hold', !s.done && s.banner && s.hold && s.holding, JSON.stringify(s));
  await sleep(3500);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',1,0),banner:!document.getElementById('rest-banner').classList.contains('hide')})`));
  check('S1z el hold termina y marca normal', s.done && !s.banner, JSON.stringify(s));
  await ev(`(()=>{setDone('rTest',1,0,false);renderClientExList(CUR.activeRoutine);})()`);
  await sleep(300);

  // ── S1b: doble tap rápido en ▶ (serie 2) ──
  log('\n=== S1b: clásica · doble tap ▶ rápido (serie 2, 3s) ===');
  await ev(`(()=>{const row=document.getElementById('setrow_1_1');const inp=row.querySelector('.sinput[data-field="secs"]');inp.value='3';const b=row.querySelector('.timer-go');b.click();b.click();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',1,1)})`));
  check('S1b doble tap: NO marca de una', !s.done, JSON.stringify(s));
  await sleep(4200);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',1,1)})`));
  check('S1b al terminar: marcada', s.done, JSON.stringify(s));

  // ── S1c: ▶ con SEG vacío (¿botón muerto silencioso?) ──
  log('\n=== S1c: clásica · ▶ con SEG vacío ===');
  await ev(`(()=>{setDone('rTest',1,0,false);renderClientExList(CUR.activeRoutine);})()`);
  await sleep(300);
  await ev(`(()=>{const row=document.getElementById('setrow_1_0');row.querySelector('.sinput[data-field="secs"]').value='';row.querySelector('.timer-go').click();})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',1,0),banner:!document.getElementById('rest-banner').classList.contains('hide')})`));
  check('S1c SEG vacío: no marca ni cuenta (botón no-op)', !s.done && !s.banner, JSON.stringify(s));

  // ── S2: CLÁSICA · HIIT · ▶ Iniciar NO debe marcar rondas de una ──
  log('\n=== S2: clásica · HIIT (2s/1s × 2 rondas) · ▶ Iniciar ===');
  await ev(`(()=>{for(let si=0;si<2;si++)setDone('rTest',0,si,false);renderClientExList(CUR.activeRoutine);})()`);
  await sleep(300);
  await ev(`document.getElementById('hiit-start_0').click()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({
    d0:isDone('rTest',0,0), d1:isDone('rTest',0,1),
    disp:(document.getElementById('hiit-display_0')||{}).textContent,
    phase:(document.getElementById('hiit-phase_0')||{}).textContent,
    hdr:(document.querySelector('#block_0 .cex-block-prog')||{}).textContent
  })`));
  log('    durante trabajo -> ' + JSON.stringify(s));
  await shot('s2-clasica-hiit-encurso');
  check('S2 durante: rondas NO marcadas de una', !s.d0 && !s.d1, JSON.stringify(s));
  check('S2 durante: fase TRABAJO visible', /TRABAJO/.test(s.phase || ''), 'phase=' + s.phase);
  await sleep(7000);
  s = JSON.parse(await ev(`JSON.stringify({d0:isDone('rTest',0,0),d1:isDone('rTest',0,1),disp:(document.getElementById('hiit-display_0')||{}).textContent,phase:(document.getElementById('hiit-phase_0')||{}).textContent})`));
  log('    al terminar -> ' + JSON.stringify(s));
  check('S2 al terminar: 2/2 rondas y ✓', s.d0 && s.d1 && s.disp === '✓', JSON.stringify(s));

  // ── S3: GUIADO · isométrico · ▶ CRONO ──
  log('\n=== S3: guiado · plancha isométrica · ▶ CRONO (3s) ===');
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));renderClientExList(CUR.activeRoutine);openGuidedMode();})()`);
  await sleep(600);
  const gmOpen = await ev(`(()=>{const o=document.getElementById('guided-mode');return !!(o&&!o.classList.contains('hidden'))})()`);
  log('    guiado abierto: ' + gmOpen);
  await ev(`(()=>{const row=document.getElementById('gm-set-1-0');const inp=row.querySelector('.gm-sinput[data-field="secs"]');inp.value='3';row.querySelector('.gm-timer-go').click();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({
    done:isDone('rTest',1,0),
    rowDone:(document.getElementById('gm-set-1-0')||{classList:{contains:()=>'?'}}).classList.contains('set-done'),
    overlay:!(document.getElementById('gm-rest-overlay')||{classList:{contains:()=>true}}).classList.contains('hidden'),
    gmHold:document.getElementById('gm-rest-overlay').classList.contains('gm-hold'),
    title:(document.getElementById('gm-rest-title')||{}).textContent,
    skip:(document.querySelector('#gm-rest-overlay .gm-rest-skip')||{}).textContent
  })`));
  log('    durante hold -> ' + JSON.stringify(s));
  await shot('s3-guiado-hold-encurso');
  check('S3 durante: serie NO marcada', !s.done && !s.rowDone, JSON.stringify(s));
  check('S3 durante: overlay AMBAR con Aguanta', s.overlay && s.gmHold && /Aguanta/.test(s.title || ''), 'title=' + s.title);
  check('S3 durante: botón dice Cancelar', /Cancelar/.test(s.skip || ''), 'skip=' + s.skip);
  await sleep(4200);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',1,0),overlay:!(document.getElementById('gm-rest-overlay')||{classList:{contains:()=>true}}).classList.contains('hidden'),gmHold:document.getElementById('gm-rest-overlay').classList.contains('gm-hold'),skip:(document.querySelector('#gm-rest-overlay .gm-rest-skip')||{}).textContent,rest:!!GM.restTimer})`));
  log('    al terminar -> ' + JSON.stringify(s));
  check('S3 al terminar: marcada, overlay cerrado y restaurado, SIN descanso auto', s.done && !s.overlay && !s.gmHold && /Saltar/.test(s.skip || '') && !s.rest, JSON.stringify(s));

  // ── S3x: GUIADO · cancelar el hold con el botón del overlay ──
  log('\n=== S3x: guiado · ▶ CRONO y "⏹ Cancelar" ===');
  await ev(`(()=>{setDone('rTest',1,1,false);gmRender();closeStartCard();})()`); // cerrar tarjeta residual de openGuidedMode
  await sleep(500);
  await ev(`(()=>{const row=document.getElementById('gm-set-1-1');row.querySelector('.gm-sinput[data-field="secs"]').value='30';row.querySelector('.gm-timer-go').click();})()`);
  await sleep(1200);
  await ev(`(()=>{document.querySelector('#gm-rest-overlay .gm-rest-skip').click();})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',1,1),overlay:!document.getElementById('gm-rest-overlay').classList.contains('hidden'),gmHold:document.getElementById('gm-rest-overlay').classList.contains('gm-hold'),skip:(document.querySelector('#gm-rest-overlay .gm-rest-skip')||{}).textContent,startCard:!!document.getElementById('gm-start-card')})`));
  check('S3x cancelar: NO marca, overlay cerrado/restaurado, SIN tarjeta siguiente', !s.done && !s.overlay && !s.gmHold && /Saltar/.test(s.skip || '') && !s.startCard, JSON.stringify(s));

  // ── S4: GUIADO · HIIT · ▶ Iniciar ──
  log('\n=== S4: guiado · HIIT (2s/1s × 2) · ▶ Iniciar ===');
  await ev(`(()=>{for(let si=0;si<2;si++)setDone('rTest',0,si,false);gmRender();})()`);
  await sleep(400);
  await ev(`document.getElementById('gm-hiit-btn-0').click()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({
    d0:isDone('rTest',0,0), d1:isDone('rTest',0,1),
    disp:(document.getElementById('gm-hiit-disp-0')||{}).textContent,
    phase:(document.getElementById('gm-hiit-phase-0')||{}).textContent
  })`));
  log('    durante trabajo -> ' + JSON.stringify(s));
  await shot('s4-guiado-hiit-encurso');
  check('S4 durante: rondas NO marcadas de una', !s.d0 && !s.d1, JSON.stringify(s));
  check('S4 durante: fase TRABAJO visible', /TRABAJO/.test(s.phase || ''), 'phase=' + s.phase);
  await sleep(7000);
  s = JSON.parse(await ev(`JSON.stringify({d0:isDone('rTest',0,0),d1:isDone('rTest',0,1),disp:(document.getElementById('gm-hiit-disp-0')||{}).textContent})`));
  log('    al terminar -> ' + JSON.stringify(s));
  check('S4 al terminar: 2/2 rondas y ✓', s.d0 && s.d1 && s.disp === '✓', JSON.stringify(s));

  // ── S5: UNIFICACIÓN · P2 finalizar/reiniciar desde el guiado + P10 reset diario ──
  log('\n=== S5: guiado · Reiniciar + Finalizar (P2) y reset diario sin clásica (P10) ===');
  // Estado tras S4: ei0 2/2 (HIIT) + ei1 si0 (iso) hechas. El guiado sigue abierto.
  s = JSON.parse(await ev(`JSON.stringify({acts:!!document.getElementById('gm-session-actions')})`));
  check('S5 P2: fila Reiniciar/Finalizar presente en el guiado', s.acts, JSON.stringify(s));
  await ev(`(()=>{window.confirm=()=>true;gmResetSession();})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({d00:isDone('rTest',0,0),d01:isDone('rTest',0,1),d10:isDone('rTest',1,0),step:GM.currentStep,open:!document.getElementById('guided-mode').classList.contains('hidden')})`));
  log('    tras reiniciar -> ' + JSON.stringify(s));
  check('S5 P2 reiniciar: todo desmarcado, paso 0, guiado sigue abierto', !s.d00 && !s.d01 && !s.d10 && s.step === 0 && s.open, JSON.stringify(s));
  await ev(`(()=>{setDone('rTest',0,0,true);gmRender();gmFinishEarly();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const h=(DB.history[CUR.clientId]||[]).find(x=>x.routineId==='rTest');return {closed:document.getElementById('guided-mode').classList.contains('hidden'),hist:!!h,doneSets:h&&h.doneSets};})())`));
  log('    tras finalizar -> ' + JSON.stringify(s));
  check('S5 P2 finalizar: guarda historial parcial (1 serie) y cierra el guiado', s.closed && s.hist && s.doneSets === 1, JSON.stringify(s));
  // P10: simular cambio de día y abrir el guiado DIRECTO (sin renderClientToday antes)
  await ev(`(()=>{localStorage.setItem('session_date_rTest','Tue Jan 01 2030');openGuidedMode();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({d00:isDone('rTest',0,0),step:GM.currentStep,open:!document.getElementById('guided-mode').classList.contains('hidden')})`));
  log('    P10 día nuevo -> ' + JSON.stringify(s));
  check('S5 P10: abrir guiado en día nuevo resetea la sesión sin pasar por la clásica', !s.d00 && s.step === 0 && s.open, JSON.stringify(s));
  await ev(`(()=>{closeGuidedMode();closeStartCard();if(DB.history[CUR.clientId])DB.history[CUR.clientId]=DB.history[CUR.clientId].filter(x=>x.routineId!=='rTest');})()`);

  // ── S6: UNIFICACIÓN · P1 check-in de ánimo dentro del guiado ──
  log('\n=== S6: guiado · check-in de ánimo (P1) ===');
  await ev(`(()=>{clearTodayMood(CUR.clientId);openGuidedMode();closeStartCard();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({chooser:!!document.querySelector('#gm-body .checkin-card'),btns:document.querySelectorAll('#gm-body .mood-btn').length})`));
  log('    chooser -> ' + JSON.stringify(s));
  check('S6 P1: chooser de ánimo visible dentro del guiado', s.chooser && s.btns > 0, JSON.stringify(s));
  await ev(`(()=>{document.querySelector('#gm-body .mood-btn').click();})()`);
  await sleep(700);
  s = JSON.parse(await ev(`JSON.stringify({mood:getTodayMood(CUR.clientId),chooser:!!document.querySelector('#gm-body .checkin-card'),open:!document.getElementById('guided-mode').classList.contains('hidden'),steps:GM.steps.length})`));
  log('    tras elegir -> ' + JSON.stringify(s));
  check('S6 P1: al elegir se guarda el ánimo, el chooser se va y el guiado se reconstruye', !!s.mood && !s.chooser && s.open && s.steps > 0, JSON.stringify(s));
  await ev(`(()=>{clearTodayMood(CUR.clientId);closeGuidedMode();closeStartCard();})()`);

  // ── S7: UNIFICACIÓN · P3 reordenar desde el guiado (claves viajan con el ejercicio) ──
  log('\n=== S7: guiado · reordenar ↑/↓ con serie hecha + dropset + log (P3) ===');
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));CUR.todayWorking=null;renderClientToday(DB.clients.find(x=>x.id===CUR.clientId));openGuidedMode();})()`);
  await sleep(600); // la tarjeta de inicio sale a los 420ms — cerrarla DESPUÉS de que aparezca
  await ev(`closeStartCard()`);
  s = JSON.parse(await ev(`JSON.stringify({tools:document.querySelectorAll('#gm-body .cex-reorder').length})`));
  check('S7 P3: botones reordenar/sustituir presentes en las tarjetas del guiado', s.tools >= 3, JSON.stringify(s));
  await ev(`(()=>{setDone('rTest',1,0,true);localStorage.setItem('drop_rTest_1_0','1');localStorage.setItem('log_rTest_1_0_secs','45');gmMoveEx(1,1);})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({exAt2:(GM.exercises[2]||{}).name,d2:isDone('rTest',2,0),drop2:localStorage.getItem('drop_rTest_2_0'),secs2:localStorage.getItem('log_rTest_2_0_secs'),d1:isDone('rTest',1,0),steps:GM.steps.length,open:!document.getElementById('guided-mode').classList.contains('hidden'),startCard:!!document.getElementById('gm-start-card')})`));
  log('    tras bajar la plancha -> ' + JSON.stringify(s));
  check('S7 P3: la plancha bajó CON su serie hecha, su dropset y sus segundos; sin tarjeta extra', /lancha/.test(s.exAt2 || '') && s.d2 && s.drop2 === '1' && s.secs2 === '45' && !s.d1 && s.steps > 0 && s.open && !s.startCard, JSON.stringify(s));
  await ev(`(()=>{closeGuidedMode();closeStartCard();CUR.todayWorking=null;CUR.todayDirty=false;Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);

  // ── S8: UNIFICACIÓN · P3 · reordenar la tarjeta HIIT MIENTRAS corre (timer no queda huérfano) ──
  log('\n=== S8: guiado · mover la tarjeta HIIT con el intervalo en curso (P3) ===');
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));CUR.todayWorking=null;renderClientToday(DB.clients.find(x=>x.id===CUR.clientId));openGuidedMode();})()`);
  await sleep(600);
  await ev(`closeStartCard()`);
  await ev(`document.getElementById('gm-hiit-btn-0').click()`); // arranca el HIIT (ei 0)
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({hiitLive:!!GM.hiit})`));
  check('S8 P3: HIIT corriendo antes de reordenar', s.hiitLive, JSON.stringify(s));
  await ev(`gmMoveEx(0,1)`); // baja la tarjeta HIIT con el intervalo vivo
  await sleep(600);
  s = JSON.parse(await ev(`JSON.stringify({hiitCleared:!GM.hiit,steps:GM.steps.length,open:!document.getElementById('guided-mode').classList.contains('hidden')})`));
  log('    tras mover el HIIT en curso -> ' + JSON.stringify(s));
  check('S8 P3: al reordenar el HIIT en curso, el intervalo se cancela (no queda huérfano) y el guiado se reconstruye', s.hiitCleared && s.steps > 0 && s.open, JSON.stringify(s));
  await sleep(2500); // deja que el intervalo viejo, si hubiera sobrevivido, tirara algún error
  s = JSON.parse(await ev(`JSON.stringify({hiitStillNull:!GM.hiit})`));
  check('S8 P3: pasados 2.5s el intervalo viejo no revivió ni marcó rondas fantasma', s.hiitStillNull, JSON.stringify(s));
  await ev(`(()=>{closeGuidedMode();closeStartCard();CUR.todayWorking=null;CUR.todayDirty=false;Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);

  // ── S9: UNIFICACIÓN · P4 · lastre (peso añadido) para peso corporal en el guiado ──
  log('\n=== S9: guiado · lastre para peso corporal (P4) ===');
  // Rutina con UN ejercicio de peso corporal (track 'reps')
  s = await ev(`(()=>{try{
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const rEx=JSON.parse(JSON.stringify(DB.exercises.find(e=>exTrack(e)==='reps')));
    rEx.sets=2;
    c.routines=[{id:'rTest',day:c.routines[0].day,name:'Corporal Test',exercises:[rEx]}];
    CUR.todayWorking=null;CUR.todayOverride=null;
    Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));
    renderClientToday(c);openGuidedMode();
    return JSON.stringify({track:exTrack(rEx),name:rEx.name});
  }catch(e){return JSON.stringify({err:String(e&&e.stack||e)});}})()`);
  log('    setup reps -> ' + s);
  await sleep(600); await ev(`closeStartCard()`);
  s = JSON.parse(await ev(`JSON.stringify({toggle:!!document.querySelector('#gm-body .gm-lastre-toggle'),kgBefore:!!document.querySelector('#gm-set-0-0 .gm-sinput[data-field="kg"]'),repsBefore:!!document.querySelector('#gm-set-0-0 .gm-sinput[data-field="reps"]')})`));
  log('    sin lastre -> ' + JSON.stringify(s));
  check('S9 P4: toggle de lastre presente; sin activar la fila muestra REPS y NO KG', s.toggle && s.repsBefore && !s.kgBefore, JSON.stringify(s));
  await ev(`document.querySelector('#gm-body .gm-lastre-toggle button').click()`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify({kgAfter:!!document.querySelector('#gm-set-0-0 .gm-sinput[data-field="kg"]'),repsAfter:!!document.querySelector('#gm-set-0-0 .gm-sinput[data-field="reps"]'),on:localStorage.getItem('lastre_rTest_0')})`));
  log('    con lastre -> ' + JSON.stringify(s));
  check('S9 P4: al activar lastre aparece la celda KG junto a REPS y el estado persiste', s.kgAfter && s.repsAfter && s.on === '1', JSON.stringify(s));
  // escribir kg+reps, marcar la serie y verificar que el lastre cuenta en el volumen
  await ev(`(()=>{const r=document.getElementById('gm-set-0-0');r.querySelector('.gm-sinput[data-field="kg"]').value='10';r.querySelector('.gm-sinput[data-field="reps"]').value='12';gmToggleSet(0,0,0);})()`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify({kg:getLog('rTest',0,0,'kg'),reps:getLog('rTest',0,0,'reps'),done:isDone('rTest',0,0),vol:(document.getElementById('prog-vol')||{}).textContent})`));
  log('    tras marcar con lastre -> ' + JSON.stringify(s));
  check('S9 P4: la serie con lastre guarda kg y reps y suma volumen (10×12=120)', s.kg === '10' && s.reps === '12' && s.done && /120/.test(s.vol || ''), JSON.stringify(s));
  await ev(`(()=>{closeGuidedMode();closeStartCard();CUR.todayWorking=null;CUR.todayDirty=false;Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);

  // ── S10: UNIFICACIÓN · P12 · cabecera de rutina (nombre + nota + por-qué) en el guiado ──
  log('\n=== S10: guiado · cabecera nombre/nota/por-qué (P12) ===');
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);const rEx=JSON.parse(JSON.stringify(DB.exercises.find(e=>exTrack(e)==='reps')));rEx.sets=2;c.routines=[{id:'rTest',day:c.routines[0].day,name:'Rutina Prueba P12',note:'Cuida la técnica hoy',why:'Toca empuje para equilibrar la semana',exercises:[rEx]}];CUR.todayWorking=null;CUR.todayOverride=null;Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));renderClientToday(c);openGuidedMode();})()`);
  await sleep(600); await ev(`closeStartCard()`);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const h=document.querySelector('#gm-body .gm-routine-head');const txt=h?h.textContent:'';return {head:!!h,name:/Rutina Prueba P12/.test(txt),note:/Cuida la técnica hoy/.test(txt),why:/equilibrar la semana/.test(txt),pills:/2 series/.test(txt)};})())`));
  log('    cabecera -> ' + JSON.stringify(s));
  check('S10 P12: la cabecera del guiado muestra nombre, nota, por-qué y pills de la rutina', s.head && s.name && s.note && s.why && s.pills, JSON.stringify(s));
  await ev(`(()=>{closeGuidedMode();closeStartCard();CUR.todayWorking=null;CUR.todayDirty=false;Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);

  // ── S11: UNIFICACIÓN · P11 · foto del ejercicio en la tarjeta del guiado (ya vía exIcon) ──
  log('\n=== S11: guiado · thumb de foto del ejercicio (P11) ===');
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);const withPhoto=DB.exercises.find(e=>exImgSrc(e));const ex=JSON.parse(JSON.stringify(withPhoto));ex.sets=1;c.routines=[{id:'rTest',day:c.routines[0].day,name:'Foto Test',exercises:[ex]}];CUR.todayWorking=null;CUR.todayOverride=null;Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));renderClientToday(c);openGuidedMode();})()`);
  await sleep(600); await ev(`closeStartCard()`);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const ic=document.querySelector('#gm-ex-0 .gm-ex-icon');const img=ic?ic.querySelector('img.exicon-img'):null;return {icon:!!ic,img:!!img,src:img?(img.getAttribute('src')||'').slice(-24):''};})())`));
  log('    ícono con foto -> ' + JSON.stringify(s));
  check('S11 P11: la tarjeta del guiado pinta la foto del ejercicio (img.exicon-img) cuando existe', s.icon && s.img && /\.jpg$/.test(s.src), JSON.stringify(s));
  await ev(`(()=>{closeGuidedMode();closeStartCard();CUR.todayWorking=null;CUR.todayDirty=false;Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);

  // ── S12: UNIFICACIÓN · F4 · flag ax_ui_guided (guiado es el DEFAULT; clásica = opt-out) ──
  log('\n=== S12: flag ax_ui_guided + toggle en Perfil (F4: default ON) ===');
  s = JSON.parse(await ev(`(()=>{localStorage.removeItem('ax_ui_guided');return JSON.stringify({defOn:uiGuided(),raw:localStorage.getItem('ax_ui_guided')})})()`));
  check('S12: por defecto (sin flag) la vista guiada está ON (F4)', s.defOn === true && s.raw === null, JSON.stringify(s));
  // Con OFF, el interruptor del Perfil muestra "Activar vista guiada" (siempre, sin depender de COACH_SELF)
  await ev(`(()=>{setUiGuided(false);const c=DB.clients.find(x=>x.id===CUR.clientId);renderGuidedViewToggle(c);})()`);
  s = JSON.parse(await ev(`JSON.stringify({card:(document.getElementById('cn-guided-card')||{}).innerHTML.length>0,activar:/Activar/.test((document.getElementById('cn-guided-card')||{}).innerHTML||'')})`));
  check('S12: con OFF el Perfil muestra el botón "Activar vista guiada"', s.card && s.activar, JSON.stringify(s));
  // "Activar" enciende el flag
  await ev(`(()=>{document.querySelector('#cn-guided-card button').click();})()`);
  s = JSON.parse(await ev(`JSON.stringify({on:uiGuided(),persist:ld('ax_ui_guided','0')})`));
  check('S12: "Activar vista guiada" enciende el flag y persiste', s.on === true && s.persist === '1', JSON.stringify(s));
  // Con ON, el interruptor muestra "Volver a la vista clásica"
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);renderGuidedViewToggle(c);})()`);
  s = JSON.parse(await ev(`JSON.stringify({card:(document.getElementById('cn-guided-card')||{}).innerHTML.length>0,volver:/Volver a la vista clásica/.test((document.getElementById('cn-guided-card')||{}).innerHTML||'')})`));
  check('S12: con ON el interruptor muestra "Volver a la vista clásica"', s.card && s.volver, JSON.stringify(s));
  await ev(`switchToClassicView()`);
  s = JSON.parse(await ev(`JSON.stringify({off:uiGuided()})`));
  check('S12: "Volver a la clásica" apaga el flag', s.off === false, JSON.stringify(s));
  // con OFF, "Hoy" sigue siendo la clásica (cex-list presente) — inerte
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));const c=DB.clients.find(x=>x.id===CUR.clientId);const rEx=JSON.parse(JSON.stringify(DB.exercises.find(e=>exTrack(e)==='reps')));rEx.sets=1;c.routines=[{id:'rTest',day:c.routines[0].day,name:'Inerte Test',exercises:[rEx]}];CUR.todayWorking=null;renderClientToday(c);})()`);
  s = JSON.parse(await ev(`JSON.stringify({cexList:!!document.getElementById('cex-list'),guidedHidden:document.getElementById('guided-mode').classList.contains('hidden')})`));
  check('S12: con el flag OFF "Hoy" sigue siendo la tarjeta clásica (sin cambios)', s.cexList && s.guidedHidden, JSON.stringify(s));
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);

  // ── S13: UNIFICACIÓN · F2 sub-deploy 2 · guiado EMBEBIDO como pantalla de "Hoy" ──
  log('\n=== S13: guiado embebido en "Hoy" con flag ON (F2 sub-deploy 2) ===');
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));setUiGuided(true);clearTodayMood(CUR.clientId);const c=DB.clients.find(x=>x.id===CUR.clientId);const rEx=JSON.parse(JSON.stringify(DB.exercises.find(e=>exTrack(e)==='reps')));rEx.sets=2;c.routines=[{id:'rTest',day:c.routines[0].day,name:'Embebido Test',note:'Nota E',exercises:[rEx]}];CUR.todayWorking=null;CUR.todayOverride=null;renderClientToday(c);})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const g=document.getElementById('guided-mode');const con=document.getElementById('cn-today-body');return {inTab:!!(con&&con.contains(g)),embedded:g.classList.contains('gm-embedded'),hidden:g.classList.contains('hidden'),noCex:!document.getElementById('cex-list'),noEmpezar:!/Empezar/.test(con.innerHTML),body:!!document.getElementById('gm-body'),cards:document.querySelectorAll('#gm-body .gm-ex-card').length};})())`));
  log('    embebido -> ' + JSON.stringify(s));
  check('S13: con flag ON "Hoy" muestra el guiado embebido (dentro del tab, sin ✕ overlay, sin cex-list ni botón Empezar)', s.inTab && s.embedded && !s.hidden && s.noCex && s.noEmpezar && s.body && s.cards >= 1, JSON.stringify(s));
  // marcar una serie desde el embebido funciona (mismo gmActionBtn/gmToggleSet)
  await ev(`(()=>{const chk=document.getElementById('gm-chk-0-0');if(chk)chk.click();})()`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify({done:isDone('rTest',0,0),bodyStillEmbedded:document.getElementById('guided-mode').classList.contains('gm-embedded')})`));
  check('S13: marcar una serie desde el embebido funciona y sigue embebido', s.done && s.bodyStillEmbedded, JSON.stringify(s));
  // completar la 2ª (última) serie → el embebido NO se oculta (closeGuidedMode embedded-aware)
  await ev(`(()=>{const chk=document.getElementById('gm-chk-0-1');if(chk)chk.click();})()`);
  await sleep(700);
  s = JSON.parse(await ev(`JSON.stringify({allDone:isDone('rTest',0,0)&&isDone('rTest',0,1),hidden:document.getElementById('guided-mode').classList.contains('hidden'),embedded:document.getElementById('guided-mode').classList.contains('gm-embedded'),btnHidden:(document.getElementById('gm-action-btn')||{style:{}}).style.display==='none'})`));
  log('    completado embebido -> ' + JSON.stringify(s));
  check('S13: al completar TODO embebido no se oculta (queda en el tab) y el botón "Cerrar" desaparece', s.allDone && !s.hidden && s.embedded && s.btnHidden, JSON.stringify(s));
  // cerrar la celebración de fin si quedó abierta, para no ensuciar el siguiente escenario
  await ev(`(()=>{['workout-finish','wf','m-wf'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on','show');e.style.display='none';}});})()`);
  // apagar el flag → "Hoy" vuelve a la clásica y #guided-mode regresa a su sitio (oculto)
  await ev(`(()=>{setUiGuided(false);const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const g=document.getElementById('guided-mode');const con=document.getElementById('cn-today-body');return {backHome:!con.contains(g),hidden:g.classList.contains('hidden'),notEmbedded:!g.classList.contains('gm-embedded'),cexBack:!!document.getElementById('cex-list')};})())`));
  log('    flag OFF -> ' + JSON.stringify(s));
  check('S13: al apagar el flag "Hoy" vuelve a la clásica y #guided-mode regresa a su sitio oculto', s.backHome && s.hidden && s.notEmbedded && s.cexBack, JSON.stringify(s));
  await ev(`(()=>{setUiGuided(false);Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);

  // ── S14: UNIFICACIÓN · F2 sub-deploy 3 · el poll en vivo NO corta la serie del embebido ──
  log('\n=== S14: poll en vivo con timer del embebido en curso (F2 sub-deploy 3) ===');
  // Rutina con un HIIT (ei0), flag ON, embebido. Arranca el HIIT y simula un poll (renderClientToday)
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));setUiGuided(true);clearTodayMood(CUR.clientId);const c=DB.clients.find(x=>x.id===CUR.clientId);const h=JSON.parse(JSON.stringify(DB.exercises.find(e=>e.id==='e189')));h.sets=2;h.hiit={work:2,rest:1};const r=JSON.parse(JSON.stringify(DB.exercises.find(e=>exTrack(e)==='reps')));r.sets=2;c.routines=[{id:'rTest',day:c.routines[0].day,name:'Poll Test',exercises:[h,r]}];CUR.todayWorking=null;CUR.todayOverride=null;renderClientToday(c);})()`);
  await sleep(500);
  await ev(`(()=>{const b=document.getElementById('gm-hiit-btn-0');if(b)b.click();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({hiitLive:!!GM.hiit,embedded:document.getElementById('guided-mode').classList.contains('gm-embedded')})`));
  check('S14: HIIT del embebido corriendo antes del poll', s.hiitLive && s.embedded, JSON.stringify(s));
  // simular el poll: el coach cambió el plan → renderClientToday con rutina distinta MIENTRAS el HIIT corre
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.routines[0].name='Plan Cambiado';renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({hiitStillLive:!!GM.hiit,embedded:document.getElementById('guided-mode').classList.contains('gm-embedded'),phase:(document.getElementById('gm-hiit-phase-0')||{}).textContent})`));
  log('    tras poll con HIIT vivo -> ' + JSON.stringify(s));
  check('S14: el poll NO cortó el HIIT en curso (timer vivo, sigue embebido)', s.hiitStillLive && s.embedded, JSON.stringify(s));
  // dejar terminar el HIIT y luego un poll SIN timer sí refresca (el nombre nuevo aplica)
  await sleep(9000);
  s = JSON.parse(await ev(`JSON.stringify({hiitDone:!GM.hiit})`));
  check('S14: el HIIT termina normalmente tras el poll', s.hiitDone, JSON.stringify(s));
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({embedded:document.getElementById('guided-mode').classList.contains('gm-embedded'),name:/Plan Cambiado/.test((document.querySelector('#gm-body .gm-routine-head')||{textContent:''}).textContent)})`));
  log('    poll sin timer -> ' + JSON.stringify(s));
  check('S14: sin timer vivo, un render posterior sí aplica el plan nuevo (refresco diferido)', s.embedded && s.name, JSON.stringify(s));
  await ev(`(()=>{setUiGuided(false);Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);

  // ── S15: UNIFICACIÓN · F3 · atrás con el guiado embebido (overlays internos + tab) ──
  log('\n=== S15: atrás con el guiado embebido (F3) ===');
  // Embebido (flag ON): _aviCloseTopOverlay NO debe tratarlo como overlay cerrable (es un tab)
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));setUiGuided(true);clearTodayMood(CUR.clientId);const c=DB.clients.find(x=>x.id===CUR.clientId);const r=JSON.parse(JSON.stringify(DB.exercises.find(e=>exTrack(e)==='reps')));r.sets=2;c.routines=[{id:'rTest',day:c.routines[0].day,name:'Atras Test',exercises:[r]}];CUR.todayWorking=null;CUR.todayOverride=null;renderClientToday(c);})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({closed:_aviCloseTopOverlay(),embedded:document.getElementById('guided-mode').classList.contains('gm-embedded'),hidden:document.getElementById('guided-mode').classList.contains('hidden')})`));
  log('    embebido + back -> ' + JSON.stringify(s));
  check('S15 F3: atrás NO cierra el guiado embebido (es un tab, no un overlay)', s.closed === false && s.embedded && !s.hidden, JSON.stringify(s));
  // Con un descanso abierto en el embebido, atrás lo SALTA (cierra el descanso)
  await ev(`(()=>{const ov=document.getElementById('gm-rest-overlay');ov.classList.remove('hidden');GM.restTimer=setInterval(()=>{},1000);})()`);
  s = JSON.parse(await ev(`JSON.stringify({closed:_aviCloseTopOverlay(),restHidden:document.getElementById('gm-rest-overlay').classList.contains('hidden'),timer:!!GM.restTimer,stillEmbedded:document.getElementById('guided-mode').classList.contains('gm-embedded')})`));
  log('    descanso + back -> ' + JSON.stringify(s));
  check('S15 F3: atrás con descanso abierto lo cierra (skip) y NO cierra el guiado embebido', s.closed === true && s.restHidden && !s.timer && s.stillEmbedded, JSON.stringify(s));
  // La ficha ❓ desde el embebido empuja capa propia (navOpenLayer) → back la cierra por capa
  await ev(`(()=>{const lays0=AVINAV.layers;window._s15lay0=lays0;openExDetail(DB.exercises.find(e=>exTrack(e)==='reps').id);})()`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify({fichaOpen:document.getElementById('exdetail-bg').classList.contains('on'),layerUp:AVINAV.layers>window._s15lay0})`));
  check('S15 F3: la ficha ❓ desde el embebido abre y empuja una capa de navegación (atrás la cierra)', s.fichaOpen && s.layerUp, JSON.stringify(s));
  await ev(`(()=>{_closeExDetail&&_closeExDetail();if(AVINAV.layers>window._s15lay0)AVINAV.layers=window._s15lay0;})()`);
  // Contraprueba: guiado como OVERLAY (flag OFF) SÍ se cierra con atrás
  await ev(`(()=>{setUiGuided(false);const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);CUR.activeRoutine=c.routines[0];openGuidedMode();closeStartCard();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({closed:_aviCloseTopOverlay(),hidden:document.getElementById('guided-mode').classList.contains('hidden')})`));
  log('    overlay clásico + back -> ' + JSON.stringify(s));
  check('S15 F3: el guiado como OVERLAY (flag OFF) SÍ se cierra con atrás (sin regresión)', s.closed === true && s.hidden, JSON.stringify(s));
  await ev(`(()=>{setUiGuided(false);closeGuidedMode();closeStartCard();Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);

  // ── S16: UNIFICACIÓN · el interruptor cambia "Hoy" DE VERDAD (guarda cnTodayGuard) ──
  log('\n=== S16: activar/desactivar el interruptor re-renderiza "Hoy" (fix cnTodayGuard) ===');
  // Estado inicial: flag OFF, rutina puesta, "Hoy" renderizada como clásica (cex-list)
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));setUiGuided(false);const c=DB.clients.find(x=>x.id===CUR.clientId);const r=JSON.parse(JSON.stringify(DB.exercises.find(e=>exTrack(e)==='reps')));r.sets=2;c.routines=[{id:'rTest',day:c.routines[0].day,name:'Toggle Hoy Test',exercises:[r]}];CUR.todayWorking=null;CUR.todayOverride=null;cnTab('cn-today',_cnTabEl('cn-today'));renderClientToday(c);})()`);
  await sleep(400);
  // Ir a Perfil y ACTIVAR la vista guiada con el botón real → debe LLEVAR a "Hoy" embebido solo
  await ev(`(()=>{cnTab('cn-profile',_cnTabEl('cn-profile'));renderGuidedViewToggle(DB.clients.find(x=>x.id===CUR.clientId));document.querySelector('#cn-guided-card button').click();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({on:uiGuided(),onToday:document.getElementById('cn-today').classList.contains('on'),embedded:document.getElementById('guided-mode').classList.contains('gm-embedded'),noCex:!document.getElementById('cex-list')})`));
  log('    tras activar -> ' + JSON.stringify(s));
  check('S16: activar la vista guiada LLEVA a "Hoy" y la muestra embebida (sin salir/entrar)', s.on && s.onToday && s.embedded && s.noCex, JSON.stringify(s));
  // Ahora DESACTIVAR desde Perfil con el botón real → debe LLEVAR a "Hoy" clásico solo
  await ev(`(()=>{cnTab('cn-profile',_cnTabEl('cn-profile'));renderGuidedViewToggle(DB.clients.find(x=>x.id===CUR.clientId));document.querySelector('#cn-guided-card button').click();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({off:!uiGuided(),onToday:document.getElementById('cn-today').classList.contains('on'),cex:!!document.getElementById('cex-list'),notEmbedded:!document.getElementById('guided-mode').classList.contains('gm-embedded')})`));
  log('    tras desactivar -> ' + JSON.stringify(s));
  check('S16: desactivar LLEVA a "Hoy" y restaura la clásica (cex-list, guiado no embebido)', s.off && s.onToday && s.cex && s.notEmbedded, JSON.stringify(s));
  await ev(`(()=>{setUiGuided(false);Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);

  // ── S17: UNIFICACIÓN · "¿Cómo te sientes?" NO se queda fuera del guiado embebido ──
  // Reporte de Camilo 2026-07-03: en el embebido el chooser aparecía pero al elegir DESAPARECÍA
  // todo (la clásica en cambio muestra el banner con "Cambiar cómo me siento"). Paridad P1.
  log('\n=== S17: check-in de ánimo en el guiado embebido (chooser → banner → cambiar) ===');
  // Rutina con VARIOS ejercicios para que .cnbody desborde el viewport y el scroll sea medible
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));setUiGuided(true);clearTodayMood(CUR.clientId);const c=DB.clients.find(x=>x.id===CUR.clientId);const base=JSON.parse(JSON.stringify(DB.exercises.find(e=>exTrack(e)==='reps')));const exs=Array.from({length:4},()=>{const e=JSON.parse(JSON.stringify(base));e.sets=3;return e;});c.routines=[{id:'rTest',day:c.routines[0].day,name:'Animo Test',exercises:exs}];CUR.todayWorking=null;CUR.todayOverride=null;renderClientToday(c);})()`);
  await sleep(500);
  // 1) Antes de elegir: chooser visible dentro del embebido
  s = JSON.parse(await ev(`JSON.stringify({embedded:document.getElementById('guided-mode').classList.contains('gm-embedded'),chooser:!!document.querySelector('#gm-body .checkin-card'),btns:document.querySelectorAll('#gm-body .mood-btn').length,banner:!!document.querySelector('#gm-body button[onclick*="gmChangeMood"]')})`));
  log('    antes de elegir -> ' + JSON.stringify(s));
  check('S17 P1: el embebido muestra el chooser "¿Cómo te sientes?" antes de elegir', s.embedded && s.chooser && s.btns > 0 && !s.banner, JSON.stringify(s));
  // 2) Elegir un ánimo → chooser se va, aparece el banner; y la pantalla SUBE al tope (no salta al
  //    ejercicio actual). Forzamos scroll abajo antes de elegir para detectar el salto.
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody');if(b)b.scrollTop=9999;})()`);
  await ev(`(()=>{document.querySelector('#gm-body .mood-btn').click();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({mood:getTodayMood(CUR.clientId),chooser:!!document.querySelector('#gm-body .checkin-card'),banner:!!document.querySelector('#gm-body button[onclick*="gmChangeMood"]'),embedded:document.getElementById('guided-mode').classList.contains('gm-embedded'),sc:(document.querySelector('#s-client .cnbody')||{}).scrollTop})`));
  log('    tras elegir -> ' + JSON.stringify(s));
  check('S17 P2: al elegir se guarda el ánimo, aparece el banner y la pantalla SUBE al tope (no salta abajo)', !!s.mood && !s.chooser && s.banner && s.embedded && s.sc === 0, JSON.stringify(s));
  // 3) "Cambiar cómo me siento" → limpia el ánimo, vuelve el chooser y de nuevo sube al tope
  await ev(`(()=>{const b=document.querySelector('#s-client .cnbody');if(b)b.scrollTop=9999;})()`);
  await ev(`(()=>{document.querySelector('#gm-body button[onclick*="gmChangeMood"]').click();})()`);
  await sleep(500);
  s = JSON.parse(await ev(`JSON.stringify({mood:getTodayMood(CUR.clientId),chooser:!!document.querySelector('#gm-body .checkin-card'),banner:!!document.querySelector('#gm-body button[onclick*="gmChangeMood"]'),embedded:document.getElementById('guided-mode').classList.contains('gm-embedded'),sc:(document.querySelector('#s-client .cnbody')||{}).scrollTop})`));
  log('    tras cambiar -> ' + JSON.stringify(s));
  check('S17 P3: "Cambiar cómo me siento" limpia el ánimo, devuelve el chooser y sube al tope (no salta abajo)', !s.mood && s.chooser && !s.banner && s.embedded && s.sc === 0, JSON.stringify(s));
  await ev(`(()=>{setUiGuided(false);clearTodayMood(CUR.clientId);Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);

  // ── S18: PÉRDIDA DE DATOS · un 2º entreno de la misma rutina el mismo día NO borra el 1º ──
  // Reporte de Camilo 2026-07-03: entrenó pierna en la mañana (completo) y al reiniciar por la
  // tarde mientras probaba el guiado, Progreso mostró SOLO el nuevo y borró el de la mañana.
  // Causa: saveSessionToHistory de-duplicaba por (rutina+día) → el parcial pisaba al completo.
  log('\n=== S18: reiniciar y reentrenar la misma rutina el mismo día NO pisa el entreno hecho ===');
  await ev(`(()=>{setUiGuided(false);Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));if(DB.history&&DB.history[CUR.clientId])DB.history[CUR.clientId]=DB.history[CUR.clientId].filter(h=>h.routineId!=='rTest');const c=DB.clients.find(x=>x.id===CUR.clientId);const r=JSON.parse(JSON.stringify(DB.exercises.find(e=>exTrack(e)==='peso_reps')));r.sets=2;c.routines=[{id:'rTest',day:c.routines[0].day,name:'Pierna Test',exercises:[r]}];CUR.todayWorking=null;CUR.todayOverride=null;renderClientToday(c);})()`);
  await sleep(400);
  // Mañana: completar las 2 series → guardado al 100%
  const sidMorning = await ev(`(()=>{const rt=CUR.activeRoutine;setDone(rt.id,0,0,true);setLog(rt.id,0,0,'kg',20);setLog(rt.id,0,0,'reps',10);setDone(rt.id,0,1,true);setLog(rt.id,0,1,'kg',20);setLog(rt.id,0,1,'reps',10);updateClientProgress(rt);return currentSessionId(rt.id);})()`);
  await sleep(300);
  // cerrar la celebración de fin si quedó abierta
  await ev(`(()=>{['workout-finish','wf','m-wf'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on','show');e.style.display='none';}});})()`);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const es=(DB.history[CUR.clientId]||[]).filter(h=>h.routineId==='rTest');return {n:es.length,completo:es.some(h=>h.doneSets===2&&h.totalSets===2)};})())`));
  log('    tras completar la mañana -> ' + JSON.stringify(s) + ' sid=' + sidMorning);
  check('S18 mañana: queda 1 entrada de rTest, completa (2/2)', s.n === 1 && s.completo && !!sidMorning, JSON.stringify(s));
  // Tarde: reiniciar (mint de sesión nueva) y marcar SOLO 1 serie → guardado parcial
  const sidTarde = await ev(`(()=>{window.confirm=()=>true;resetSession();return currentSessionId(CUR.activeRoutine.id);})()`);
  await sleep(300);
  check('S18 reiniciar: la sesión cambia de id (nueva sesión, no la de la mañana)', !!sidTarde && sidTarde !== sidMorning, 'S1=' + sidMorning + ' S2=' + sidTarde);
  await ev(`(()=>{const rt=CUR.activeRoutine;setDone(rt.id,0,0,true);setLog(rt.id,0,0,'kg',15);setLog(rt.id,0,0,'reps',8);updateClientProgress(rt);})()`);
  await sleep(300);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const es=(DB.history[CUR.clientId]||[]).filter(h=>h.routineId==='rTest');return {n:es.length,completoIntacto:es.some(h=>h.doneSets===2&&h.totalSets===2),parcial:es.some(h=>h.doneSets===1)};})())`));
  log('    tras reentrenar por la tarde -> ' + JSON.stringify(s));
  check('S18 tarde: el entreno de la MAÑANA sigue intacto (2/2) y el nuevo es una entrada APARTE (1/2) — NO se borró nada', s.n === 2 && s.completoIntacto && s.parcial, JSON.stringify(s));
  // limpieza: quitar las entradas de prueba del historial y el estado de sesión
  await ev(`(()=>{if(DB.history&&DB.history[CUR.clientId])DB.history[CUR.clientId]=DB.history[CUR.clientId].filter(h=>h.routineId!=='rTest');svNow('ax_hist',DB.history);setUiGuided(false);Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);

  // ── S19: LAYOUT · los botones ↑↓🔄 NO se salen de la pantalla con la letra GRANDE (xl) ──
  // Reporte de Camilo 2026-07-03: "el botón de subir/bajar ejercicios está casi fuera de la
  // pantalla, al agrandar la letra queda casi desaparecido". Medimos el rect REAL contra el
  // viewport (390px) — el tipo de check que faltaba en las auditorías (visual, no solo DOM).
  log('\n=== S19: reorder ↑↓🔄 dentro de pantalla con texto GRANDE (embebido, data-fs=xl) ===');
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));setUiGuided(true);clearTodayMood(CUR.clientId);setTextSize('xl');const c=DB.clients.find(x=>x.id===CUR.clientId);const mk=n=>{const e=JSON.parse(JSON.stringify(DB.exercises.find(x=>exTrack(x)==='reps')));e.sets=2;e.name=n;return e;};c.routines=[{id:'rTest',day:c.routines[0].day,name:'Reorder XL Test',exercises:[mk('Sentadilla búlgara con mancuernas'),mk('Peso muerto rumano a una pierna'),mk('Zancadas caminando largas')]}];CUR.todayWorking=null;CUR.todayOverride=null;renderClientToday(c);})()`);
  await sleep(600);
  s = JSON.parse(await ev(`JSON.stringify((()=>{
    const fs=document.documentElement.getAttribute('data-fs');
    const btns=[...document.querySelectorAll('#gm-body .gm-ex-card .cex-reorder button')];
    const vw=window.innerWidth;
    let worstRight=0, minLeft=1e9, offscreen=0, n=btns.length;
    btns.forEach(b=>{const r=b.getBoundingClientRect(); if(r.width>0){ worstRight=Math.max(worstRight,r.right); minLeft=Math.min(minLeft,r.left); if(r.right>vw+0.5||r.left<-0.5)offscreen++; }});
    return {fs,vw:Math.round(vw),n,worstRight:Math.round(worstRight),minLeft:Math.round(minLeft),offscreen};
  })())`));
  log('    medición xl -> ' + JSON.stringify(s));
  check('S19: con letra xl los botones ↑↓🔄 del guiado están DENTRO de la pantalla (ninguno fuera del viewport)', s.fs === 'xl' && s.n >= 6 && s.offscreen === 0 && s.worstRight <= s.vw + 1 && s.minLeft >= -1, JSON.stringify(s));
  // limpieza: volver a texto normal, apagar flag y quitar la rutina de prueba
  await ev(`(()=>{setTextSize('normal');setUiGuided(false);Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));const c=DB.clients.find(x=>x.id===CUR.clientId);renderClientToday(c);})()`);

  // ── S21: tooltip educativo adaptado al guiado (❓ video + 💨 respiración), y la × persiste ──
  // F4 dejó al guiado como default → el tooltip de onboarding (que buscaba #cex-list de la clásica)
  // no le salía a usuarios nuevos. Ahora gmShowExTip lo pinta dentro de #gm-body y suma la
  // respiración (ventaja P13 del guiado). Pedido de Camilo 2026-07-04. (Va ANTES de S20 porque
  // S20b es destructivo del nodo #guided-mode compartido — ver nota en S20b.)
  log('\n=== S21: tooltip guiado (❓ video + 💨 respiración) + cierre persistente ===');
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));localStorage.removeItem('apex_tip_done_'+CUR.clientId);setUiGuided(true);clearTodayMood(CUR.clientId);const c=DB.clients.find(x=>x.id===CUR.clientId);const mk=()=>{const e=JSON.parse(JSON.stringify(DB.exercises.find(x=>exTrack(x)==='reps')));e.sets=2;return e;};c.routines=[{id:'rTest',day:c.routines[0].day,name:'Tip Guiado Test',exercises:[mk(),mk()]}];CUR.todayWorking=null;CUR.todayOverride=null;CUR.todayRenderedDay=null;renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const t=document.getElementById('ex-first-tip');const body=document.getElementById('gm-body');const inBody=!!(t&&body&&body.contains(t));const html=t?t.innerHTML:'';const beforeCard=!!(t&&t.nextElementSibling&&t.nextElementSibling.classList.contains('gm-ex-card'));return{present:!!t,inBody,video:/❓/.test(html)&&/video/i.test(html),breath:/💨/.test(html)&&/respirar/i.test(html),beforeCard};})())`));
  check('S21: el tooltip guiado aparece en #gm-body, sobre la 1ª tarjeta, con ❓ video + 💨 respiración', s.present && s.inBody && s.video && s.breath && s.beforeCard, JSON.stringify(s));
  // la × lo cierra y persiste (no reaparece tras un re-render)
  await ev(`dismissExTooltip()`);
  await ev(`gmRender()`); // fuerza un re-render (como al elegir ánimo / reordenar)
  await sleep(200);
  s = JSON.parse(await ev(`JSON.stringify({gone:!document.getElementById('ex-first-tip'),done:localStorage.getItem('apex_tip_done_'+CUR.clientId)==='1'})`));
  check('S21: la × cierra el tooltip y NO reaparece tras re-render (persistente por dispositivo)', s.gone && s.done, JSON.stringify(s));
  // limpieza
  await ev(`(()=>{setUiGuided(false);localStorage.removeItem('apex_tip_done_'+CUR.clientId);Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));const c=DB.clients.find(x=>x.id===CUR.clientId);CUR.todayRenderedDay=null;renderClientToday(c);})()`);

  // ── S22: calentamiento/movilidad en el guiado (paridad con la clásica) ──
  // Reporte de Camilo 2026-07-04: con el guiado default no aparecían los estiramientos, las reps
  // de calentamiento ni el botón "mostrar". La clásica pinta renderWarmup en #wu-wrap; el guiado
  // embebido no lo hacía. Ahora gmRender inserta #wu-wrap tras la cabecera y llama renderWarmup.
  log('\n=== S22: calentamiento/movilidad + toggle "mostrar" dentro del guiado ===');
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));setUiGuided(true);clearTodayMood(CUR.clientId);const c=DB.clients.find(x=>x.id===CUR.clientId);const mk=()=>{const e=JSON.parse(JSON.stringify(DB.exercises.find(x=>exTrack(x)==='peso_reps')));e.sets=3;return e;};c.routines=[{id:'rTest',day:c.routines[0].day,name:'Calentamiento Test',exercises:[mk(),mk()]}];CUR.todayWorking=null;CUR.todayOverride=null;CUR.todayRenderedDay=null;renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const body=document.getElementById('gm-body');const wrap=document.getElementById('wu-wrap');const inBody=!!(body&&wrap&&body.contains(wrap));const card=!!document.querySelector('#gm-body .wu-card');const rows=document.querySelectorAll('#gm-body .wu-ex-row').length;const reps=[...document.querySelectorAll('#gm-body .wu-ex-reps')].filter(e=>e.textContent.trim()).length;const toggle=!!document.getElementById('wu-chev');const guide=!!document.querySelector('#gm-body .wu-guide-btn');const openBefore=(()=>{const b=document.getElementById('wu-body');return b?b.classList.contains('open'):null})();return{inBody,card,rows,reps,toggle,guide,openBefore};})())`));
  check('S22: el guiado muestra la tarjeta de calentamiento con ejercicios (reps + toggle + 🎥 guía)', s.inBody && s.card && s.rows > 0 && s.reps > 0 && s.toggle && s.guide, JSON.stringify(s));
  await ev(`toggleWarmup()`); await sleep(200); // expandir para el screenshot
  await shot('s22-guiado-calentamiento');
  await ev(`toggleWarmup()`); await sleep(100); // volver a colapsar (estado por defecto)
  // S22c: los "Sets de calentamiento" (aproximación) por ejercicio — el botón Mostrar existe y
  // al tocarlo aparece la fila de aproximación (token w0). Faltaba en el guiado (reporte Camilo).
  s = JSON.parse(await ev(`JSON.stringify((()=>{const card=document.querySelector('#gm-body .gm-ex-card');const tg=card&&card.querySelector('.gm-warm-toggle');const btn=tg&&tg.querySelector('button');return{hdr:!!tg,btnTxt:btn?btn.textContent.trim():null,rowBefore:!!(card&&card.querySelector('[id^=\"gm-warm-\"], .gm-aux-row, [data-tok=\"w0\"]'))};})())`));
  check('S22c: cada ejercicio de peso muestra el encabezado "🔥 Sets de calentamiento" con botón Mostrar', s.hdr && s.btnTxt === 'Mostrar', JSON.stringify(s));
  await ev(`gmToggleExWarm(0)`); await sleep(200);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const card=document.querySelector('#gm-body .gm-ex-card');const tg=card&&card.querySelector('.gm-warm-toggle button');const shown=localStorage.getItem('wshow_rTest_0');const auxRow=!!(card&&card.querySelector('.gm-sinput[data-field=\"kg\"]'));return{btnTxt:tg?tg.textContent.trim():null,shown,auxRow};})())`));
  check('S22c: al tocar "Mostrar" aparece la fila de aproximación y el botón pasa a "Ocultar"', s.btnTxt === 'Ocultar' && s.shown === '1', JSON.stringify(s));
  await ev(`gmToggleExWarm(0)`); await sleep(100); // ocultar de nuevo
  // el botón "mostrar/ocultar" (chevron) alterna el estado del cuerpo del calentamiento
  const _openB = s.openBefore;
  await ev(`toggleWarmup()`);
  await sleep(150);
  s = JSON.parse(await ev(`JSON.stringify({openAfter:(()=>{const b=document.getElementById('wu-body');return b?b.classList.contains('open'):null})()})`));
  check('S22: el botón "mostrar/ocultar" (toggleWarmup) cambia el estado del calentamiento', s.openAfter !== _openB && s.openAfter !== null, JSON.stringify({before:_openB, after:s.openAfter}));
  // limpieza
  await ev(`(()=>{setUiGuided(false);Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));const c=DB.clients.find(x=>x.id===CUR.clientId);CUR.todayRenderedDay=null;renderClientToday(c);})()`);

  // ── S20: BLINDAJE F4 (v263) — el guiado por defecto NUNCA deja "Hoy" en blanco ──
  // El default ON amplió la superficie: renderClientToday hace con.innerHTML='' y luego embebe.
  // (a) hueco null en exercises → prepareTodaySession lo filtra (raíz común clásica+guiado).
  // (b) si el embebido LANZA (p.ej. #gm-body ausente por un SW/index viejo) el try/catch cae a
  //     la clásica en vez de dejar la pantalla vacía. Auditoría profunda 2026-07-04.
  //     OJO: S20b es DESTRUCTIVO del nodo #guided-mode (al lanzar tras moverlo a #cn-today-body,
  //     el innerHTML de la clásica lo borra) → va AL FINAL; nada guiado corre después.
  log('\n=== S20: blindaje F4 (hueco null filtrado; throw del embebido cae a clásica) ===');
  await ev(`(()=>{Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));setUiGuided(true);clearTodayMood(CUR.clientId);const c=DB.clients.find(x=>x.id===CUR.clientId);const mk=()=>{const e=JSON.parse(JSON.stringify(DB.exercises.find(x=>exTrack(x)==='reps')));e.sets=2;return e;};c.routines=[{id:'rTest',day:c.routines[0].day,name:'Null Hole Test',exercises:[mk(),null,mk()]}];CUR.todayWorking=null;CUR.todayOverride=null;CUR.todayRenderedDay=null;renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({embedded:document.getElementById('guided-mode').classList.contains('gm-embedded'),cards:document.querySelectorAll('#gm-body .gm-ex-card').length,notBlank:((document.getElementById('cn-today-body')||{}).innerHTML||'').length>0})`));
  check('S20a: hueco null en exercises → filtrado; el guiado embebe los 2 ejercicios reales sin blanco', s.embedded && s.cards === 2 && s.notBlank, JSON.stringify(s));
  // (b) simular #gm-body ausente (index.html viejo por SW) → openGuidedEmbedded LANZA → cae a clásica
  await ev(`(()=>{const b=document.getElementById('gm-body');if(b)b.id='gm-body-HIDDEN';const c=DB.clients.find(x=>x.id===CUR.clientId);CUR.todayRenderedDay=null;renderClientToday(c);})()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify({cex:!!document.getElementById('cex-list'),notBlank:((document.getElementById('cn-today-body')||{}).innerHTML||'').trim().length>0})`));
  check('S20b: si el embebido LANZA (sin #gm-body), "Hoy" cae a la clásica (cex-list), NO queda en blanco', s.cex === true && s.notBlank === true, JSON.stringify(s));
  // apagar flag y limpiar (el nodo #guided-mode quedó consumido por el fallback — pristino tras recargar)
  await ev(`(()=>{setUiGuided(false);Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);

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
