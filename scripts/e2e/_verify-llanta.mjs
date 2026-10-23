// _verify-llanta.mjs — EL VOLTEO DE LLANTA EN LA APP (v719).
//
// 1) Una biblioteca VIEJA del teléfono (sin e382) la recibe sola al arrancar (`migrateExercises`), con su
//    modalidad y su nivel. 2) En el guiado la casilla dice VOLTEOS, no pide KG ni ofrece «+ Lastre». El
//    CONTROL pone una lagartija en la misma rutina: ahí SÍ tiene que aparecer el lastre (si no, la sonda no
//    discrimina). Capturas claro/oscuro y con «Muy grande».
//
// Sin login ni red: monta la app local (la nube está sellada en localhost, v298) con una asesorada INVENTADA.
//   node scripts/e2e/_verify-llanta.mjs      · exit 1 si algo falla · cero jsErrors
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8891, DBG = 9445;
const OUT = (process.env.LLANTA_OUT || ((process.env.TEMP || '.') + '/avi-llanta')).replace(/\\/g, '/');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu',
  '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/llanta-' + Date.now(), '--no-first-run',
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
const CID = 'qa-llanta';

// 1) Biblioteca vieja → la llanta llega sola, completa.
let s = await ev(`(()=>{const antes=DB.exercises;DB.exercises=defaultExercises.filter(e=>e.id!=='e382').map(e=>Object.assign({},e));
  const sin=!DB.exercises.some(e=>e.id==='e382');migrateExercises();const ll=DB.exercises.find(e=>e.id==='e382');
  const r={sin,llego:!!ll,track:ll&&exTrack(ll),nivel:ll&&exLevel(ll),unidad:ll&&repsUnitOf(ll),total:DB.exercises.length,catalogo:defaultExercises.length};
  return r;})()`);
check('una biblioteca vieja recibe la llanta sola al arrancar (volteos, nivel A)', s.sin && s.llego && s.track === 'reps' && s.nivel === 'A' && s.unidad === 'volteos' && s.total === s.catalogo, JSON.stringify(s));

const MONTAR = tema => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  try{if(typeof closeWorkoutFinish==='function')closeWorkoutFinish();}catch(e){}
  document.body.classList.toggle('dark', ${tema === 'oscuro'});
  document.documentElement.setAttribute('data-theme','${tema === 'oscuro' ? 'dark' : 'light'}');
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const cat=id=>Object.assign({},DB.exercises.find(e=>e.id===id));
  // La lagartija va de CONTROL: cuenta reps de peso corporal y ahí el lastre SÍ tiene que salir.
  const lagartija=DB.exercises.find(e=>exTrack(e)==='reps'&&lastreApplies(e));
  const client={id:'${CID}',name:'Prueba Llanta',sex:'M',level:'Avanzado',goal:'Fuerza',days:3,weight:80,height:175,age:30,
    createdAt:'2026-06-01T10:00:00.000Z',startDate:'2026-06-01',habits:{water:{},steps:{}},
    routines:[{id:'rl1',name:'Funcional',day:days[new Date().getDay()],restSec:150,reviewed:true,note:'Llanta de 100 kg',
      exercises:[cat('e382'),Object.assign({},lagartija)]}]};
  const d=n=>new Date(Date.now()-n*86400000).toISOString();
  DB.clients=[client];
  DB.history={'${CID}':[{id:'hl1',sessionId:'sl1',routineId:'rl1',routineName:'Funcional',date:d(3),finishedAt:d(3),doneSets:3,totalSets:3,totalVol:0,
    exercises:[{id:'e382',name:'Volteo de Llanta (Tire Flip)',track:'reps',sets:Array.from({length:3},()=>({reps:'5',done:true}))}]}]};
  DB.prs={}; DB.bodyweight={}; DB.nutrition={}; DB.medidas={}; DB.photos={};
  CUR.clientId='${CID}'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^mood_|^lastre_/.test(k)).forEach(k=>localStorage.removeItem(k));
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  try{Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted',requestPermission:async()=>'granted'}});}catch(e){}
  showScreen('s-client'); cnTab('cn-today',document.querySelector('.cntab'),true);
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  if(typeof expandTodayWorkout==='function')expandTodayWorkout();
  return {ok:true,control:lagartija&&lagartija.name};
}catch(e){return {ok:false,err:e.message};}})()`;
const TAMANO = fs => `(()=>{ ${fs ? `document.documentElement.setAttribute('data-fs','${fs}')` : `document.documentElement.removeAttribute('data-fs')`}; return 1; })()`;
const MEDIR = `(()=>{const card=n=>document.getElementById('gm-ex-'+n);
  const info=n=>{const c=card(n);if(!c)return null;const W=innerWidth;
    return {labels:[...c.querySelectorAll('.gm-sinput-label')].map(l=>l.textContent.trim()),
      kg:c.querySelectorAll('.gm-sinput[data-field="kg"]').length,
      lastre:[...c.querySelectorAll('button')].some(b=>/Lastre/.test(b.textContent)),
      nombre:(c.textContent.match(/Volteo de Llanta[^\\n]*?\\)/)||[''])[0],
      fuera:[...c.querySelectorAll('.gm-sinput')].filter(i=>{const r=i.getBoundingClientRect();return r.left<0||r.right>W+0.5;}).length};};
  return {llanta:info(0),control:info(1)};})()`;

for (const [tema, fs, funcional] of [['claro', '', true], ['oscuro', '', false], ['claro', 'xl', false], ['oscuro', 'xl', false]]) {
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema === 'oscuro' ? 'dark' : 'light' }] });
  await ev(TAMANO(fs));
  const m = await ev(MONTAR(tema));
  const sufijo = tema + (fs ? '-' + fs : '');
  if (funcional) check('CONTROL · se montó la asesorada con la llanta y una lagartija', m && m.ok && !!m.control, JSON.stringify(m));
  await sleep(1300);
  await ev(`(()=>{ const b=[...document.querySelectorAll('.mood-btn')][0]; if(b)b.click(); return 1; })()`); await sleep(1300);
  s = await ev(MEDIR);
  const ll = s.llanta || {}, ct = s.control || {};
  if (funcional) {
    check('la casilla de la llanta dice VOLTEOS y no pide KG', ll.labels && ll.labels.length >= 1 && ll.labels.every(l => l === 'VOLTEOS') && ll.kg === 0, JSON.stringify(ll));
    check('a la llanta no se le ofrece «+ Lastre»', ll.lastre === false, JSON.stringify(ll));
    check('🔒 CONTROL · la lagartija de la misma rutina SÍ ofrece «+ Lastre» y dice REPS', ct.lastre === true && (ct.labels || []).includes('REPS'), JSON.stringify(ct));
  }
  check(`${sufijo}: ninguna casilla de la llanta se sale de la pantalla`, ll.labels && ll.fuera === 0, JSON.stringify(ll));
  await ev(`(()=>{const e=document.getElementById('gm-ex-0');if(e)e.scrollIntoView({block:'start'});return 1;})()`); await sleep(400);
  await foto('llanta-' + sufijo);
}
await ev(TAMANO(''));

for (const r of results) console.log(r);
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log('capturas: ' + OUT);
const fallas = results.filter(r => r.startsWith('❌')).length;
console.log(fallas === 0 && jsErrors.length === 0 ? `\nTODO OK (${results.length}/${results.length})` : `\n${fallas} FALLA(S)`);
try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fallas === 0 && jsErrors.length === 0 ? 0 : 1);
