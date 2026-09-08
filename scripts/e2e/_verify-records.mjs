// Verificación E2E de v591: LOS RÉCORDS ATASCADOS SE PONEN AL DÍA, Y SOLO ESOS.
//
// Hallazgo D3-2 de la auditoría del 7-sep. El récord alimenta el PESO SUGERIDO: con el récord
// atascado, la app le sugiere a alguien menos de lo que ya levanta (el bucle cerrado de v432).
//
// 🔒 Lo que se afirma es el efecto COMPLETO: que la cura corre sola al entrar, que lo curado
//    QUEDA GUARDADO (si no, vuelve a estar atascado al siguiente arranque), que el peso sugerido
//    cambia de verdad, y que lo que NO se debe tocar sigue intacto.
// 🔒 El control más importante es el de v483: un ejercicio con historial y SIN récord no puede
//    aparecer, porque un récord ausente puede ser uno que el coach borró a mano.
// Patrón preview-SIN-login.
//
// Corre: node scripts/e2e/_verify-records.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8803;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-records-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9303', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9303/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

const booted = await waitFor("typeof _applyAuthClientDB==='function' && typeof healStalePrs==='function' && typeof _suggestKg==='function'", 40000);
if (!booted) { log('🔴 la app no arrancó (o falta healStalePrs)'); process.exit(1); }

// ── FIXTURE: la fila de una asesorada tal como llega de la nube ──
// Cuatro casos a la vez: el atascado de verdad, el que NO se marcó, el que no existe y el que
// ya está al día. Se entra por `_applyAuthClientDB`, que es la puerta REAL del asesorado.
const montaje = await ev(`(()=>{try{
  window.__subidas=[]; svNow=(k,v)=>{ window.__subidas.push(k); return Promise.resolve(); };
  const cliente={id:'rc1',name:'Prueba Récords',tier:'coach',level:'Intermedio',days:3,routines:[
    {id:'rr1',name:'Espalda',day:'Lunes',restSec:60,exercises:[
      {id:'e6',name:'Jalón al Pecho',muscle:'espalda',type:'Compuesto',sets:4,reps:'10'}]}]};
  const coll={
    prs:{
      e6:{val:50,kg:50,unit:'kg',reps:10,date:'2026-05-26T00:00:00Z',name:'Jalón al Pecho'},
      e7:{val:40,kg:40,unit:'kg',reps:10,date:'2026-05-26T00:00:00Z',name:'Press Militar'},
      e9:{val:60,kg:60,unit:'kg',reps:8,date:'2026-05-26T00:00:00Z',name:'Sentadilla'},
    },
    history:[
      // 1) ATASCADO: sesión posterior, serie MARCADA, 70 kg.
      {id:'h1',date:'2026-06-24T00:00:00Z',routineId:'rr1',exercises:[
        {id:'e6',name:'Jalón al Pecho',track:'peso_reps',sets:[{kg:70,reps:9,done:true}]}]},
      // 2) NO MARCADO: 90 kg escritos y sin marcar → no es un récord (caso real de Nataly).
      {id:'h2',date:'2026-07-01T00:00:00Z',routineId:'rr1',exercises:[
        {id:'e7',name:'Press Militar',track:'peso_reps',sets:[{kg:90,reps:12,done:false}]}]},
      // 3) SIN RÉCORD GUARDADO: el coach pudo haberlo borrado a mano → no se crea (v483).
      {id:'h3',date:'2026-07-02T00:00:00Z',routineId:'rr1',exercises:[
        {id:'e30',name:'Patada de Glúteo en Polea',track:'peso_reps',sets:[{kg:30,reps:12,done:true}]}]},
      // 4) YA AL DÍA: la sesión no supera al récord.
      {id:'h4',date:'2026-07-03T00:00:00Z',routineId:'rr1',exercises:[
        {id:'e9',name:'Sentadilla',track:'peso_reps',sets:[{kg:55,reps:8,done:true}]}]},
    ],
    bodyweight:[],medidas:[],nutrition:{},photos:[],msgs:[]};
  CUR.clientId='rc1'; CUR.loggedAs='client';
  _applyAuthClientDB(cliente,coll);
  return 'ok';
}catch(e){return 'ERR: '+e.message}})()`);
check('MONTAJE la fila entra por la puerta REAL del asesorado', montaje === 'ok', String(montaje));
if (montaje !== 'ok') { log('\n🔴 sin montaje no se mide nada'); process.exit(1); }

