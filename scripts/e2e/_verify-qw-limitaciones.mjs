// _verify-qw-limitaciones.mjs — LOS ENTRENAMIENTOS RÁPIDOS PASAN POR LAS LIMITACIONES (v726).
//
// Hueco n.º 6 del dictamen de Laura (8-ago), re-medido el 5-nov: la biblioteca de rápidos no consultaba
// `limitationsFor`, y un asesorado real con «hernia umbilical» hizo dos veces «Abdomen Express» con el crunch.
// Aquí, en la app montada y con CLICS reales: (1) CONTROL sin nota, la biblioteca completa y sin avisos;
// (2) con «hernia umbilical» Abdomen Express pierde el crunch, lo dice en su tarjeta y la sesión que arranca
// NO lo trae; (3) con la rodilla, el pliométrico (todo saltos) no se ofrece y se dice; (4) con el tobillo, la
// ventana del cardio no ofrece «Caminar o trotar» ni la escaladora y lo dice; (5) con un reporte de dolor
// (sin nota) pasa lo mismo que con la nota. Capturas claro/oscuro y con «Muy grande»; nada se sale de 360 px.
//
// Sin login ni red: monta la app local (la nube está sellada en localhost, v298) con una asesorada INVENTADA.
//   node scripts/e2e/_verify-qw-limitaciones.mjs      · exit 1 si algo falla · cero jsErrors
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8893, DBG = 9447;
const OUT = (process.env.QW_LIM_OUT || ((process.env.TEMP || '.') + '/avi-qw-limitaciones')).replace(/\\/g, '/');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/qwlim-' + Date.now(), '--no-first-run',
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
for (let i = 0; i < 90; i++) { if (await ev(`typeof renderClientToday==='function' && typeof openQuickWorkouts==='function' && !!window._aviUpdateBusy`)) break; await sleep(500); }
await sleep(1500);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const CID = 'qa-qwlim';

