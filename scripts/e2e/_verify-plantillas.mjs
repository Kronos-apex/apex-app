// Verificación E2E de v590: LA PLANTILLA QUE PROMETE HOMBROS, Y EL FORMULARIO QUE HEREDABA.
//
// Dos hallazgos de la auditoría del 7-sep, los dos del mismo frente:
//   · D2-3 — «Tren Superior — Espalda, Pecho y Hombros» tiene 3 de espalda y 2 de pecho y CERO
//     de hombro. Se aplicó a 3 personas; a Kathe la dejó sin un solo ejercicio de hombro en todo
//     su plan (corregido a mano el 7-sep; la plantilla seguía igual para la siguiente).
//   · D2-4 — al aplicar una plantilla, el modal conservaba el CALENTAMIENTO y el «por qué» de la
//     rutina que el coach hubiera abierto antes, que normalmente es de OTRO asesorado.
//
// 🔒 R1 REPRODUCE la herencia (abre la rutina de una, aplica una plantilla a otra y mira qué
//    quedó puesto), R3 el aviso que se VE, y los controles exigen que la app se calle cuando no
//    hay nada que decir y que el aviso no bloquee.
// Patrón preview-SIN-login.
//
// Corre: node scripts/e2e/_verify-plantillas.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8802;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-plantillas-' + Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9302', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9302/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/') + '/avi-plantillas';
try { mkdirSync(SHOTDIR, { recursive: true }); } catch {}
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch (e) { log('  (shot falló: ' + e.message + ')'); } };
const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

const booted = await waitFor("typeof renderTemplates==='function' && typeof openNewRoutineFromTemplate==='function' && typeof rfBlank==='function'", 40000);
if (!booted) { log('🔴 la app no arrancó (o falta rfBlank)'); process.exit(1); }

// ── FIXTURE: dos asesoradas y las plantillas reales del coach (la mala y una sana) ──
const montaje = await ev(`(()=>{try{
  DB.clients=[
    {id:'as1',name:'Astrid Beltran',tier:'coach',level:'Intermedio',days:3,routines:[
      {id:'r-astrid',name:'Pierna',day:'Lunes',restSec:60,note:'',why:'Astrid: esta semana bajamos volumen por su rodilla.',
       warmup:['e73','e106'],exercises:[{id:'e40',name:'Búlgara',muscle:'piernas',type:'Compuesto',sets:4,reps:'10'}]}]},
    {id:'ka1',name:'Kathe Beltran',tier:'coach',level:'Intermedio',days:3,routines:[]},
  ];
  DB.templates=[
    {id:'t-mala',name:'Tren Superior — Espalda, Pecho y Hombros (plantilla)',tag:'',note:'',restSec:60,exercises:[
      {id:'e6',name:'Remo con Barra',muscle:'espalda',type:'Compuesto',sets:4,reps:'10'},
      {id:'e83',name:'Jalón al Pecho',muscle:'espalda',type:'Compuesto',sets:4,reps:'12'},
      {id:'e51',name:'Remo Gironda',muscle:'espalda',type:'Compuesto',sets:3,reps:'12'},
      {id:'e84',name:'Press Banca',muscle:'pecho',type:'Compuesto',sets:4,reps:'10'},
      {id:'e24',name:'Pullover en Polea',muscle:'pecho',type:'Aislamiento',sets:3,reps:'15'}]},
    {id:'t-sana',name:'Pecho espalda (plantilla)',tag:'',note:'',restSec:60,exercises:[
      {id:'e6',name:'Remo con Barra',muscle:'espalda',type:'Compuesto',sets:4,reps:'10'},
      {id:'e84',name:'Press Banca',muscle:'pecho',type:'Compuesto',sets:4,reps:'10'}]},
  ];
  showScreen('s-coach'); gp('p-templates',null,'Plantillas'); renderTemplates();
  return 'ok';
}catch(e){return 'ERR: '+e.message}})()`);
check('MONTAJE las dos asesoradas y las dos plantillas quedan en pie', montaje === 'ok', String(montaje));
if (montaje !== 'ok') { log('\n🔴 sin montaje no se mide nada'); process.exit(1); }
await ev(`(()=>{const s=document.getElementById('avi-loading');if(s)s.style.display='none';
  const b=document.getElementById('install-banner');if(b)b.style.display='none';return 1;})()`);
