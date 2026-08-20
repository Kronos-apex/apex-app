// _verify-missday.mjs — "Día que se corrió" (v368, idea Camilo 2026-07-17): si una rutina de un
// día YA PASADO de esta semana quedó sin entrenar, la tarjeta #cn-missday ofrece (1) Entrenar hoy
// (override, plan intacto), (2) Mover a hoy en mi plan (swap de días + sv('ax_c')), (3) Hoy no
// (mute por-rutina-por-semana). Sin login: sintetiza el asesorado y llama renderClientToday directo
// (la escritura a la nube está SELLADA en localhost, v298 → el swap NO toca producción). Aserciones
// duras (exit 1) + capturas claro/oscuro a 390px. El día "perdido" se ancla al LUNES (pasado salvo
// que hoy sea lunes; en ese caso las aserciones dependientes de la tarjeta se saltan con nota honesta).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8797, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9302', '--user-data-dir=' + process.env.TEMP + '/miss-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9302/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
async function shot(n) {
  const h = await ev(`Math.max(document.body.scrollHeight, 844)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(350);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n, `(${h}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderClientToday==='function' && typeof weeklyMissed==='function' && !document.getElementById('avi-loading')`);
await sleep(2000);

// Helper de reset: reconstruye el asesorado desde cero (rLeg 'Lunes' PERDIDA + rToday ocupando HOY),
// limpia el mute y re-renderiza. Devuelve el nombre del día de hoy y si hoy es lunes (sin día perdido).
const RESET = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const todayName=days[new Date().getDay()];
  const client={id:'ct1',name:'Camilo',sex:'M',level:'Intermedio',goal:'Ganar músculo',days:4,
    routines:[
      {id:'rLeg',day:'Lunes',name:'Pierna',restSec:90,exercises:[{id:'e1',name:'Sentadilla',muscle:'Pierna',type:'Compuesto',sets:4,reps:'10'}]},
      {id:'rToday',day:todayName,name:'Empuje',restSec:90,exercises:[{id:'e2',name:'PressBanca',muscle:'Pecho',type:'Compuesto',sets:4,reps:'10'}]}
    ],
    habits:{water:{},steps:{}}};
  DB.clients=[client];
  // 🔴 Con historial VACIO la app entra en modo DIA 1 (v403) y apaga la tarjeta del dia que se
  // corrio a proposito: el harness media una pantalla suprimida y llevaba meses en rojo por eso,
  // no por la tarjeta. A quien se le corre un dia es alguien que YA entrena, asi que el fixture
  // le da sesiones de SEMANAS ANTERIORES — nada de esta semana, para que rLeg (Lunes) siga
  // estando PERDIDA. (Sin comillas invertidas: esto viaja dentro de un template literal.)
  DB.history={ct1:[10,13,16,19].map(d=>{const iso=new Date(Date.now()-d*86400000).toISOString();
    return {id:'hm'+d,sessionId:'sm'+d,routineId:'rLeg',routineName:'Pierna',date:iso,finishedAt:iso,
            doneSets:4,totalSets:4,exercises:[]};})};
  DB.msgs=DB.msgs||{};
  CUR.clientId='ct1'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayWorking=null;
  try{ localStorage.removeItem('ax_missmute_ct1'); }catch(e){}
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return JSON.stringify({todayName, isMon:new Date().getDay()===1});
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`;

const setupRaw = await ev(RESET);
console.log('  setup:', setupRaw);
let ctx = {}; try { ctx = JSON.parse(setupRaw); } catch {}
const isMon = !!ctx.isMon;
const todayName = ctx.todayName || '';
await sleep(500);

// v503/v505: el entreno del día se OFRECE en el héroe de la cabecera cuando llega colapsado
// (v447) y se monta en el cuerpo cuando está abierto. Estos checks preguntan si el entreno SIGUE
// AHÍ para la persona, así que miran toda la pestaña — no el contenedor donde solía pintarse.
const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

if (isMon) {
  console.log('  ⚠️ HOY ES LUNES — no hay día pasado esta semana; la tarjeta correctamente NO sale.');
  const cardAbsent = await ev(`!document.querySelector('#cn-missday .card')`);
  check('MD0 (lunes) sin día perdido → tarjeta ausente (comportamiento correcto)', cardAbsent === true, 'absent=' + cardAbsent);
} else {
  // ── La tarjeta sale (rLeg 'Lunes' quedó atrás esta semana) ──
  const cardPresent = await ev(`!!document.querySelector('#cn-missday .card')`);
  const cardText = await ev(`(()=>{const c=document.querySelector('#cn-missday .card');return c?c.textContent:''})()`);
  const btns = await ev(`(()=>{const c=document.querySelector('#cn-missday .card');return c?[...c.querySelectorAll('button')].map(b=>b.textContent.trim()):[]})()`);
  check('MD1 la tarjeta #cn-missday aparece', cardPresent === true, 'card=' + cardPresent);
  check('MD2 nombra la rutina (Pierna) y su día (Lunes)', /Pierna/.test(cardText) && /Lunes/.test(cardText), JSON.stringify(cardText.slice(0, 70)));
  check('MD3 tres acciones: Entrenar hoy · Mover a hoy · Hoy no', btns.length === 3 && /Entrenar hoy/.test(btns[0]) && /Mover a hoy/.test(btns[1]) && /Hoy no/.test(btns[2]), JSON.stringify(btns));
  // El entreno de HOY (Empuje/PressBanca) sigue arriba; la tarjeta es un extra abajo (no lo pisa).
  const workoutStillThere = await ev(`/PressBanca/.test(document.getElementById('cn-today').textContent)`);
  check('MD4 el entreno de hoy NO se pierde: la tarjeta convive con él', workoutStillThere === true, 'today=' + workoutStillThere);

  // Para las CAPTURAS: variante de día de DESCANSO (sin rutina de hoy) → la tarjeta es el
  // contenido principal, arriba y visible sin scrollear el entreno (en día de entreno vive
  // bajo el pliegue, comprobado por MD1/MD4). No afecta las aserciones ya corridas.
  await ev(`(()=>{DB.clients[0].routines=[DB.clients[0].routines.find(r=>r.id==='rLeg')];CUR.todayOverride=null;CUR.trainAgain=false;renderClientToday(DB.clients[0]);const t=document.getElementById('cn-today');if(t)t.scrollTop=0;})()`);
  await sleep(400);
  const shotCard = await ev(`!!document.querySelector('#cn-missday .card')`);
  check('MD-shot la tarjeta también sale en día de descanso (contenido principal)', shotCard === true, 'card=' + shotCard);
  // Captura de viewport con la tarjeta llevada a la vista (vive en un scroller interno).
  const shotIV = async n => {
    await ev(`(()=>{const c=document.querySelector('#cn-missday');if(c)c.scrollIntoView({block:'center'});})()`);
    await sleep(350);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n);
  };
  await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(400); await shotIV('missday-claro');
  await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(400); await shotIV('missday-oscuro');
  await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300);

  // ── "Entrenar hoy" (override): abre Pierna hoy, el PLAN NO cambia (rLeg.day sigue 'Lunes') ──
  await ev(RESET); await sleep(400);
  await ev(`missTrainToday('rLeg')`); await sleep(500);
  const trOverride = await ev(`!!(CUR.todayOverride&&CUR.todayOverride.id==='rLeg')`);
  const trWorkout = await ev(`/Sentadilla/.test(document.getElementById('cn-today').textContent)`);
  const trPlanIntact = await ev(`DB.clients[0].routines.find(r=>r.id==='rLeg').day==='Lunes'`);
  const trCardGone = await ev(`!document.querySelector('#cn-missday .card')`);
  check('MD5 «Entrenar hoy» abre la rutina perdida como override (Sentadilla), plan INTACTO (rLeg sigue Lunes), tarjeta oculta', trOverride && trWorkout && trPlanIntact && trCardGone, JSON.stringify({ trOverride, trWorkout, trPlanIntact, trCardGone }));

  // ── "Mover a hoy en mi plan" (swap): rLeg→hoy, rToday→Lunes (día que dejó libre), persiste local ──
  await ev(RESET); await sleep(400);
  await ev(`missMoveToday('rLeg')`); await sleep(600);
  const mvLegToday = await ev(`DB.clients[0].routines.find(r=>r.id==='rLeg').day===${JSON.stringify(todayName)}`);
  const mvOccMoved = await ev(`DB.clients[0].routines.find(r=>r.id==='rToday').day==='Lunes'`);
  const mvWorkout = await ev(`/Sentadilla/.test(document.getElementById('cn-today').textContent)`);
  const mvCardGone = await ev(`!document.querySelector('#cn-missday .card')`);
  const mvPersisted = await ev(`(()=>{try{const c=JSON.parse(localStorage.getItem('ax_c'));const r=(c&&c[0]&&c[0].routines||[]).find(x=>x.id==='rLeg');return !!(r&&r.day===${JSON.stringify(todayName)});}catch(e){return false;}})()`);
  check('MD6 «Mover a hoy» hace el SWAP (rLeg→hoy, la que ocupaba hoy→Lunes) y lo persiste en ax_c', mvLegToday && mvOccMoved && mvPersisted, JSON.stringify({ mvLegToday, mvOccMoved, mvPersisted }));
  check('MD7 tras mover, HOY muestra la rutina movida (Sentadilla) y la tarjeta desaparece', mvWorkout && mvCardGone, JSON.stringify({ mvWorkout, mvCardGone }));

  // ── "Hoy no" (mute por semana): oculta la tarjeta y escribe ax_missmute ──
  await ev(RESET); await sleep(400);
  await ev(`missMute('rLeg')`); await sleep(500);
  const muteCardGone = await ev(`!document.querySelector('#cn-missday .card')`);
  const muteWritten = await ev(`(()=>{try{const m=JSON.parse(localStorage.getItem('ax_missmute_ct1'));return !!(m&&m.rLeg);}catch(e){return false;}})()`);
  check('MD8 «Hoy no» silencia la rutina esta semana (tarjeta oculta + ax_missmute escrito)', muteCardGone && muteWritten, JSON.stringify({ muteCardGone, muteWritten }));

  // ── Se calla si ya terminó de entrenar hoy (no encimar sobre "ya entrenaste") ──
  await ev(RESET); await sleep(300);
  await ev(`(()=>{const iso=new Date().toISOString();DB.history={ct1:[{id:'hf',sessionId:'sf',routineId:'rToday',routineName:'Empuje',date:iso,startedAt:iso,finishedAt:iso,totalVol:3000,doneSets:8,totalSets:8,exercises:[]}]};renderClientToday(DB.clients[0]);})()`);
  await sleep(500);
  const finCardGone = await ev(`!document.querySelector('#cn-missday .card')`);
  check('MD9 si ya terminó un entreno hoy, la tarjeta NO sale (no encima "ya entrenaste")', finCardGone === true, 'gone=' + finCardGone);

  // ── MD10 (reserva Fable v372): con una sesión PARCIAL EN CURSO de hoy (sin finishedAt) la tarjeta
  // NO sale — antes salía y "Mover a hoy" a media sesión escondía el entreno en curso (clase v367). ──
  await ev(RESET); await sleep(300);
  await ev(`(()=>{const iso=new Date().toISOString();DB.history={ct1:[{id:'hp',sessionId:'sp',routineId:'rToday',routineName:'Empuje',date:iso,startedAt:iso,totalVol:600,doneSets:1,totalSets:8,exercises:[]}]};renderClientToday(DB.clients[0]);})()`);
  await sleep(500);
  const partCardGone = await ev(`!document.querySelector('#cn-missday .card')`);
  const partWorkout = await ev(`/PressBanca/.test(document.getElementById('cn-today').textContent)`);
  check('MD10 con un entreno de HOY a media sesión (parcial) la tarjeta NO sale (no puede pisar el entreno)', partCardGone === true && partWorkout === true, JSON.stringify({ partCardGone, partWorkout }));
}

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── RESULTADOS «DÍA QUE SE CORRIÓ» (v368) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('shots en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
