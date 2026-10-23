// _verify-qw-cardio.mjs — «CARDIO A TU RITMO» EN LOS ENTRENAMIENTOS RÁPIDOS (v718) + LOS MINUTOS DEL CARDIO (v717).
//
// v718 · la tarjeta nueva va primera, abre la ventana de opciones, el atrás cierra solo la ventana y cada opción
// arranca el guiado con UN bloque de cardio continuo (casilla de minutos + cronómetro), con los minutos de la
// última vez POR actividad. v717 · al cerrar el cardio sin teclear (cronómetro o «✓ Completar») el minuto queda
// anotado; el CONTROL apaga `gmLogCardio` y exige ver el minuto vacío (si no lo ve, la sonda no discrimina).
// Capturas claro/oscuro y con «Muy grande» de la biblioteca, la ventana y la tarjeta del cardio.
//
// Sin login ni red: monta la app local (la nube está sellada en localhost, v298) con una asesorada INVENTADA.
//   node scripts/e2e/_verify-qw-cardio.mjs      · exit 1 si algo falla · cero jsErrors
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8889, DBG = 9443;
const OUT = (process.env.QW_CARDIO_OUT || ((process.env.TEMP || '.') + '/avi-qw-cardio')).replace(/\\/g, '/');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/qwcardio-' + Date.now(), '--no-first-run',
  '--window-size=360,800', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const foto = async nombre => { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${nombre}.png`, Buffer.from(s.data, 'base64')); };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setScrollbarsHidden', { hidden: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderClientToday==='function' && typeof gmRender==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1500);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const CID = 'qa-qwcardio';

const MONTAR = tema => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  document.body.classList.toggle('dark', ${tema === 'oscuro'});
  document.documentElement.setAttribute('data-theme','${tema === 'oscuro' ? 'dark' : 'light'}');
  const client={id:'${CID}',name:'Prueba Cardio',sex:'F',level:'Principiante',goal:'Salud',days:3,weight:65,height:160,age:30,
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
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^mood_/.test(k)).forEach(k=>localStorage.removeItem(k));
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  try{Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted',requestPermission:async()=>'granted'}});}catch(e){}
  try{if(typeof closeWorkoutFinish==='function')closeWorkoutFinish();}catch(e){}
  showScreen('s-client'); cnTab('cn-today',document.querySelector('.cntab'),true);
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return {ok:true};
}catch(e){return {ok:false,err:e.message};}})()`;
const TAMANO = fs => `(()=>{ ${fs ? `document.documentElement.setAttribute('data-fs','${fs}')` : `document.documentElement.removeAttribute('data-fs')`}; return 1; })()`;
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
// Lo que hace la persona en «Hoy» después de elegir: toca «Empezar» del héroe (clic real) y responde el ánimo.
const EMPEZAR = `(async()=>{const h=document.querySelector('#cn-today .tod-hero-cta')||document.querySelector('#cn-today .start-card-go');
  const heroTxt=(document.getElementById('cn-today-head')||{}).textContent||'';
  // El extra abre el guiado embebido de una vez cuando «Hoy» ya estaba expandido: ahí no hay héroe que tocar.
  if(h)h.click(); else if(!(GM.routine&&/^qw_cardio_/.test(GM.routine.id))) return {ok:false,heroTxt};
  await new Promise(r=>setTimeout(r,900));
  const mb=[...document.querySelectorAll('.mood-btn')][0]; if(mb){mb.click(); await new Promise(r=>setTimeout(r,900));}
  return {ok:true,heroTxt:heroTxt.slice(0,160)};})()`;
const ELEGIR_Y_EMPEZAR = async (exId, fotoHeroe) => { await ev(ARRANCAR(exId)); if (fotoHeroe) await foto(fotoHeroe); return ev(EMPEZAR); };

// ── Funcional (tema claro, letra normal) ─────────────────────────────────────
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
let m = await ev(MONTAR('claro'));
check('CONTROL · se montó la asesorada', m && m.ok, JSON.stringify(m));
await sleep(1200);

let s = await ev(`(()=>{const t=document.querySelector('#qw-entry .qw-entry-tx small');return t?t.textContent:'';})()`);
check('la entrada de «Hoy» dice que ahí hay cardio', /^Cardio,/.test(s || ''), s);

await ev(`openQuickWorkouts()`); await sleep(500);
s = await ev(`(()=>{const cards=[...document.querySelectorAll('#quickwo-body .qw-card')];const c0=cards[0];
  return {on:document.getElementById('quickwo-room').classList.contains('on'),n:cards.length,esperadas:QUICK_WORKOUTS.length,
    primera:c0&&c0.querySelector('.qw-card-nm').textContent,tag:c0&&c0.querySelector('.qw-card-tag').textContent,
    tagEsperado:QUICK_CARDIO_OPTIONS.length+' opciones',hiit:cards.some(c=>/HIIT en Máquina/.test(c.textContent)),
    tagHiit:(cards.find(c=>/HIIT en Máquina/.test(c.textContent))||{querySelector:()=>({})}).querySelector('.qw-card-tag').textContent};})()`);
check('la biblioteca abre con «Cardio a tu ritmo» de primera y «N opciones»', s.on && s.n === s.esperadas && s.primera === 'Cardio a tu ritmo' && s.tag === s.tagEsperado && s.hiit && s.tagHiit === '1 ejercicio', JSON.stringify(s));
await foto('1-biblioteca-claro');

await ev(`startQuickWorkout('qw_cardio')`); await sleep(400);
s = await ev(`(()=>{const md=document.getElementById('m-qwcardio');const ops=[...document.querySelectorAll('#qwcardio-list .qwc-opt')];
  const W=innerWidth;
  return {on:md.classList.contains('on'),room:document.getElementById('quickwo-room').classList.contains('on'),
    n:ops.length,esperadas:QUICK_CARDIO_OPTIONS.length,
    nombres:ops.map(o=>o.querySelector('b').textContent).join('|')===QUICK_CARDIO_OPTIONS.map(o=>o.label).join('|'),
    iconos:ops.every(o=>!!o.querySelector('.qwc-opt-ic svg')),
    bajas:ops.filter(o=>o.getBoundingClientRect().height<44).length,
    fuera:ops.filter(o=>{const r=o.getBoundingClientRect();return r.left<0||r.right>W+0.5;}).length,
    tituloIc:!!document.querySelector('#mdt-qwcardio svg')};})()`);
check('la tarjeta abre la ventana con todas las opciones (ícono, nombre, ≥44 px, dentro de la pantalla)',
  s.on && s.room && s.n === s.esperadas && s.nombres && s.iconos && s.bajas === 0 && s.fuera === 0 && s.tituloIc, JSON.stringify(s));
await foto('2-ventana-claro');

s = await ev(`(()=>({cerro:_aviCloseTopOverlay(),modal:document.getElementById('m-qwcardio').classList.contains('on'),room:document.getElementById('quickwo-room').classList.contains('on')}))()`);
check('el atrás cierra solo la ventana y deja la biblioteca', s.cerro === true && !s.modal && s.room, JSON.stringify(s));

const heroe = await ELEGIR_Y_EMPEZAR('e64', '3-heroe-claro');
s = await ev(`(()=>{const ex=GM.exercises&&GM.exercises[0];const inp=document.getElementById('gm-cardio-min-0');
  return {modal:document.getElementById('m-qwcardio').classList.contains('on'),room:document.getElementById('quickwo-room').classList.contains('on'),
    rid:GM.routine&&GM.routine.id,nombre:GM.routine&&GM.routine.name,n:GM.exercises&&GM.exercises.length,track:ex&&exTrack(ex),ex:ex&&ex.name,
    min:inp&&inp.value,btn:!!document.getElementById('gm-cardio-btn-0')};})()`);
check('la bici sale en «Hoy» y al tocar Empezar abre UN bloque de cardio continuo con su casilla (20) y ▶ Empezar',
  heroe && heroe.ok && !s.modal && !s.room && s.rid === 'qw_cardio_e64' && /Bicicleta estática/.test(s.nombre || '') && s.n === 1 && s.track === 'cardio' && s.min === '20' && s.btn, JSON.stringify({ ...s, heroe }));
await ev(`(()=>{const e=document.getElementById('gm-cardio-min-0');if(e)e.scrollIntoView({block:'center'});return 1;})()`); await sleep(300);
await foto('4-tarjeta-cardio-claro');

// v717 · el cronómetro corre 3 s sin teclear nada → el minuto queda anotado (0,1) y llega al historial.
// Cronómetro de 1 min + «+15 s» = 75 s → 1,3 min. Se adelanta el reloj (va por timestamp absoluto) para no esperar.
await ev(`gmCardioTimer(0, 1, 1)`); await sleep(400);
await ev(`gmRestAdd15()`); await ev(`(()=>{GM.restEndAt=Date.now()+2000;return 1;})()`); await sleep(4200);
s = await ev(`(()=>{const rid='qw_cardio_e64';const h=(DB.history['${CID}']||[]).find(x=>x.routineId===rid);
  const set0=h&&h.exercises&&h.exercises[0]&&h.exercises[0].sets&&h.exercises[0].sets[0];
  return {done:isDone(rid,0,0),log:getLog(rid,0,0,'min'),hist:!!h,histMin:set0&&set0.min};})()`);
check('v717 · el cronómetro cierra el cardio y anota lo que corrió (1 min + 15 s = 1,3) aunque nadie tecleó', s.done && s.log === '1.3' && s.hist && s.histMin === '1.3', JSON.stringify(s));

// v717 · «✓ Completar» sin teclear → vale lo que muestra la casilla (el objetivo, 20).
await ELEGIR_Y_EMPEZAR('e20');
s = await ev(`(()=>{const inp=document.getElementById('gm-cardio-min-0');const antes=getLog('qw_cardio_e20',0,0,'min');gmActionBtn();
  return {antes,muestra:inp&&inp.value,log:getLog('qw_cardio_e20',0,0,'min'),done:isDone('qw_cardio_e20',0,0)};})()`);
check('v717 · «✓ Completar» sin teclear anota lo que muestra la casilla', s.antes === '' && s.muestra === '20' && s.log === '20' && s.done, JSON.stringify(s));

// 🔒 CONTROL de discriminación: sin gmLogCardio, la misma sonda TIENE que ver el minuto vacío.
await ELEGIR_Y_EMPEZAR('e67');
s = await ev(`(()=>{const real=gmLogCardio;gmLogCardio=function(){};try{gmActionBtn();}finally{gmLogCardio=real;}
  return {log:getLog('qw_cardio_e67',0,0,'min'),done:isDone('qw_cardio_e67',0,0)};})()`);
check('🔒 CONTROL · apagando gmLogCardio la sonda ve el minuto VACÍO', s.done && s.log === '', JSON.stringify(s));

// Cada actividad recuerda SUS minutos: 35 en la caminata no se cuelan en la escaladora.
await ev(`(()=>{Object.keys(localStorage).filter(k=>/qw_cardio_/.test(k)).forEach(k=>localStorage.removeItem(k));setLog('qw_cardio_e20',0,0,'min','35');return 1;})()`);
await ELEGIR_Y_EMPEZAR('e20');
const camina = await ev(`(document.getElementById('gm-cardio-min-0')||{}).value`);
await ELEGIR_Y_EMPEZAR('e135');
const escala = await ev(`(document.getElementById('gm-cardio-min-0')||{}).value`);
check('cada actividad recuerda sus minutos (caminar 35, escaladora su objetivo 15)', camina === '35' && escala === '15', JSON.stringify({ camina, escala }));

// ── Capturas: oscuro, y con «Muy grande» en los dos temas ─────────────────────
for (const [tema, fs] of [['oscuro', ''], ['claro', 'xl'], ['oscuro', 'xl']]) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'oscuro' ? 'dark' : 'light' }] });
  await ev(TAMANO(fs));
  m = await ev(MONTAR(tema)); await sleep(900);
  const sufijo = tema + (fs ? '-' + fs : '');
  await ev(`openQuickWorkouts()`); await sleep(500); await foto('1-biblioteca-' + sufijo);
  await ev(`startQuickWorkout('qw_cardio')`); await sleep(400);
  s = await ev(`(()=>{const W=innerWidth;const ops=[...document.querySelectorAll('#qwcardio-list .qwc-opt')];
    return {n:ops.length,fuera:ops.filter(o=>{const r=o.getBoundingClientRect();return r.left<0||r.right>W+0.5;}).length,
      cortes:ops.filter(o=>{const b=o.querySelector('b');return b.scrollWidth>b.clientWidth+1;}).map(o=>o.querySelector('b').textContent)};})()`);
  check(`${sufijo}: la ventana cabe y ningún nombre se corta`, s.n > 0 && s.fuera === 0 && s.cortes.length === 0, JSON.stringify(s));
  await foto('2-ventana-' + sufijo);
  await ELEGIR_Y_EMPEZAR('e64', '3-heroe-' + sufijo);
  await ev(`(()=>{const e=document.getElementById('gm-cardio-min-0');if(e)e.scrollIntoView({block:'center'});return 1;})()`); await sleep(300);
  await foto('4-tarjeta-cardio-' + sufijo);
}
await ev(TAMANO(''));
await ev(`(()=>{Object.keys(localStorage).filter(k=>/qw_cardio_/.test(k)).forEach(k=>localStorage.removeItem(k));return 1;})()`);

for (const r of results) console.log(r);
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log('capturas: ' + OUT);
const fallas = results.filter(r => r.startsWith('❌')).length;
console.log(fallas === 0 && jsErrors.length === 0 ? `\nTODO OK (${results.length}/${results.length})` : `\n${fallas} FALLA(S)`);
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fallas === 0 && jsErrors.length === 0 ? 0 : 1);