const est = await ev(`(()=>{const p=DB.prs['rc1']||{};
  return {e6:p.e6&&p.e6.val, e6from:p.e6&&p.e6.healedFrom&&p.e6.healedFrom.val, e7:p.e7&&p.e7.val,
    e9:p.e9&&p.e9.val, e30:p.e30===undefined?'(no existe)':'CREADO', claves:Object.keys(p).length,
    subidas:(window.__subidas||[]).slice()};})()`);
check('R1 el récord atascado se pone al día solo al entrar (50 → 70)', est && est.e6 === 70, JSON.stringify(est));
check('R2 y guarda de dónde venía: la app no cambia un dato en silencio', est && est.e6from === 50, 'healedFrom=' + (est && est.e6from));
check('R3 CONTROL el peso ANOTADO y no marcado NO se vuelve récord (caso Nataly)', est && est.e7 === 40, 'e7=' + (est && est.e7));
check('R4 CONTROL no se CREA el récord que no existe (pudo borrarlo el coach a mano, v483)',
  est && est.e30 === '(no existe)' && est.claves === 3, JSON.stringify({ e30: est && est.e30, claves: est && est.claves }));
check('R5 CONTROL el que ya estaba al día no se toca', est && est.e9 === 60, 'e9=' + (est && est.e9));
check('R6 lo curado se PERSISTE (si no, vuelve a estar atascado al siguiente arranque)',
  est && est.subidas.indexOf('ax_pr') >= 0, JSON.stringify(est && est.subidas));

// ── R7 · LO QUE DE VERDAD IMPORTA: el peso sugerido deja de quedarse corto ──
const sug = await ev(`(()=>{const ex={id:'e6',name:'Jalón al Pecho',muscle:'espalda',type:'Compuesto',sets:4,reps:'10'};
  const conCura=_suggestKg(ex);
  // Y con el récord atascado a mano, para ver la diferencia REAL.
  const guardado=DB.prs['rc1'].e6;
  DB.prs['rc1'].e6={val:50,kg:50,unit:'kg',reps:10,date:'2026-05-26T00:00:00Z',name:'Jalón al Pecho'};
  const sinCura=_suggestKg(ex);
  DB.prs['rc1'].e6=guardado;
  return {conCura,sinCura};})()`);
check('R7 el peso sugerido sube con el récord al día (era el daño real: sugerir menos de lo que ya levanta)',
  sug && sug.conCura > sug.sinCura, JSON.stringify(sug));

// ── R8 · IDEMPOTENTE: volver a entrar no vuelve a mover nada ──
const idem = await ev(`(()=>{window.__subidas.length=0;
  const antes=JSON.stringify(DB.prs['rc1']);
  const cliente=DB.clients[0];
  _applyAuthClientDB(cliente,{prs:DB.prs['rc1'],history:DB.history['rc1'],bodyweight:[],medidas:[],nutrition:{},photos:[],msgs:[]});
  return {igual:JSON.stringify(DB.prs['rc1'])===antes, subidas:(window.__subidas||[]).slice()};})()`);
check('R8 al segundo arranque no cambia nada (corre en CADA entrada, tiene que ser idempotente)',
  idem && idem.igual === true && idem.subidas.indexOf('ax_pr') < 0, JSON.stringify(idem));

log('\n  jsErrors: ' + JSON.stringify(jsErrors));
const fails = results.filter(r => r.startsWith('FAIL'));
log(`\n  ${results.length - fails.length}/${results.length} checks OK`);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(fails.length || jsErrors.length ? 1 : 0);
