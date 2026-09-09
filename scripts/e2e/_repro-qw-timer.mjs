// REPRO: ¿qué pasa si se arranca un ENTRENAMIENTO RÁPIDO con un temporizador vivo?
//
// Sospecha (auditoría de rápidos, 8-sep): `renderClientToday` corta con un `return` cuando el
// guiado embebido tiene un timer corriendo (descanso/HIIT/isométrico) — es el candado que impide
// que el poll de 15 s del coach corte una serie a media. Pero `_qwGo` llama a esa misma función
// y CANTA el toast «⚡ … ¡a darle!» pase lo que pase. Si el `return` se dispara, la persona ve el
// aviso de que arrancó y no arrancó nada.
//
// Esto NO afirma un defecto: lo reproduce o lo descarta. Corre:
//   node scripts/e2e/_repro-qw-timer.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8805;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-qwtimer-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9305', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', `http://localhost:${PORT}/`], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9305/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');

const ok = await waitFor("typeof _qwGo==='function' && typeof QUICK_WORKOUTS!=='undefined' && typeof _gmLiveTimer==='function'", 40000);
if (!ok) { log('🔴 la app no arrancó'); process.exit(1); }

// Fixture mínimo: un asesorado con una rutina, en «Hoy».
const montaje = await ev(`(()=>{try{
  DB.clients=[{id:'q1',name:'Prueba Rápidos',tier:'coach',level:'Intermedio',days:3,goal:'Salud general',
    routines:[{id:'r1',name:'Pierna',day:new Date().toLocaleDateString('es-CO',{weekday:'long'}),restSec:60,
      exercises:[{id:'e40',name:'Búlgara',muscle:'piernas',type:'Compuesto',sets:3,reps:'10'}]}]}];
  DB.history={q1:[]}; CUR.clientId='q1'; CUR.loggedAs='client';
  showScreen('s-client'); if(typeof cnTab==='function')cnTab('cn-today');
  renderClientToday(DB.clients[0]);
  window.__toasts=[]; toast=(t)=>{window.__toasts.push(t);};
  return 'ok';
}catch(e){return 'ERR: '+e.message}})()`);
log('  montaje:', montaje);
if (montaje !== 'ok') process.exit(1);

// ── CASO A · SIN temporizador: el rápido tiene que arrancar ──
const a = await ev(`(()=>{ window.__toasts.length=0;
  _qwGo(QUICK_WORKOUTS.find(w=>w.id==='qw_abs_casa'), null);
  return {timerVivo:_gmLiveTimer&&!!_gmLiveTimer(), rutina:(typeof GM!=='undefined'&&GM.routine)?GM.routine.id:null,
    toasts:window.__toasts.slice()};})()`);
log('  A (sin timer) →', JSON.stringify(a));

// ── CASO B · CON temporizador vivo (como a media serie) ──
const b = await ev(`(()=>{ window.__toasts.length=0;
  // Se simula un descanso corriendo, que es lo que hace el candado de renderClientToday.
  GM.restTimer=setInterval(()=>{},1000);
  const antes=(typeof GM!=='undefined'&&GM.routine)?GM.routine.id:null;
  _qwGo(QUICK_WORKOUTS.find(w=>w.id==='qw_hiit_maquina'), {rounds:4,work:30,rest:15});
  const despues=(typeof GM!=='undefined'&&GM.routine)?GM.routine.id:null;
  clearInterval(GM.restTimer); GM.restTimer=null;
  return {timerVivo:true, antes, despues, arrancó:antes!==despues, toasts:window.__toasts.slice()};})()`);
log('  B (con timer) →', JSON.stringify(b));

log('\n  VEREDICTO:');
if (b && b.arrancó === false && (b.toasts || []).some(t => /a darle/.test(t))) {
  log('  🔴 REPRODUCIDO: con un temporizador vivo el rápido NO arranca y la app igual dice «¡a darle!».');
} else if (b && b.arrancó) {
  log('  ✅ DESCARTADO: arranca igual con el temporizador vivo.');
} else {
  log('  ⚠️  No concluyente: ' + JSON.stringify(b));
}
log('  jsErrors: ' + JSON.stringify(jsErrors));
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
