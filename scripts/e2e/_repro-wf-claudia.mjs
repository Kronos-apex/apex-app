// Repro reporte Camilo 2026-07-07: a Claudia NO le apareció la pantalla de fin
// (#workout-finish) al completar su entreno (19/19 guardado OK en la nube). A Camilo sí.
// Barrido de caminos de finalización en el guiado embebido post-F5:
//   W1 en orden (última serie con el check normal)   W2 fuera de orden (se devuelve a una saltada)
//   W3 última = plancha (crono isométrico)           W4 última = HIIT
//   W5 última = cardio (cuenta regresiva v289)       W6 re-marcar tras des-marcar (guard _wfShownFor)
//   W7 con ánimo elegido (rutina adaptada)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8768;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-wf-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9268', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9268/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x='') => { const line = (c?'OK ':'FAIL ') + n + (x?' — '+x:''); results.push(line); log('  ' + line); };

async function freshLogin() {
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function'&&!document.getElementById('avi-loading'))})()`, 60000);
  let inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  if (!inApp) {
    await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
    await ev(`doLogin()`);
    await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 60000);
  }
  await sleep(2500);
  for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}})()`);
}

// estado del finish + guard
const wf = () => ev(`JSON.stringify({on:document.getElementById('workout-finish').classList.contains('on'),guard:typeof _wfShownFor!=='undefined'?_wfShownFor:'<no-var>'})`).then(JSON.parse);
const resetWf = () => ev(`(()=>{document.getElementById('workout-finish').classList.remove('on');document.body.style.overflow='';_wfShownFor=null;if(DB.history&&DB.history[CUR.clientId])DB.history[CUR.clientId]=DB.history[CUR.clientId].filter(h=>h.routineId!=='rTest');})()`);
async function setR(name, mkExs){
  return await ev(`(()=>{try{
    const c=DB.clients.find(x=>x.id===CUR.clientId);
    const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const lib=id=>JSON.parse(JSON.stringify(DB.exercises.find(e=>e.id===id)));
    const byTrack=t=>JSON.parse(JSON.stringify(DB.exercises.find(e=>exTrack(e)===t)));
    Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));
    try{clearTodayMood(CUR.clientId);}catch(e){}
    const exs=(${mkExs})({lib,byTrack});
    c.routines=[{id:'rTest', day:days[new Date().getDay()], name:${JSON.stringify(name)}, exercises:exs}];
    CUR.todayWorking=null; CUR.todayOverride=null; CUR.todayRenderedDay=null;
    navReset('cn-today'); cnTab('cn-today',_cnTabEl('cn-today'),true);
    renderClientToday(c);
    return 'ok';
  }catch(e){return String(e&&e.stack||e);}})()`);
}

try {
  await freshLogin();

  // ── W1: en orden, última serie con el check ──
  log('\n=== W1: completar EN ORDEN (2 series reps) ===');
  await setR('WF Orden', `({byTrack})=>{const r=byTrack('reps');r.sets=2;return [r];}`);
  await sleep(500); await resetWf();
  await ev(`document.getElementById('gm-chk-0-0').click()`);
  await sleep(400);
  await ev(`(()=>{if(GM.restTimer)gmSkipRest();})()`);
  await ev(`document.getElementById('gm-chk-0-1').click()`);
  await sleep(900);
  let s = await wf();
  check('W1 la celebración aparece al completar en orden', s.on, JSON.stringify(s));
  await resetWf();

  // ── W2: FUERA de orden — salta la serie 1, hace la 2, vuelve por la 1 ──
  log('\n=== W2: completar FUERA de orden ===');
  await setR('WF Desorden', `({byTrack})=>{const r=byTrack('reps');r.sets=2;return [r];}`);
  await sleep(500); await resetWf();
  await ev(`document.getElementById('gm-chk-0-1').click()`); // segunda primero (no es el paso activo)
  await sleep(300);
  await ev(`(()=>{if(GM.restTimer)gmSkipRest();})()`);
  await ev(`document.getElementById('gm-chk-0-0').click()`); // la saltada, de última
  await sleep(900);
  s = await wf();
  check('W2 la celebración aparece al completar fuera de orden', s.on, JSON.stringify(s));
  await resetWf();

  // ── W3: última = PLANCHA (crono isométrico) ──
  log('\n=== W3: última serie = plancha (crono 2s) ===');
  await setR('WF Plancha', `({lib,byTrack})=>{const r=byTrack('reps');r.sets=1;const p=lib('e17');p.sets=1;return [r,p];}`);
  await sleep(500); await resetWf();
  await ev(`document.getElementById('gm-chk-0-0').click()`);
  await sleep(300);
  await ev(`(()=>{if(GM.restTimer)gmSkipRest();})()`);
  await ev(`(()=>{const row=document.getElementById('gm-set-1-0');row.querySelector('.gm-sinput[data-field="secs"]').value='2';row.querySelector('.gm-timer-go').click();})()`);
  await sleep(3600);
  s = await wf();
  check('W3 la celebración aparece cuando la última es plancha', s.on, JSON.stringify(s));
  await resetWf();

  // ── W4: última = HIIT ──
  log('\n=== W4: última serie = HIIT (2s/1s × 2) ===');
  await setR('WF Hiit', `({lib,byTrack})=>{const r=byTrack('reps');r.sets=1;const h=lib('e189');h.sets=2;h.hiit={work:2,rest:1};return [r,h];}`);
  await sleep(500); await resetWf();
  await ev(`document.getElementById('gm-chk-0-0').click()`);
  await sleep(300);
  await ev(`(()=>{if(GM.restTimer)gmSkipRest();})()`);
  await ev(`document.getElementById('gm-hiit-btn-1').click()`);
  await sleep(8500);
  s = await wf();
  check('W4 la celebración aparece cuando la última es HIIT', s.on, JSON.stringify(s));
  await resetWf();

  // ── W5: última = CARDIO (cuenta regresiva; fast-forward) ──
  log('\n=== W5: última serie = cardio (v289) ===');
  await setR('WF Cardio', `({byTrack})=>{const r=byTrack('reps');r.sets=1;const c=byTrack('cardio');c.sets=1;return [r,c];}`);
  await sleep(500); await resetWf();
  await ev(`document.getElementById('gm-chk-0-0').click()`);
  await sleep(300);
  await ev(`(()=>{if(GM.restTimer)gmSkipRest();})()`);
  await ev(`(()=>{const inp=document.getElementById('gm-cardio-min-1');if(inp){inp.value='1';setLog('rTest',1,0,'min','1');}document.getElementById('gm-cardio-btn-1').click();})()`);
  await sleep(1500);
  await ev(`GM.restEndAt=Date.now()+1200`); // fast-forward del cardio
  await sleep(3500);
  s = await wf();
  check('W5 la celebración aparece cuando la última es cardio', s.on, JSON.stringify(s));
  await resetWf();

  // ── W6: guard — re-marcar tras des-marcar NO re-celebra (comportamiento esperado) ──
  log('\n=== W6: des-marcar y re-marcar (guard anti re-pop) ===');
  await setR('WF Guard', `({byTrack})=>{const r=byTrack('reps');r.sets=1;return [r];}`);
  await sleep(500); await resetWf();
  await ev(`document.getElementById('gm-chk-0-0').click()`);
  await sleep(900);
  s = await wf();
  const first = s.on;
  await ev(`(()=>{document.getElementById('workout-finish').classList.remove('on');document.body.style.overflow='';})()`);
  await ev(`(()=>{const chk=document.getElementById('gm-chk-0-0');if(chk)chk.click();})()`); // des-marca
  await sleep(300);
  await ev(`(()=>{const chk=document.getElementById('gm-chk-0-0');if(chk)chk.click();})()`); // re-marca
  await sleep(900);
  s = await wf();
  check('W6 primera vez celebra; re-marcar NO re-celebra (guard)', first === true && s.on === false, JSON.stringify({first, again:s.on, guard:s.guard}));
  await resetWf();

  // ── W7: con ÁNIMO elegido (rutina adaptada por pickMood) ──
  log('\n=== W7: completar con ánimo elegido (rutina adaptada) ===');
  await setR('WF Animo', `({byTrack})=>{const r=byTrack('reps');r.sets=2;return [r];}`);
  await sleep(500); await resetWf();
  await ev(`(()=>{const b=document.querySelector('#gm-body .mood-btn');if(b)b.click();})()`);
  await sleep(900);
  const plan = JSON.parse(await ev(`JSON.stringify({steps:GM.steps.length,exs:GM.exercises.length})`));
  log('    plan adaptado -> ' + JSON.stringify(plan));
  for (let i = 0; i < plan.steps; i++) {
    await ev(`(()=>{const st=GM.steps[GM.currentStep];if(!st)return;if(GM.restTimer)gmSkipRest();const chk=document.getElementById('gm-chk-'+st.ei+'-'+st.si);if(chk)chk.click();})()`);
    await sleep(350);
    await ev(`(()=>{if(GM.restTimer)gmSkipRest();})()`);
  }
  await sleep(900);
  s = await wf();
  check('W7 la celebración aparece con rutina adaptada por ánimo', s.on, JSON.stringify({...s, steps:plan.steps}));
  await resetWf();
  await ev(`(()=>{try{clearTodayMood(CUR.clientId);}catch(e){}Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);

  // ── W8: BLINDAJE — si checkAndUpdatePRs LANZA, la celebración sale igual (fix v293) ──
  // Es el modo de falla que calza con el caso Claudia: historial guardado, pantalla muerta.
  log('\n=== W8: throw en checkAndUpdatePRs → la celebración sobrevive ===');
  await setR('WF Blindaje', `({byTrack})=>{const r=byTrack('reps');r.sets=1;return [r];}`);
  await sleep(500); await resetWf();
  await ev(`(()=>{window._realPRs=checkAndUpdatePRs;checkAndUpdatePRs=()=>{throw new Error('repro-claudia');};window._logCount=0;window._realLog=_logAppError;_logAppError=(k,m,s)=>{window._logCount++;window._lastLog=m;};})()`);
  await ev(`document.getElementById('gm-chk-0-0').click()`);
  await sleep(900);
  s = await wf();
  const logged = JSON.parse(await ev(`JSON.stringify({n:window._logCount,msg:window._lastLog||''})`));
  check('W8 con throw en PRs la celebración APARECE igual y el error se reporta', s.on === true && logged.n >= 1 && /wf-prs/.test(logged.msg), JSON.stringify({on:s.on, ...logged}));
  await ev(`(()=>{checkAndUpdatePRs=window._realPRs;_logAppError=window._realLog;})()`);
  await resetWf();

  // ── W9: BLINDAJE — throw a MITAD de showWorkoutFinish no quema el guard del día ──
  log('\n=== W9: throw dentro de showWorkoutFinish → el re-marque REINTENTA ===');
  await setR('WF Guard2', `({byTrack})=>{const r=byTrack('reps');r.sets=1;return [r];}`);
  await sleep(500); await resetWf();
  // rompe wfConfetti... no: rompe algo ANTES del classList.add — renderPRsInProfile no está
  // dentro de showWorkoutFinish. Usamos fmtDuration (línea de chips, antes del add).
  await ev(`(()=>{window._realFmt=fmtDuration;fmtDuration=()=>{throw new Error('repro-mitad');};})()`);
  await ev(`document.getElementById('gm-chk-0-0').click()`);
  await sleep(900);
  s = await wf();
  const blocked = !s.on; // con el throw, la pantalla no salió esta vez…
  await ev(`(()=>{fmtDuration=window._realFmt;})()`);
  await ev(`(()=>{const chk=document.getElementById('gm-chk-0-0');if(chk){chk.click();}})()`); // des-marca
  await sleep(300);
  await ev(`(()=>{const chk=document.getElementById('gm-chk-0-0');if(chk){chk.click();}})()`); // re-marca
  await sleep(900);
  s = await wf();
  check('W9 guard no quemado: tras el throw, re-marcar SÍ celebra', blocked === true && s.on === true, JSON.stringify({blocked, retry:s.on}));
  await resetWf();

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