// notas = lo que escribió el coach o la persona; dolor = área de un reporte de dolor de hoy (o '').
const MONTAR = (tema, notas, dolor) => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  document.body.classList.toggle('dark', ${tema === 'oscuro'});
  document.documentElement.setAttribute('data-theme','${tema === 'oscuro' ? 'dark' : 'light'}');
  ${'{'}const r=document.getElementById('quickwo-room');if(r)r.classList.remove('on');}
  document.querySelectorAll('.mdbg.on').forEach(m=>m.classList.remove('on'));
  const client={id:'${CID}',name:'Prueba Rápidos',sex:'M',level:'Principiante',goal:'Recomposición',days:3,weight:78,height:172,age:34,
    notes:${JSON.stringify(notas)},
    painCare:${dolor ? `[{area:${JSON.stringify(dolor)},level:2,at:new Date().toISOString()}]` : '[]'},
    createdAt:'2026-06-01T10:00:00.000Z',startDate:'2026-06-01',habits:{water:{},steps:{}},
    routines:[{id:'rl1',name:'Pierna',day:['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()],restSec:90,reviewed:true,note:'',
      exercises:[Object.assign({},DB.exercises.find(e=>e.id==='e42'),{sets:3,reps:'12'})]}]};
  const d=n=>new Date(Date.now()-n*86400000).toISOString();
  DB.clients=[client];
  // Un entreno previo: sin él la app está en «modo día 1» y esconde la entrada a los rápidos.
  DB.history={'${CID}':[{id:'hl1',sessionId:'sl1',routineId:'rl1',routineName:'Pierna',date:d(3),finishedAt:d(3),doneSets:3,totalSets:3,totalVol:3600,
    exercises:[{id:'e42',name:'Hip Thrust con Barra',sets:Array.from({length:3},()=>({kg:'100',reps:'12',done:true}))}]}]};
  DB.prs={}; DB.bodyweight={}; DB.nutrition={}; DB.medidas={}; DB.photos={};
  CUR.clientId='${CID}'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^mood_/.test(k)).forEach(k=>localStorage.removeItem(k));
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  try{Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted',requestPermission:async()=>'granted'}});}catch(e){}
  showScreen('s-client'); cnTab('cn-today',document.querySelector('.cntab'),true);
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return {ok:true};
}catch(e){return {ok:false,err:e.message};}})()`;
const TAMANO = fs => `(()=>{ ${fs ? `document.documentElement.setAttribute('data-fs','${fs}')` : `document.documentElement.removeAttribute('data-fs')`}; return 1; })()`;
const BIBLIOTECA = `(async()=>{openQuickWorkouts(); await new Promise(r=>setTimeout(r,450));
  const cards=[...document.querySelectorAll('#quickwo-body .qw-card')];
  const de=nm=>cards.find(c=>c.querySelector('.qw-card-nm').textContent===nm);
  const t=(c,s)=>c&&c.querySelector(s)?c.querySelector(s).textContent:'';
  const nota=document.querySelector('#quickwo-body .qw-fit-note');
  const W=innerWidth;
  return {n:cards.length,esperadas:QUICK_WORKOUTS.length,nombres:cards.map(c=>t(c,'.qw-card-nm')),
    nota:nota?nota.textContent:'',
    absTag:t(de('Abdomen Express'),'.qw-card-tag'),absFit:t(de('Abdomen Express'),'.qw-card-fit'),
    fits:document.querySelectorAll('#quickwo-body .qw-card-fit').length,
    fuera:[...document.querySelectorAll('#quickwo-body .qw-card,#quickwo-body .qw-fit-note')].filter(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>W+0.5;}).length};})()`;
const CERRAR = `(()=>{document.querySelectorAll('.mdbg.on').forEach(m=>m.classList.remove('on'));const r=document.getElementById('quickwo-room');if(r)r.classList.remove('on');if(typeof _syncRoomBodyClass==='function')_syncRoomBodyClass();return 1;})()`;

await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });

// ── (1) CONTROL: sin nota ni dolor la biblioteca está completa y no dice nada ─────────────────────
let m = await ev(MONTAR('claro', '', ''));
check('CONTROL · se montó el asesorado', m && m.ok, JSON.stringify(m));
await sleep(900);
let s = await ev(BIBLIOTECA);
check('CONTROL · sin limitaciones: todas las tarjetas, ninguna nota, Abdomen Express con sus 5',
  s.n === s.esperadas && !s.nota && s.fits === 0 && s.absTag === '5 ejercicios', JSON.stringify(s));
await ev(CERRAR);

// ── (2) el caso real: «hernia umbilical» ────────────────────────────────────────────────────────
m = await ev(MONTAR('claro', 'hernia umbilical', '')); await sleep(900);
s = await ev(BIBLIOTECA);
// v727 · con la regla del abdomen (Laura Q6: hernia del abdomen = lumbar + abdomen y piso pélvico) también salen
// los escaladores y la plancha frontal, y «HIIT sin equipo» (todo impacto) deja de ofrecerse.
check('«hernia umbilical»: Abdomen Express queda en 2 (dead bug y plancha lateral) y lo dice; se esconden el HIIT sin equipo y el pliométrico',
  s.absTag === '2 ejercicios' && s.absFit === 'Quitamos 3 ejercicios por lo que nos contaste de tu zona lumbar y tu abdomen o tu suelo pélvico'
  && s.n === s.esperadas - 2 && !s.nombres.includes('Cardio Pliométrico') && !s.nombres.includes('HIIT sin equipo')
  && /tu zona lumbar/.test(s.nota) && /tu abdomen o tu suelo pélvico/.test(s.nota) && s.fuera === 0, JSON.stringify(s));
await foto('1-biblioteca-hernia-claro');
// Arranca con un CLIC real en la tarjeta y mira qué rutina quedó en «Hoy».
s = await ev(`(async()=>{const c=[...document.querySelectorAll('#quickwo-body .qw-card')].find(x=>/Abdomen Express/.test(x.textContent));
  if(!c)return {ok:false}; c.click(); await new Promise(r=>setTimeout(r,1300));
  const r=CUR.todayOverride; return {ok:!!r,id:r&&r.id,ids:r?r.exercises.map(e=>e.id):[],
    texto:(document.getElementById('cn-today')||{}).textContent.includes('Crunch Abdominal')};})()`);
check('🔴 la sesión que arranca NO trae el crunch (e18), ni escaladores ni plancha frontal; sí el dead bug y la plancha lateral',
  s.ok && s.id === 'qw_abs_casa' && !s.ids.includes('e18') && s.ids.join(',') === 'e72,e49' && !s.texto, JSON.stringify(s));
await ev(CERRAR);

// ── (3) rodilla: el pliométrico (todo saltos) no se ofrece ──────────────────────────────────────
m = await ev(MONTAR('claro', 'me duele la rodilla, menisco', '')); await sleep(900);
s = await ev(BIBLIOTECA);
check('rodilla: «Cardio Pliométrico» no aparece y la nota lo dice',
  !s.nombres.includes('Cardio Pliométrico') && s.n === s.esperadas - 1 && /No te mostramos «Cardio Pliométrico»: no va con lo que nos contaste de tu rodilla\./.test(s.nota) && s.fuera === 0, JSON.stringify(s));
await ev(CERRAR);

// ── (4) tobillo: la ventana del cardio pierde lo de impacto ─────────────────────────────────────
m = await ev(MONTAR('claro', 'esguince de tobillo', '')); await sleep(900);
await ev(`openQuickWorkouts()`); await sleep(350);
s = await ev(`(async()=>{const c=[...document.querySelectorAll('#quickwo-body .qw-card')].find(x=>/Cardio a tu ritmo/.test(x.textContent));
  if(!c)return {ok:false}; c.click(); await new Promise(r=>setTimeout(r,450));
  const ops=[...document.querySelectorAll('#qwcardio-list .qwc-opt')].map(o=>o.querySelector('b').textContent);
  const nota=document.querySelector('#qwcardio-list .qw-fit-note');
  return {ok:document.getElementById('m-qwcardio').classList.contains('on'),ops,nota:nota?nota.textContent:''};})()`);
check('tobillo: el cardio no ofrece «Caminar o trotar» ni la escaladora, conserva bici y elíptica, y lo dice',
  s.ok && !s.ops.includes('Caminar o trotar') && !s.ops.includes('Escaladora') && s.ops.includes('Bicicleta estática') && s.ops.includes('Elíptica')
  && /No te mostramos «Caminar o trotar» ni «Escaladora»: no van con lo que nos contaste de tu tobillo\./.test(s.nota), JSON.stringify(s));
await foto('2-cardio-tobillo-claro');
await ev(CERRAR);

// ── (5) el REPORTE de dolor (sin nota) filtra igual ─────────────────────────────────────────────
m = await ev(MONTAR('claro', '', 'rodilla')); await sleep(900);
s = await ev(BIBLIOTECA);
check('reporte de dolor de rodilla, sin nota: el pliométrico tampoco se ofrece', !s.nombres.includes('Cardio Pliométrico') && /tu rodilla/.test(s.nota), JSON.stringify(s));
await ev(CERRAR);

// ── Capturas: oscuro y «Muy grande», con dos zonas a la vez (la nota más larga) ──────────────────
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
m = await ev(MONTAR('oscuro', 'hernia umbilical y dolor de rodilla', '')); await sleep(900);
s = await ev(BIBLIOTECA);
check('oscuro, lumbar + rodilla: nada se sale de los 360 px', s.fuera === 0 && s.nota.length > 0, JSON.stringify({ fuera: s.fuera, nota: s.nota }));
await foto('3-biblioteca-oscuro');
await ev(CERRAR);
await ev(TAMANO('xl'));
m = await ev(MONTAR('oscuro', 'hernia umbilical y dolor de rodilla', '')); await sleep(900);
s = await ev(BIBLIOTECA);
check('«Muy grande»: nada se sale de los 360 px', s.fuera === 0, JSON.stringify({ fuera: s.fuera }));
await foto('4-biblioteca-oscuro-xl');
await ev(CERRAR);
await ev(TAMANO(''));

for (const r of results) console.log(r);
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log('capturas: ' + OUT);
const fallas = results.filter(r => r.startsWith('❌')).length;
console.log(fallas === 0 && jsErrors.length === 0 ? `\nTODO OK (${results.length}/${results.length})` : `\n${fallas} FALLA(S)`);
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fallas === 0 && jsErrors.length === 0 ? 0 : 1);
