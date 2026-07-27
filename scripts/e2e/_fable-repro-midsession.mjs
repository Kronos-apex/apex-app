// _fable-repro-midsession.mjs — regresión del bug que Fable cazó en v366 y se corrigió en v367:
// la tarjeta "Ya entrenaste hoy" se comía el guiado EMBEBIDO a MEDIA SESIÓN. El auto-guardado
// PARCIAL (updateClientProgress → saveSessionToHistory desde la 1ª serie) hacía trainedToday=true
// en plena sesión; cualquier renderClientToday sin timer vivo (gmChangeMood, todayMoveEx, poll con
// plan cambiado) pasaba por el corto-circuito. El fix: finishedTrainingToday exige sesión FINALIZADA
// (finishedAt), no una parcial. Este harness ASERTA card:false a media sesión (A/B/C/D) y card:true
// solo cuando la sesión se FINALIZA. Aserciones duras (exit 1).
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8798;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9301', '--user-data-dir=' + process.env.TEMP + '/rms-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9301/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await waitFor(`!!document.getElementById('s-login') && typeof renderClientToday==='function' && !document.getElementById('avi-loading')`);
await sleep(2000);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };
const cardNow = () => ev(`!!document.querySelector('#cn-today-body .trained-card')`);

const setup = await ev(`(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,n)=>Math.max(m,n.v),0)));
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const todayName=days[new Date().getDay()];
  Object.keys(localStorage).filter(k=>k.includes('rMid')).forEach(k=>localStorage.removeItem(k));
  const client={id:'ct9',name:'Repro',sex:'M',level:'Intermedio',goal:'Ganar músculo',days:4,
    routines:[{id:'rMid',day:todayName,name:'Rutina Hoy',restSec:90,exercises:[
      {id:'e1',name:'Sentadilla',muscle:'Pierna',type:'Compuesto',sets:3,reps:'10'},
      {id:'e2',name:'Prensa',muscle:'Pierna',type:'Compuesto',sets:3,reps:'10'}]}],
    habits:{water:{},steps:{}}};
  DB.clients=[client]; DB.history={ct9:[]}; DB.msgs=DB.msgs||{};
  CUR.clientId='ct9'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayWorking=null; CUR.todayDirty=false;
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return JSON.stringify({embedded:_gmIsEmbedded(), card:!!document.querySelector('#cn-today-body .trained-card')});
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})()`);
console.log('SETUP (sin historial, guiado embebido, sin tarjeta):', setup);
check('SETUP: guiado embebido y sin tarjeta', /"embedded":true/.test(setup) && /"card":false/.test(setup), setup);
await sleep(600);

// Paso 1: marcar la 1ª serie por el camino REAL parcial (setDone + updateClientProgress).
const marked = await ev(`(()=>{
  const r=CUR.activeRoutine||DB.clients[0].routines[0];
  localStorage.setItem('log_'+r.id+'_0_0_kg','60'); localStorage.setItem('log_'+r.id+'_0_0_reps','10');
  setDone(r.id,0,0,true);
  updateClientProgress(r); // ← auto-guardado PARCIAL (app-4:1385)
  const h=(DB.history[CUR.clientId]||[])[0];
  return JSON.stringify({histToday:!!h && typeof localDayStart==='function' && localDayStart(h.date)===localDayStart(new Date()),
    doneSets:h&&h.doneSets, finishedAt:!!(h&&h.finishedAt), finishedTrainingToday:finishedTrainingToday(DB.history[CUR.clientId],new Date()),
    liveTimer:!!(GM.restTimer||GM.hiit||GM.holding)});
})()`);
console.log('PASO 1 — 1ª serie marcada (parcial guardado):', marked);
check('PASO 1: parcial de hoy SIN finishedAt y finishedTrainingToday=false', /"histToday":true/.test(marked) && /"finishedAt":false/.test(marked) && /"finishedTrainingToday":false/.test(marked), marked);

// REPRO A: "Cambiar cómo me siento" desde el guiado embebido, sin timer vivo.
await ev(`gmChangeMood()`); await sleep(300);
let cA = await cardNow(); let wA = await ev(`/Sentadilla/.test(document.getElementById('cn-today-body').textContent)`);
check('REPRO A: gmChangeMood a media sesión NO muestra la tarjeta (sigue el entreno)', cA === false && wA === true, 'card=' + cA + ' workout=' + wA);

// reset para repro B (re-render limpio manteniendo el parcial)
await ev(`(()=>{CUR.trainAgain=true;renderClientToday(DB.clients[0]);CUR.trainAgain=false;})()`); await sleep(300);
// REPRO B: reordenar un ejercicio (gmMoveEx→todayMoveEx) a media sesión.
await ev(`todayMoveEx(0,1)`); await sleep(300);
let cB = await cardNow();
check('REPRO B: todayMoveEx (reordenar/dolor) a media sesión NO muestra la tarjeta', cB === false, 'card=' + cB);

// reset y REPRO C: poll — el coach cambió el plan (app-1:647 renderClientToday directo)
await ev(`(()=>{CUR.trainAgain=true;renderClientToday(DB.clients[0]);CUR.trainAgain=false;CUR.todayWorking=null;CUR.todayDirty=false;})()`); await sleep(300);
await ev(`renderClientToday(DB.clients[0])`); await sleep(300);
let cC = await cardNow();
check('REPRO C: poll con plan cambiado a media sesión NO muestra la tarjeta', cC === false, 'card=' + cC);

// CONTROL D: con timer de descanso VIVO el guard de arriba SÍ protege (no re-renderiza)
await ev(`(()=>{CUR.trainAgain=true;renderClientToday(DB.clients[0]);CUR.trainAgain=false;})()`); await sleep(300);
let cD = await ev(`(()=>{GM.restTimer=setTimeout(()=>{},60000);renderClientToday(DB.clients[0]);const r=!!document.querySelector('#cn-today-body .trained-card');clearTimeout(GM.restTimer);GM.restTimer=null;return r;})()`);
check('CONTROL D: con timer vivo tampoco aparece la tarjeta (guard F2 sub-3)', cD === false, 'card=' + cD);

// POSITIVO: al FINALIZAR el entreno (finishedAt) SÍ debe aparecer la tarjeta en el siguiente render.
const fin = await ev(`(()=>{
  const r=CUR.activeRoutine||DB.clients[0].routines[0];
  window.confirm=()=>true; CUR.trainAgain=false;
  finishSessionEarly(); // marca finishedAt (fin temprano con 1 serie)
  const h=(DB.history[CUR.clientId]||[]).find(x=>x.routineId===r.id);
  renderClientToday(DB.clients[0]);
  return JSON.stringify({finishedAt:!!(h&&h.finishedAt), card:!!document.querySelector('#cn-today-body .trained-card')});
})()`); await sleep(300);
console.log('POSITIVO — tras finalizar:', fin);
check('POSITIVO: al FINALIZAR (finishedAt) la tarjeta "ya entrenaste" SÍ aparece', /"finishedAt":true/.test(fin) && /"card":true/.test(fin), fin);

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── REGRESIÓN MID-SESIÓN (fix v367) ────');
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