await sleep(300);

// ── COBERTURA: la lista de plantillas se ve de verdad ──
const cob = await ev(`(()=>{const c=document.getElementById('tpl-list');
  if(!c)return{err:'sin lista'};
  const r=c.getBoundingClientRect();
  return {alto:Math.round(r.height),tarjetas:c.querySelectorAll('.rc').length,txt:c.innerText.replace(/\\s+/g,' ').trim()};})()`);
check('COBERTURA la lista pinta las 2 plantillas con alto real',
  cob && cob.alto > 0 && cob.tarjetas === 2, JSON.stringify({ alto: cob.alto, t: cob.tarjetas }));
if (!cob || cob.tarjetas !== 2) { log('\n🔴 sin cobertura las cifras no valen'); process.exit(1); }

// ══ R1 · LA HERENCIA, REPRODUCIDA: se abre la rutina de Astrid y se aplica una plantilla a Kathe ══
const r1 = await ev(`(()=>{try{
  CUR.clientId='as1'; openEditRoutine('as1',0);
  const antes={warmup:(CUR.routineWarmup||[]).slice(), why:document.getElementById('r-why')?document.getElementById('r-why').value:''};
  cm('m-routine');
  // …y ahora el coach le aplica la plantilla a KATHE
  CUR.clientId='ka1'; openNewRoutineFromTemplate(DB.templates[0]);
  const despues={warmup:(CUR.routineWarmup||[]).slice(), why:document.getElementById('r-why')?document.getElementById('r-why').value:'',
    nombre:document.getElementById('rf-name').value, ejercicios:CUR.routineExs.length, editIdx:CUR.editRoutineIdx};
  return {antes,despues};
}catch(e){return {err:e.message}}})()`);
check('R1-a el montaje sirve: la rutina de Astrid SÍ traía calentamiento propio y su «por qué»',
  r1 && r1.antes && r1.antes.warmup.length === 2 && /Astrid/.test(r1.antes.why || ''), JSON.stringify(r1 && r1.antes));
check('R1-b al aplicarle la plantilla a Kathe NO se hereda el calentamiento de Astrid',
  r1 && r1.despues && r1.despues.warmup.length === 0, JSON.stringify(r1 && r1.despues && r1.despues.warmup));
check('R1-c ni el «por qué» que el coach escribió para Astrid (lo lee el asesorado)',
  r1 && r1.despues && r1.despues.why === '', JSON.stringify(r1 && r1.despues && r1.despues.why));
check('R1-d y la plantilla sí se cargó: 5 ejercicios y su nombre (vaciar no puede borrar la feature)',
  r1 && r1.despues && r1.despues.ejercicios === 5 && /Espalda, Pecho y Hombros/.test(r1.despues.nombre || '') && r1.despues.editIdx === null,
  JSON.stringify(r1 && r1.despues));
// El modal se REABRE con un `om` diferido a 50 ms dentro de la propia función, asi que cerrarlo
// de inmediato no sirve: hay que esperarlo o la lista se mide con el modal encima (y la captura
// sale del modal, no de lo que se quiere mirar).
await sleep(300);
await ev(`cm('m-routine'); if(typeof navCloseLayer==='function'){} document.querySelectorAll('.mdbg.on').forEach(m=>m.classList.remove('on'));`);
await sleep(200);

// ══ R2 · EL AVISO SE VE EN LA LISTA, Y SOLO EN LA QUE LO MERECE ══
const r2 = await ev(`(()=>{gp('p-templates',null,'Plantillas'); renderTemplates();
  const tarjetas=[...document.querySelectorAll('#tpl-list .rc')];
  return tarjetas.map(c=>{const g=c.querySelector('.tpl-gap');
    const r=g?g.getBoundingClientRect():null;
    return {nombre:(c.querySelector('.rcname')||{}).innerText||'', aviso:g?g.innerText.trim():null,
      alto:r?Math.round(r.height):0};});})()`);
