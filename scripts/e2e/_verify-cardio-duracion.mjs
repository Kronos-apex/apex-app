// _verify-cardio-duracion.mjs — LA DURACIÓN Y LAS CALORÍAS DE UN CARDIO (v723).
//
// Reporte del PO (28-oct-2026, con capturas de él y de Carla): «no está marcando las calorías del cardio».
// 10 minutos de bicicleta en «Cardio a tu ritmo» y la pantalla de cierre decía «1 min · 11 kcal» (a ella, 8).
// Medido en el respaldo del 28-oct: 6 sesiones de 3 personas, TODAS de solo cardio, con `startedAt` IGUAL a
// `finishedAt`. Causa: el inicio de la sesión se sellaba al marcar la PRIMERA serie, y un cardio se marca cuando
// el cronómetro TERMINA → el reloj medía 0 s, el piso de 60 s lo dejaba en «1 min» y las calorías salían de ahí.
//
// Recorre el camino real: elige la bici en la ventana, toca Empezar, corre el cronómetro de 10 min (adelantado: va
// por timestamp absoluto) y lee la pantalla de cierre y la sesión guardada. CONTROL: con `cardioDoneSec` apagado la
// MISMA sonda tiene que ver el «1 min» del reporte (si no lo ve, no discrimina). Y la cura del historial: una sesión
// guardada como la de Carla vuelve a sus 10 min al cargar la fila.
//
// Sin login ni red: monta la app local (la nube está sellada en localhost, v298) con una asesorada INVENTADA.
//   node scripts/e2e/_verify-cardio-duracion.mjs      · exit 1 si algo falla · cero jsErrors
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8891, DBG = 9445;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/cardiodur-' + Date.now(), '--no-first-run',
  '--window-size=360,800', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderClientToday==='function' && typeof gmRender==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1500);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const CID = 'qa-cardiodur';
const PESO = 65;

