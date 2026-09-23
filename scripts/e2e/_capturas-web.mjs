// _capturas-web.mjs — GENERA las 6 capturas de la app que muestra la web de venta (avi-web/public/shots).
// Decisión del PO (23-sep): las que había eran del 27-jun (diseño viejo, un día de descanso, una
// decía «Borrador generado automáticamente») y saludaban a un asesorado MENOR de edad en una página
// pública. Se regeneran con la app actual y una asesorada INVENTADA («Mariana»): ningún dato de una
// persona real sale en la web.
// Cada pantalla corresponde a su rótulo en la web: saludo · ¿cómo te sientes? · plan · guiado ·
// ficha del ejercicio · progreso. 804×1720 (402×860 a doble densidad), tema oscuro, como las de antes.
// 🔒 Sin login ni red: todo corre en local y la escritura a la nube está sellada en localhost (v298).
// Corre: node scripts/e2e/_capturas-web.mjs   → scripts/_shots-web/*.png  (MIRARLAS antes de publicar)
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8836, DBG = 9356, RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app', OUT = RAIZ + '/scripts/_shots-web';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/shotsweb-' + Date.now(), '--no-first-run', '--window-size=402,860', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params?.exceptionDetails?.exception?.description || 'exception').split('\n')[0]); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 402, height: 860, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
// En un teléfono las barras de desplazamiento flotan y se esconden; en Chrome de escritorio no.
await send('Emulation.setScrollbarsHidden', { hidden: true });
if (!await waitFor(`typeof renderClientToday==='function' && typeof openExDetail==='function' && !document.getElementById('avi-loading')`)) { console.log('🔴 la app no arrancó'); process.exit(1); }
await sleep(1800);

// (sin comillas invertidas dentro: va en un template literal)
const MONTAR = `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  // El botón flotante de instalar no es parte de lo que se ve a diario con la app instalada.
  const st=document.createElement('style');st.textContent='#install-banner,#install-pill,.install-pill,#ios-install{display:none!important}';document.head.appendChild(st);
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  const lib=DB.exercises||[];
  const pick=(re,fb)=>{const e=lib.find(x=>re.test(x.name)&&(typeof exImgSrc!=='function'||exImgSrc(x)));return e||lib.find(x=>x.id===fb);};
  const conDosis=(e,sets,reps)=>Object.assign({},e,{sets,reps:String(reps)});
  const pierna=[conDosis(pick(/^Hip Thrust con Barra/i,'e56'),4,10),conDosis(pick(/^Sentadilla con Barra/i,'e3'),4,8),
    conDosis(pick(/^Prensa de Pierna/i,'e6'),3,12),conDosis(pick(/^Peso Muerto Rumano/i,'e9'),3,10),
    conDosis(pick(/Abducci[oó]n de Cadera en M[aá]quina/i,'e61'),3,15),conDosis(pick(/Curl Femoral/i,'e8'),3,12)].filter(Boolean);
  const torso=[conDosis(pick(/^Jal[oó]n al Pecho/i,'e4'),4,10),conDosis(pick(/^Press de Banca con Mancuernas/i,'e2'),3,10),
    conDosis(pick(/^Remo Sentado en Polea/i,'e5'),3,12),conDosis(pick(/^Elevaciones Laterales/i,'e27'),3,15)].filter(Boolean);
  const client={id:'demo-web',name:'Mariana',sex:'F',level:'Intermedio',goal:'Perder grasa',days:3,weight:61,height:164,age:29,
    activityFactor:1.55,createdAt:'2026-06-10T10:00:00.000Z',startDate:'2026-06-10',
    routines:[{id:'rw1',name:'Glúteo y pierna',day:hoy,restSec:90,reviewed:true,note:'',exercises:pierna},
              {id:'rw2',name:'Espalda y hombros',day:days[(new Date().getDay()+2)%7],restSec:75,reviewed:true,exercises:torso}],
    habits:{water:{},steps:{}}};
  // Tres meses de entrenos con progresión real de carga (lo que la web promete: «mide tu progreso»).
  const hist=[]; const prs={}; const base={}; pierna.forEach((e,i)=>base[e.id]=[40,50,90,40,30,25][i]||20);
  for(let s=0;s<22;s++){
    const d=new Date(Date.now()-(3+s*4)*86400000).toISOString();
    const avance=(21-s)/21;
    const exs=pierna.map(e=>{const kg=Math.round((base[e.id]*(0.7+0.3*avance))/2.5)*2.5;
      if(!prs[e.id]||kg>prs[e.id].kg)prs[e.id]={kg,reps:+e.reps,date:d,name:e.name};
      return {id:e.id,name:e.name,sets:Array.from({length:e.sets},()=>({kg,reps:+e.reps,done:true}))};});
    const vol=exs.reduce((a,x)=>a+x.sets.reduce((b,y)=>b+y.kg*y.reps,0),0);
    hist.push({id:'hw'+s,sessionId:'sw'+s,routineId:'rw1',routineName:'Glúteo y pierna',date:d,finishedAt:d,doneSets:19,totalSets:19,
      totalVol:vol,duration:3300,kcal:310,exercises:exs});
  }
  // El peso con el MISMO formato que escribe la app (logBodyWeight: 'YYYY-MM-DD') y por el MISMO motor.
  let bw=[];for(let w=11;w>=0;w--){const d=new Date(Date.now()-w*7*86400000);bw=bwUpsert(bw,d.toISOString().split('T')[0],+(61+w*0.27).toFixed(1),d.toISOString());}
  DB.clients=[client]; DB.history={'demo-web':hist}; DB.prs={'demo-web':prs}; DB.bodyweight={'demo-web':bw};
  let med=[]; const hace=d=>new Date(Date.now()-d*86400000).toISOString();
  med=medUpsert(med,{cintura:79,cadera:102,muslo_izq:59,muslo_der:59.4,brazo_izq:28.6,brazo_der:28.8,pecho:91},hace(58))||med;
  med=medUpsert(med,{cintura:75,cadera:99.5,muslo_izq:57.5,muslo_der:57.8,brazo_izq:28.4,brazo_der:28.6,pecho:90},hace(3))||med;
  DB.nutrition={}; DB.medidas={'demo-web':med}; DB.photos={};
  CUR.clientId='demo-web'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^mood_|^wshow_|^wuopen_|^ax_hbopen_|^coachmute_|^ax_missmute_|^ax_news_seen|^ax_push_snooze|^ax_cmtynudge/.test(k)).forEach(k=>localStorage.removeItem(k));
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  try{Object.defineProperty(window,'Notification',{configurable:true,value:{permission:'granted',requestPermission:async()=>'granted'}});}catch(e){}
  try{ localStorage.setItem('ax_cn','Andrés Martínez'); }catch(e){}
  showScreen('s-client');
  cnTab('cn-today',document.querySelector('.cntab'),true);
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return {ok:true,pierna:pierna.map(e=>e.name),torso:torso.map(e=>e.name)};
}catch(e){return {ok:false,err:e.message+' | '+((e.stack||'').split('\\n')[1]||'')};}})()`;

