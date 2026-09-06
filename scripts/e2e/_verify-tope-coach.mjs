// Verificación E2E de v581: EL TOPE DE AVISOS DEL INICIO DEL COACH.
//
// Decisión del PO (6-sep-2026): hasta v580 se le pintaban hasta CINCO avisos a la vez y eligió el
// mismo tope que el asesorado tiene desde v505 —dos—, con vencimientos y empujón como los que
// siempre quiere ver. Lo que no cabe se APARTA en «Tienes N avisos más», nunca se silencia.
//
// 🔒 Se afirma la CONSECUENCIA: cuántos avisos se VEN, CUÁLES, y que abrir y cerrar no deja la
//    pantalla descolocada — que es la trampa de mover nodos (v505/v508).
// Patrón preview-SIN-login: se inyecta el estado y se llama `renderHome()` directo.
//
// Corre: node scripts/e2e/_verify-tope-coach.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8793;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-topecoach-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9293', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9293/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/');
// Los avisos viven POR DEBAJO del pliegue (heroe + 4 cifras + retencion + comunidad van
// antes), asi que sin llevarlos a la vista la captura sale siendo la portada del panel y
// no prueba nada — el mismo error que en v580 con el splash.
const shot = async n => { try { await ev("(()=>{const e=document.getElementById('h-expiry-banner')||document.getElementById('h-more');if(e)e.scrollIntoView({block:'center'});})()"); await sleep(250); const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch {} };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

const IDS = ['h-today-banner', 'h-expiry-banner', 'h-adherence-banner', 'h-deload', 'h-pulse'];

// Lee SOLO lo visible: qué avisos se ven, en qué orden en la pantalla, y qué dice la fila.
const ver = () => ev(`(()=>{
  const ids=${JSON.stringify(IDS)};
  const vis=ids.filter(id=>{const e=document.getElementById(id);
    return !!(e&&e.innerHTML.trim()&&getComputedStyle(e).display!=='none');});
  const more=document.getElementById('h-more');
  const padre=more?more.parentElement:null;
  const ordenDom=padre?[...padre.children].map(e=>e.id).filter(id=>ids.concat(['h-more']).indexOf(id)>=0):[];
  return JSON.stringify({
    visibles:vis,
    // Los que ESTE tope apartó. Ojo: contar "tiene innerHTML" NO sirve para saber cuántos avisos
    // hay — los banners se apagan con style.display y NO limpian su HTML, así que uno viejo
    // sigue contando. Dos aserciones dieron rojo por eso sobre una pantalla correcta.
    ocultos:ids.filter(id=>{const e=document.getElementById(id);return !!(e&&e.classList.contains('cap-off'));}),
    fila:more?more.innerText.replace(/\\s+/g,' ').trim():'',
    ordenDom:ordenDom
  });
})()`).then(JSON.parse);

// Fuerza los CINCO avisos a la vez: es el peor caso real y el que motivó el tope.
async function cincoAvisos() {
  const r = await ev(`(()=>{try{
    const now=Date.now(), d=n=>new Date(now+n*86400000).toISOString();
    // 2 vencen en 3 días (banner de vencimientos) · 1 dormido alcanzable (empujón)
    // · 1 entrenó hoy (banner positivo) · descarga vencida · pulso (récord reciente)
    DB.clients=[
      {id:'c1',name:'Vence Pronto',phone:'+57 300 111 2233',days:3,level:'Intermedio',goal:'Fuerza',
       routines:[{id:'r1',day:'Lunes',name:'Full body',exercises:[]}],
       payments:[{date:d(-27),dueDate:d(3),amount:100000,note:''}]},
      {id:'c2',name:'Dormido Alcanzable',phone:'+57 300 222 3344',days:3,level:'Intermedio',goal:'Fuerza',
       routines:[{id:'r2',day:'Lunes',name:'Full body',exercises:[]}],
       payments:[{date:d(-10),dueDate:d(20),amount:100000,note:''}]},
      {id:'c3',name:'Entreno Hoy',phone:'+57 300 333 4455',days:3,level:'Intermedio',goal:'Fuerza',
       routines:[{id:'r3',day:'Lunes',name:'Full body',exercises:[]}],
       payments:[{date:d(-10),dueDate:d(20),amount:100000,note:''}],
       deload:{active:true,startedAt:d(-14),weeks:1,sets:{}}},
    ];
    DB.history={
      c2:[{id:'s2',routineId:'r2',routineName:'Full body',date:d(-12),startedAt:d(-12),finishedAt:d(-12),doneSets:9,totalSets:9,totalVol:900,exercises:[]}],
      c3:[{id:'s3',routineId:'r3',routineName:'Full body',date:new Date().toISOString(),startedAt:new Date().toISOString(),finishedAt:new Date().toISOString(),doneSets:9,totalSets:9,totalVol:1200,exercises:[]}],
    };
    DB.prs={c3:{e1:{name:'Sentadilla',maxKg:100,unit:'kg',reps:8,date:new Date().toISOString()}}};
    renderHome();
    return 'ok';
  }catch(e){return String(e&&e.stack||e);}})()`);
  if (r !== 'ok') throw new Error('MONTAJE falló → ' + r);
  await sleep(400);
}

try {
  const ready = await waitFor(`(typeof renderHome==='function' && typeof coachNoticePlan==='function' && !!document.getElementById('h-more'))`, 60000);
  if (!ready) throw new Error('scripts no cargaron (renderHome/coachNoticePlan/#h-more)');
  await ev(`(()=>{try{['apex-loading','avi-loading'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});}catch(e){}
                  try{showScreen('s-coach');}catch(e){}
                  try{if(typeof gp==='function')gp('p-home');}catch(e){}})()`);
  await sleep(400);

  // ── T1: con varios avisos a la vez, solo se ven DOS ──
  log('\n=== T1: el tope deja 2 ===');
  await cincoAvisos();
  let v = await ver();
  log('    visibles -> ' + JSON.stringify(v.visibles));
  // «Cuántos avisos hay» = los que se ven MÁS los que este tope apartó. Contar innerHTML no
  // sirve: los banners se apagan con style.display y no limpian su HTML.
  const antes = v.visibles.length + v.ocultos.length;
  check('T1a el montaje deja MÁS de 2 avisos (si no, el tope no mediría nada)', antes > 2, 'avisos=' + antes);
  check('T1b pero solo se VEN 2', v.visibles.length === 2, JSON.stringify(v.visibles));
  check('T1c y son los que el PO eligió: vencimientos y empujón',
    v.visibles.indexOf('h-expiry-banner') >= 0 && v.visibles.indexOf('h-adherence-banner') >= 0, JSON.stringify(v.visibles));
  check('T1d lo apartado se DICE, no se silencia', /avisos? más/.test(v.fila), v.fila);
  check('T1e y la cuenta cuadra con lo que se escondió', new RegExp(String(antes - 2) + ' aviso').test(v.fila), v.fila + ' | pintados=' + antes);
  await shot('tope-coach-t1');

  // ── T2: abrir muestra lo apartado, pegado a la fila ──
  log('\n=== T2: abrir ===');
  await ev(`coachMoreToggle()`);
  await sleep(400);
  v = await ver();
  check('T2a abierto se ven TODOS los avisos', v.visibles.length === antes, JSON.stringify(v.visibles));
  check('T2b la fila cambia a «Ocultar»', /Ocultar/.test(v.fila), v.fila);
  // Lo revelado queda pegado a la fila, no al fondo de la pantalla.
  const iMore = v.ordenDom.indexOf('h-more');
  check('T2c lo apartado aparece JUSTO debajo de la fila', iMore >= 0 && iMore < v.ordenDom.length - 1,
    JSON.stringify(v.ordenDom));
  await shot('tope-coach-t2-abierto');

  // ── T3: 🔴 cerrar devuelve la pantalla a su sitio ──
  log('\n=== T3: cerrar (la trampa de mover nodos) ===');
  const ordenOriginal = ['h-today-banner', 'h-expiry-banner', 'h-adherence-banner', 'h-deload', 'h-pulse', 'h-more'];
  await ev(`coachMoreToggle()`);
  await sleep(400);
  v = await ver();
  check('T3a vuelven a verse 2', v.visibles.length === 2, JSON.stringify(v.visibles));
  // 🔴 Sin restaurar el orden, abrir y cerrar UNA vez dejaría los avisos descolocados hasta
  //    recargar la app, y el siguiente que subiera al top-2 se pintaría DEBAJO de la fila.
  check('T3b el orden del marcado queda como estaba',
    JSON.stringify(v.ordenDom) === JSON.stringify(ordenOriginal), JSON.stringify(v.ordenDom));

  // ── T4: CONTROL · con 2 o menos avisos NO aparece la fila ──
  log('\n=== T4: CONTROL · con pocos avisos no sobra nada ===');
  await ev(`(()=>{const now=Date.now(), d=n=>new Date(now+n*86400000).toISOString();
    DB.clients=[{id:'c1',name:'Vence Pronto',phone:'+57 300 111 2233',days:3,level:'Intermedio',goal:'Fuerza',
      routines:[{id:'r1',day:'Lunes',name:'Full body',exercises:[]}],
      payments:[{date:d(-27),dueDate:d(3),amount:100000,note:''}]}];
    DB.history={}; DB.prs={}; renderHome();})()`);
  await sleep(400);
  v = await ver();
  // OJO: este cliente dispara DOS avisos, no uno — vence en 3 días y además nunca ha entrenado.
  // La primera versión de este check esperaba 1 y el rojo era del FIXTURE, no de la app.
  check('T4a hasta el tope se ven TODOS: el tope no aparta NADA',
    v.ocultos.length === 0 && v.visibles.length >= 1, JSON.stringify({vis:v.visibles, ocultos:v.ocultos}));
  check('T4b y NO aparece la fila «avisos más»', v.fila === '', JSON.stringify(v.fila));

} catch (e) { results.push('FATAL ' + e.message); }
finally {
  const errs = [...new Set(jsErrors)].slice(0, 8);
  log('\n===RESUMEN===');
  results.forEach(r => log(r));
  log('jsErrors: ' + JSON.stringify(errs));
  const bad = results.filter(r => !r.startsWith('OK'));
  log(bad.length ? `\n${bad.length} FALLA(S)` : '\nTODO OK');
  ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
  await sleep(300); process.exit(bad.length ? 1 : 0);
}