const MONTAR = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const client={id:'${CID}',name:'Prueba Cardio',sex:'F',level:'Principiante',goal:'Salud',days:3,weight:${PESO},height:160,age:30,
    createdAt:'2026-06-01T10:00:00.000Z',startDate:'2026-06-01',habits:{water:{},steps:{}},
    routines:[{id:'rq1',name:'Pierna',day:['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()],restSec:90,reviewed:true,note:'',
      exercises:[Object.assign({},DB.exercises.find(e=>e.id==='e42'),{sets:3,reps:'12'})]}]};
  const d=n=>new Date(Date.now()-n*86400000).toISOString();
  DB.clients=[client];
  // Un entreno previo: sin él la app está en «modo día 1» y esconde la entrada a los rápidos.
  DB.history={'${CID}':[{id:'hq1',sessionId:'sq1',routineId:'rq1',routineName:'Pierna',date:d(3),finishedAt:d(3),doneSets:3,totalSets:3,totalVol:3600,
    exercises:[{id:'e42',name:'Hip Thrust con Barra',sets:Array.from({length:3},()=>({kg:'100',reps:'12',done:true}))}]}]};
  DB.prs={}; DB.bodyweight={}; DB.nutrition={}; DB.medidas={}; DB.photos={};
  CUR.clientId='${CID}'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^mood_|qw_cardio_/.test(k)).forEach(k=>localStorage.removeItem(k));
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  try{Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted',requestPermission:async()=>'granted'}});}catch(e){}
  try{if(typeof closeWorkoutFinish==='function')closeWorkoutFinish();}catch(e){}
  showScreen('s-client'); cnTab('cn-today',document.querySelector('.cntab'),true);
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return {ok:true};
}catch(e){return {ok:false,err:e.message};}})()`;
const CERRAR_TODO = `try{if(typeof closeWorkoutFinish==='function')closeWorkoutFinish();}catch(e){}
  document.querySelectorAll('.mdbg.on').forEach(m=>m.classList.remove('on'));
  {const r=document.getElementById('quickwo-room');if(r)r.classList.remove('on');} if(typeof _syncRoomBodyClass==='function')_syncRoomBodyClass();`;
// Arranca una opción con un CLIC real en su fila de la ventana (no llamando a la función por debajo).
const ARRANCAR = exId => `(async()=>{${CERRAR_TODO}
  openQuickWorkouts(); await new Promise(r=>setTimeout(r,250));
  startQuickWorkout('qw_cardio'); await new Promise(r=>setTimeout(r,250));
  const b=[...document.querySelectorAll('#qwcardio-list .qwc-opt')].find(x=>(x.getAttribute('onclick')||'').includes("'${exId}'"));
  if(!b)return {ok:false};
  b.click(); await new Promise(r=>setTimeout(r,1300));
  return {ok:true};})()`;
const EMPEZAR = `(async()=>{const h=document.querySelector('#cn-today .tod-hero-cta')||document.querySelector('#cn-today .start-card-go');
  if(h)h.click(); else if(!(GM.routine&&/^qw_cardio_/.test(GM.routine.id))) return {ok:false};
  await new Promise(r=>setTimeout(r,900));
  const mb=[...document.querySelectorAll('.mood-btn')][0]; if(mb){mb.click(); await new Promise(r=>setTimeout(r,900));}
  return {ok:true};})()`;
// Corre el cronómetro de `min` minutos y lo adelanta a los 2 s del final (va por timestamp absoluto), espera el
// cierre y lee lo que la persona ve y lo que quedó guardado.
const CORRER_Y_LEER = (exId, min) => `(async()=>{
  gmCardioTimer(0, ${min}, 1); await new Promise(r=>setTimeout(r,400));
  GM.restEndAt=Date.now()+2000; await new Promise(r=>setTimeout(r,5200));
  const wf=document.getElementById('workout-finish');
  const chips={}; [...document.querySelectorAll('#wf-stats .wf-stat')].forEach(x=>{chips[x.querySelector('.wf-stat-lbl').textContent]=x.querySelector('.wf-stat-val').textContent;});
  const h=(DB.history['${CID}']||[]).find(x=>x.routineId==='qw_cardio_${exId}');
  return {on:!!(wf&&wf.classList.contains('on')),chips,durSec:h&&h.durationSec,kcal:h&&h.kcal,
    inicioAFin:h&&h.startedAt&&h.finishedAt?Math.round((Date.parse(h.finishedAt)-Date.parse(h.startedAt))/1000):null,
    min:h&&h.exercises&&h.exercises[0]&&h.exercises[0].sets[0].min};})()`;

let m = await ev(MONTAR);
check('CONTROL · se montó la asesorada', m && m.ok, JSON.stringify(m));
await sleep(1200);

// ── 1. El caso del reporte: 10 min de bici con el cronómetro ─────────────────
await ev(ARRANCAR('e64')); await ev(EMPEZAR);
let s = await ev(CORRER_Y_LEER('e64', 10));
const kcalEsperadas = Math.round(7 * PESO * (s.durSec || 0) / 3600);  // MET del cardio × peso × horas (`_trackMET`)
check('la pantalla de cierre sale', s.on, JSON.stringify(s));
check('10 min de bici se guardan como 10 min (no «1 min»)', s.min === '10' && s.durSec >= 600 && s.durSec < 620 && s.chips['Duración'] === '10 min', JSON.stringify(s));
check('las calorías salen de esos 10 min (≈76 kcal a 65 kg), no de uno', s.kcal === kcalEsperadas && s.kcal >= 70 && s.chips['Calorías'] === kcalEsperadas + ' kcal', JSON.stringify({ ...s, kcalEsperadas }));
check('el inicio guardado queda 10 min ANTES del cierre (lo lee también la tarjeta de Comunidad)', s.inicioAFin >= 600 && s.inicioAFin < 620, JSON.stringify(s));

// ── 2. CONTROL de discriminación: sin la regla, la MISMA sonda ve el «1 min» del reporte ──
m = await ev(MONTAR); await sleep(900);
await ev(ARRANCAR('e20')); await ev(EMPEZAR);
s = await ev(`(async()=>{const real=window.cardioDoneSec;window.cardioDoneSec=()=>0;
  try{return await (${CORRER_Y_LEER('e20', 10)});}finally{window.cardioDoneSec=real;}})()`);
check('🔒 CONTROL · apagando cardioDoneSec la sonda ve el «1 min» del reporte', s.on && s.durSec === 60 && s.chips['Duración'] === '1 min', JSON.stringify(s));

// ── 3. La cura: una sesión guardada como la del reporte vuelve a sus minutos al cargar la fila ──
s = await ev(`(()=>{
  const t='2026-10-28T13:26:30.000Z';
  const mala={id:'hc1',sessionId:'sc1',routineId:'qw_cardio_e64',routineName:'Cardio · Bicicleta estática',date:t,startedAt:t,finishedAt:t,
    durationSec:60,kcal:8,doneSets:1,totalSets:1,totalVol:0,exercises:[{id:'e64',name:'Bicicleta Estática',track:'cardio',sets:[{min:'10',done:true}]}]};
  const sana={id:'hc2',sessionId:'sc2',routineId:'rq1',routineName:'Pierna',date:t,startedAt:'2026-10-28T12:00:00.000Z',finishedAt:t,
    durationSec:3600,kcal:300,doneSets:3,totalSets:3,totalVol:3600,exercises:[{id:'e42',name:'Hip Thrust con Barra',track:'peso_reps',sets:[{kg:'100',reps:'12',done:true}]}]};
  _applyAuthClientDB(DB.clients[0],{history:[mala,sana]});
  const h=DB.history['${CID}'], a=h.find(x=>x.id==='hc1'), b=h.find(x=>x.id==='hc2');
  return {durSec:a.durationSec,kcal:a.kcal,curada:!!a.healedDur,inicio:a.startedAt,sanaIgual:b.durationSec===3600&&b.kcal===300&&!b.healedDur};})()`);
check('la sesión guardada con «1 min · 8 kcal» vuelve a 10 min · 80 kcal y conserva lo que tenía', s.durSec === 600 && s.kcal === 80 && s.curada && s.inicio === '2026-10-28T13:16:30.000Z', JSON.stringify(s));
check('🔒 CONTROL · una sesión de fuerza sana no se toca', s.sanaIgual, JSON.stringify(s));

for (const r of results) console.log(r);
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
const fallas = results.filter(r => r.startsWith('❌')).length;
console.log(fallas === 0 && jsErrors.length === 0 ? `\nTODO OK (${results.length}/${results.length})` : `\n${fallas} FALLA(S)`);
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fallas === 0 && jsErrors.length === 0 ? 0 : 1);
