// _shot-trained.mjs — "Ya entrenaste hoy" (v366): cuando el asesorado YA entrenó hoy, la pantalla
// Hoy colapsa el entrenamiento en una tarjeta compacta (agua/pasos a la mano). Sin login: sintetiza
// un asesorado con UNA sesión de HOY (de otra rutina, para probar que CUALQUIER entreno cuenta) y
// llama renderClientToday directo. Aserciones duras (exit 1) + capturas claro/oscuro a 390px.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8799, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9300', '--user-data-dir=' + process.env.TEMP + '/trn-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9300/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
await waitFor(`!!document.getElementById('s-login') && typeof renderClientToday==='function' && !document.getElementById('avi-loading')`);
await sleep(2000);

const setup = await ev(`(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof setTheme==='function')setTheme('light');
  // marcar novedades vistas para que el tour NO tape la captura (gotcha reusable)
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  const client={id:'ct1',name:'Camilo',sex:'M',level:'Intermedio',goal:'Ganar músculo',days:4,
    routines:[{id:'r1',day:'Lunes',name:'Pierna',restSec:90,exercises:[{id:'e1',name:'Sentadilla',muscle:'Pierna',type:'Compuesto',sets:4,reps:'10'}]}],
    habits:{water:{},steps:{}}};
  DB.clients=[client];
  const iso=new Date().toISOString(); // sesión FINALIZADA de HOY (finishedAt), rutina de OTRO día (Espalda),
  // finalizada TEMPRANO (doneSets<totalSets) → prueba que la marca finishedAt, no el 100%, dispara la tarjeta
  DB.history={ct1:[{id:'h1',sessionId:'s1',routineId:'rEspalda',routineName:'Espalda',date:iso,startedAt:iso,finishedAt:iso,totalVol:3200,doneSets:6,totalSets:8,exercises:[]}]};
  DB.msgs=DB.msgs||{};
  CUR.clientId='ct1'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null;
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false); // cerrar el tour si alcanzó a abrirse
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`);
console.log('  setup:', setup);
await sleep(500);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

const cardPresent = await ev(`!!document.querySelector('#cn-today-body .trained-card')`);
const cardText = await ev(`(()=>{const c=document.querySelector('#cn-today-body .trained-card');return c?c.textContent:''})()`);
// v504: los hábitos abren como TIRA de chips (el bloque completo queda a un toque). Lo que este
// check protege —que el agua y los pasos sigan A LA MANO el día que ya entrenó, sin scrollear—
// vale igual con la tira; por eso se acepta cualquiera de las dos formas.
const habitsPresent = await ev(`!!document.querySelector('#cn-habits .hb-strip, #cn-habits .hb-card')`);
const noWorkout = await ev(`!/Sentadilla/.test(document.getElementById('cn-today-body').textContent)`);
check('T1 la tarjeta «Ya entrenaste» reemplaza el entrenamiento', cardPresent === true, 'card=' + cardPresent);
check('T2 el título dice que ya entrenó', /Ya entrenaste hoy/.test(cardText), JSON.stringify(cardText.slice(0, 40)));
check('T3 muestra QUÉ entrenó (cualquier rutina cuenta: «Espalda»)', /Espalda/.test(cardText), /Espalda/.test(cardText) + '');
check('T4 agua/pasos siguen a la mano (tarjeta de hábitos presente)', habitsPresent === true, 'habits=' + habitsPresent);
check('T5 el entrenamiento completo NO se pinta (sin «Sentadilla»)', noWorkout === true, 'noWorkout=' + noWorkout);

await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(400); await shot('trained-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(400); await shot('trained-oscuro');
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(300);

// "Entrenar otra vez" → la tarjeta desaparece y vuelve el entrenamiento (2ª sesión del día)
await ev(`todayTrainAgain()`);
await sleep(600);
const cardGone = await ev(`!document.querySelector('#cn-today-body .trained-card')`);
check('T6 «Entrenar otra vez» quita la tarjeta y muestra el entreno', cardGone === true, 'gone=' + cardGone);

// T7 (cobertura del override, radar Fable #2): si abre una rutina a propósito (override), la tarjeta
// NO debe salir aunque ya haya finalizado hoy — quiere entrenar ESA. Mata el sabotaje "quitar !overrideRoutine".
await ev(`(()=>{CUR.trainAgain=false;const c=DB.clients[0];renderClientToday(c,c.routines[0]);})()`);
await sleep(500);
const t7card = await ev(`!!document.querySelector('#cn-today-body .trained-card')`);
const t7workout = await ev(`/Sentadilla/.test(document.getElementById('cn-today-body').textContent)`);
check('T7 con override (abrió una rutina) NO sale la tarjeta y se pinta el entreno', t7card === false && t7workout === true, 'card=' + t7card + ' workout=' + t7workout);

// T8 (EL FIX, radar Fable #1): una sesión PARCIAL en curso hoy (marcó 1 serie, SIN finishedAt) NO
// dispara la tarjeta — el asesorado sigue entrenando y debe poder continuar, no ver "ya entrenaste".
await ev(`(()=>{const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];const c=DB.clients[0];c.routines[0].day=days[new Date().getDay()];const iso=new Date().toISOString();DB.history={ct1:[{id:'hp',sessionId:'sp',routineId:c.routines[0].id,routineName:'Pierna',date:iso,startedAt:iso,totalVol:600,doneSets:1,totalSets:4,exercises:[]}]};CUR.trainAgain=false;CUR.todayOverride=null;CUR.todayWorking=null;renderClientToday(c);})()`);
await sleep(500);
// v503: el entreno colapsado se pinta en la CABECERA (héroe de la dirección B), no en
// `#cn-today-body`. Se busca el ejercicio en toda la pestaña, que es lo que la persona ve —
// así el check sirve con el héroe y con el guiado montado, y no con una tarjeta de «ya
// entrenaste» que es justo lo que no debe salir.
const t8card = await ev(`!!document.querySelector('#cn-today .trained-card')`);
const t8workout = await ev(`/Sentadilla/.test(document.getElementById('cn-today').textContent)`);
check('T8 parcial en curso (sin finishedAt) NO dispara la tarjeta; sigue el entreno', t8card === false && t8workout === true, 'card=' + t8card + ' workout=' + t8workout);

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── RESULTADOS «YA ENTRENASTE HOY» (v366) ────');
results.forEach(r => console.log('  ' + r));
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('shots en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