check('R2-a la plantilla que promete hombros lo dice, y con alto real',
  Array.isArray(r2) && r2[0] && /hombros/.test(r2[0].aviso || '') && r2[0].alto > 0, JSON.stringify(r2 && r2[0]));
check('R2-b CONTROL la plantilla sana NO lleva aviso (una regla que marca todo se ignora)',
  Array.isArray(r2) && r2[1] && r2[1].aviso === null, JSON.stringify(r2 && r2[1]));
await shot('plantillas-aviso');

// ── El aviso se lee en los DOS temas ──
for (const tema of ['dark', 'light']) {
  await ev(`document.querySelectorAll('.mdbg.on').forEach(m=>m.classList.remove('on')); setTheme('${tema}'); renderTemplates();`);
  await sleep(200);
  const con = await ev(`(()=>{const g=document.querySelector('#tpl-list .tpl-gap');
    if(!g)return null; const cs=getComputedStyle(g);
    let el=g,fondo='rgba(0, 0, 0, 0)';
    while(el&&fondo==='rgba(0, 0, 0, 0)'){ fondo=getComputedStyle(el).backgroundColor; el=el.parentElement; }
    return {color:cs.color,fondo,ancho:Math.round(g.getBoundingClientRect().width)};})()`);
  const rgb = t => (String(t).match(/\d+/g) || []).slice(0, 3).map(Number);
  const lum = c => { const [r, g, b] = rgb(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const L1 = Math.max(lum(a), lum(b)), L2 = Math.min(lum(a), lum(b)); return (L1 + 0.05) / (L2 + 0.05); };
  const cr = con ? ratio(con.color, con.fondo) : 0;
  check(`T-${tema} el aviso se lee (contraste ≥4.5) y cabe a 390 px`, cr >= 4.5 && con && con.ancho > 0,
    `ratio=${cr.toFixed(2)} ${JSON.stringify(con)}`);
  await shot('plantillas-' + tema);
}
await ev(`setTheme('dark');`);

// ══ R3 · CONTROL: el aviso NO bloquea — la rutina se guarda igual ══
const r3 = await ev(`(()=>{try{
  window.__toasts=[]; const _t=toast; toast=(x)=>{window.__toasts.push(x);};
  CUR.clientId='ka1'; openNewRoutineFromTemplate(DB.templates[0]);
  document.getElementById('rf-name').value='Tren Superior — Espalda, Pecho y Hombros';
  saveRoutine();
  const k=DB.clients.find(x=>x.id==='ka1');
  const res={rutinas:(k.routines||[]).length, ejercicios:((k.routines[0]||{}).exercises||[]).length,
    warmup:((k.routines[0]||{}).warmup||[]).length, why:(k.routines[0]||{}).why};
  setTimeout(()=>{toast=_t;},1500);
  return res;
}catch(e){return {err:e.message}}})()`);
check('R3-a la rutina SE GUARDA aunque el nombre prometa lo que no tiene (avisa, no bloquea)',
  r3 && r3.rutinas === 1 && r3.ejercicios === 5, JSON.stringify(r3));
check('R3-b y llega limpia: sin el calentamiento ni el «por qué» de Astrid',
  r3 && r3.warmup === 0 && !r3.why, JSON.stringify({ w: r3 && r3.warmup, why: r3 && r3.why }));
await sleep(1200);
const r3b = await ev(`(window.__toasts||[]).slice()`);
check('R3-c y el coach recibe el aviso después de guardar',
  Array.isArray(r3b) && r3b.some(t => /hombros/.test(String(t))), JSON.stringify(r3b));

log('\n  jsErrors: ' + JSON.stringify(jsErrors));
const fails = results.filter(r => r.startsWith('FAIL'));
log(`\n  ${results.length - fails.length}/${results.length} checks OK`);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(fails.length || jsErrors.length ? 1 : 0);