const foto = async (nombre) => { await sleep(900); const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${nombre}.png`, Buffer.from(r.data, 'base64')); console.log('  📸 ' + nombre); };
const scrollA = (sel, bloque = 'start', extra = 0) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.scrollIntoView({block:'${bloque}'});const s=e.closest('.cnbody,.cnp,.sroom-body')||document.scrollingElement;if(s&&${extra})s.scrollTop+=${extra};return true;})()`);

const m = await ev(MONTAR);
console.log('montaje:', JSON.stringify(m));
if (!m || !m.ok) process.exit(1);
await sleep(1200);
// 1 · te recibe por tu nombre (el héroe con el entreno de hoy)
await foto('app-saludo');
// 2 · ¿cómo te sientes hoy? (al empezar el entreno)
await ev(`(()=>{ if(typeof expandTodayWorkout==='function')expandTodayWorkout(); return 1; })()`); await sleep(1500);
console.log('  selector visible:', await scrollA('.checkin-card', 'start', -70));
await foto('app-sientes');
// 4 · te guía serie por serie (tras elegir «Bien»)
await ev(`(()=>{ const b=[...document.querySelectorAll('.mood-btn')][0]; if(b)b.click(); return 1; })()`); await sleep(1600);
console.log('  guiado visible:', await scrollA('.gm-ex-card.active', 'start', -74));
console.log('  sugerido:', await ev(`(()=>{const c=document.querySelector('.gm-ex-card.active');return c?(c.innerText.match(/Peso sugerido[^\n]*|Repite[^\n]*|Sube[^\n]*/)||['(ninguno)'])[0]:'sin tarjeta';})()`));
await foto('app-guiado');
// 5 · sin tecnicismos raros (cómo respirar, al empezar un ejercicio)
await ev(`(()=>{ gmShowStartCard(GM.exercises[0]); return 1; })()`); await sleep(1200);
await foto('app-explica');
await ev(`(()=>{ closeStartCard(); return 1; })()`); await sleep(600);
// 3 · tu plan, clarísimo (la rutina de hoy desplegada en «Rutinas»: ejercicios, series, descanso)
await ev(`(()=>{ const t=[...document.querySelectorAll('.cntab')].find(x=>/Rutinas/.test(x.textContent)); cnTab('cn-routines',t); return 1; })()`); await sleep(1400);
console.log('  rutina abierta:', await ev(`(()=>{ const rc=document.querySelector('#cn-all-rut .rc'); if(!rc)return false; rc.classList.add('open'); return rc.classList.contains('open'); })()`));
await sleep(700);
console.log('  plan visible:', await scrollA('#cn-all-rut .rc', 'start', -80));
await foto('app-plan');

// 6 · mide tu progreso (peso y medidas, en el perfil)
await ev(`(()=>{ const t=[...document.querySelectorAll('.cntab')].find(x=>/Perfil/.test(x.textContent)); cnTab('cn-profile',t); return 1; })()`); await sleep(1800);
console.log('  peso visible:', await ev(`(()=>{const w=document.getElementById('bw-chart-wrap');const c=w&&w.closest('.card');if(!c)return false;c.scrollIntoView({block:'start'});const s=c.closest('.cnbody,.cnp')||document.scrollingElement;if(s)s.scrollTop-=76;return true;})()`));
console.log('  desborde lista peso:', await ev(`(()=>{const l=document.getElementById('bw-list');return l?(l.scrollWidth-l.clientWidth):null;})()`));
console.log('  fechas:', await ev(`(()=>{const l=document.getElementById('bw-list');return l?(/Invalid/.test(l.innerText)?'INVALID':'ok'):'sin lista';})()`));
await foto('app-progreso');
console.log('jsErrors:', JSON.stringify(jsErrors.slice(0, 5)));
try { ws.close(); } catch {} chrome.kill(); srv.kill();
