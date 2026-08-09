// Verificación E2E del REPORTE DE DOLOR + NUDGE DE PUSH (2026-07-07, pedido Camilo).
// Login real (samuel). pushToClient se ESPÍA (que el coach no reciba fantasmas) y al
// final se limpia painCare + el mensaje de prueba del chat.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8769;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-pain-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9269', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9269/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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

try {
  // login
  await waitFor(`(()=>{const sc=document.getElementById('s-client');if(sc&&getComputedStyle(sc).display!=='none')return true;const sl=document.getElementById('s-login');return !!(sl&&getComputedStyle(sl).display!=='none'&&typeof doLogin==='function'&&!document.getElementById('avi-loading'))})()`, 60000);
  let inApp = await ev(`(()=>{const sc=document.getElementById('s-client');return !!(sc&&getComputedStyle(sc).display!=='none')})()`);
  if (!inApp) {
    await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
    await ev(`doLogin()`);
    await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 60000);
  }
  await sleep(2500);
  for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }
  await ev(`(()=>{try{UD.loadOwn=async()=>null;}catch(e){}
    window.__push=[]; window.__realPush=pushToClient; pushToClient=(cid,t,b,x)=>{window.__push.push({cid,t,b});return Promise.resolve({spy:true});};
    const c=DB.clients.find(x=>x.id===CUR.clientId); c.painCare=[]; })()`);

  // P0: nudge de push visible (permiso 'default' en perfil Chrome fresco)
  const perm = await ev(`Notification.permission`);
  const nudge0 = await ev(`(()=>{ _pushCtx={clientId:CUR.clientId,days:['Lunes'],shifts:null}; localStorage.removeItem('ax_push_snooze_'+CUR.clientId); renderPushNudge(); return {perm:Notification.permission, card: !!document.querySelector('#cn-push-nudge .push-nudge')}; })()`);
  check('P0 nudge de push se pinta con permiso default', perm !== 'default' || (nudge0 && nudge0.card), JSON.stringify(nudge0));
  const nudge1 = await ev(`(()=>{ aviSnoozePush(); return {card: !!document.querySelector('#cn-push-nudge .push-nudge'), snooze: !!localStorage.getItem('ax_push_snooze_'+CUR.clientId)}; })()`);
  check('P0 "Ahora no" esconde la tarjeta y guarda snooze 7 días', nudge1 && !nudge1.card && nudge1.snooze, JSON.stringify(nudge1));

  // Rutina de prueba embebida
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const mk=()=>{const e=JSON.parse(JSON.stringify(DB.exercises.find(x=>exTrack(x)==='peso_reps')));e.sets=2;return e;};
    Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));
    try{clearTodayMood(CUR.clientId);}catch(e){}
    c.routines=[{id:'rTest',day:days[new Date().getDay()],name:'Dolor Test',exercises:[mk(),mk()]}];
    CUR.todayWorking=null;CUR.todayOverride=null;CUR.todayRenderedDay=null;
    navReset('cn-today');cnTab('cn-today',_cnTabEl('cn-today'),true);renderClientToday(c);})()`);
  await sleep(600);

  // P1: botón ⚠️ presente en las tarjetas
  let s = JSON.parse(await ev(`JSON.stringify({btns:document.querySelectorAll('#gm-body button[onclick^="gmReportPain"]').length})`));
  check('P1 botón ⚠️ en cada tarjeta del guiado', s.btns >= 2, JSON.stringify(s));

  // P2: abre el modal con el nombre del ejercicio y chips
  await ev(`gmReportPain(0)`);
  s = JSON.parse(await ev(`JSON.stringify({on:document.getElementById('m-pain').classList.contains('on'),ex:document.getElementById('pain-ex').textContent.slice(0,60),areas:document.querySelectorAll('#pain-areas .pain-chip').length,levels:document.querySelectorAll('#pain-levels .pain-chip').length})`));
  check('P2 modal abre con ejercicio + 16 zonas + 3 niveles', s.on && s.areas === 16 && s.levels === 3 && s.ex.length > 4, JSON.stringify(s));

  // P3: sin zona/nivel no envía
  await ev(`painSubmit()`);
  s = JSON.parse(await ev(`JSON.stringify({on:document.getElementById('m-pain').classList.contains('on'),care:(DB.clients.find(x=>x.id===CUR.clientId).painCare||[]).length})`));
  check('P3 sin zona+nivel no envía (modal sigue abierto)', s.on && s.care === 0, JSON.stringify(s));

  // P4: reporte 🟠 hombro con nota → painCare + chat + SIN sustitución automática
  await ev(`(()=>{painPick('area','hombro');painPick('side','derecha');painPick('limita','cambia');painPick('inicio','progresivo');painFlag('_none');document.getElementById('pain-note').value='me duele al bajar la mancuerna';painSubmit();})()`);
  await sleep(700);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);const care=c.painCare||[];const msgs=(DB.msgs[c.id]||[]).slice(-1);
    return {closed:!document.getElementById('m-pain').classList.contains('on'),n:care.length,area:care[0]&&care[0].area,level:care[0]&&care[0].level,exName:care[0]&&care[0].exName.slice(0,20),
    msg:(msgs[0]&&msgs[0].text||'').slice(0,60),push:window.__push.length,banner:!!document.querySelector('#gm-body .pain-banner'),chip:!!document.querySelector('#gm-body .pain-exchip'),picker:!document.getElementById('m-picker')||!document.getElementById('m-picker').classList.contains('on')};})())`));
  check('P4 reporte guardado (hombro/2/ejercicio) y modal cerrado', s.closed && s.n === 1 && s.area === 'hombro' && s.level === 2 && s.exName.length > 3, JSON.stringify(s));
  check('P4 chat al coach + push espiado + banner de cuidado + chip en tarjeta', /Reporte de dolor/.test(s.msg) && s.push >= 1 && s.banner && s.chip, JSON.stringify({msg:s.msg,push:s.push,banner:s.banner,chip:s.chip}));
  check('P4 nivel 🟠 NO abre sustitución automática', s.picker, 'picker cerrado=' + s.picker);

  // P5: reporte 🔴 en el 2º ejercicio → abre el selector de sustitución solo
  await ev(`(()=>{gmReportPain(1);painPick('area','hombro');painPick('side','derecha');painPick('limita','no_puedo');painPick('inicio','progresivo');painFlag('_none');painSubmit();})()`);
  await sleep(1200);
  s = JSON.parse(await ev(`JSON.stringify({pickerOpen:!!document.querySelector('.mdbg.on #picker-list, #m-picker.on'),care:(DB.clients.find(x=>x.id===CUR.clientId).painCare||[]).length})`));
  check('P5 nivel 🔴 abre el cambio de ejercicio automáticamente', s.pickerOpen && s.care === 2, JSON.stringify(s));
  await ev(`(()=>{const m=document.querySelector('.mdbg.on');if(m)m.classList.remove('on');})()`);

  // P6: "Ya estoy bien ✓" limpia banner y chips (los reportes quedan en historial cleared)
  await ev(`painCareClear()`);
  await sleep(400);
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);return {banner:!!document.querySelector('#gm-body .pain-banner'),chip:!!document.querySelector('#gm-body .pain-exchip'),kept:(c.painCare||[]).length,cleared:(c.painCare||[]).every(p=>p.cleared)};})())`));
  check('P6 "Ya estoy bien" quita banner/chips y conserva historial cleared', !s.banner && !s.chip && s.kept === 2 && s.cleared, JSON.stringify(s));

  // P7: vista del COACH — ficha muestra el dolor vigente (simulado con un painCare activo)
  s = JSON.parse(await ev(`JSON.stringify((()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);
    c.painCare=painCareAdd([], {area:'rodilla',level:3,exId:'e13',exName:'Sentadilla',note:'al bajar'});
    const dn=document.getElementById('d-notes');
    // openDetail es async y pinta más cosas; probamos SOLO el bloque de dolor replicando su lectura
    const act=painCareActive(c.painCare); return {act:act.length, dn:!!dn};})())`));
  check('P7 painCareActive listo para la ficha del coach (d-notes existe)', s.act === 1 && s.dn, JSON.stringify(s));

  // limpieza: painCare fuera + quitar el mensaje de prueba del chat + sync real
  await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.painCare=[];
    if(DB.msgs[c.id])DB.msgs[c.id]=DB.msgs[c.id].filter(m=>!/Reporte de dolor/.test(m.text||''));
    pushToClient=window.__realPush; svNow('ax_c',DB.clients); svNow('ax_m',DB.msgs);
    Object.keys(localStorage).filter(k=>k.includes('rTest')).forEach(k=>localStorage.removeItem(k));})()`);
  await sleep(1500); // deja salir los sync

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
