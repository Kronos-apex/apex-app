// Verificación E2E de v585: EL PANEL «CARGAS» DICE LA VERDAD.
//
// El panel pintaba como titular el peso de la ÚLTIMA sesión —sin rótulo— y la flecha ↑/↓
// comparaba esa última contra la PRIMERA sesión de la historia. Medido el 7-sep-2026 sobre los
// 229 ejercicios-persona en kg de producción: en 59 (26%) el titular NO era el récord, y de los
// 34 marcados «↓ bajando» 9 tenían el récord POR ENCIMA de su primera sesión — progreso real
// contado como retroceso. El coach decide cargas leyendo esta pantalla.
//
// 🔒 Se afirma la CONSECUENCIA que lee la persona (¿qué número grande sale? ¿lleva rótulo?
//    ¿dice cuál fue su última sesión?), nunca la presencia de un selector — regla de v453.
// 🔒 Se lee SOLO lo VISIBLE (`innerText`, que respeta display:none) y con control de cobertura:
//    una sonda que mide un panel apagado aprueba lo que nadie ve (v573).
// Patrón preview-SIN-login: se inyectan asesorados fake y se llama `renderProgressPanel()`
// directo → cero login, cero rate-limit, nada toca la nube.
//
// Corre: node scripts/e2e/_verify-cargas.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const PORT = 8793;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-cargas-' + Date.now();
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
const SHOTDIR = process.env.TEMP.replace(/\\/g, '/') + '/avi-cargas';
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTDIR + '/' + n + '.png', Buffer.from(r.data, 'base64')); log('  shot → ' + SHOTDIR + '/' + n + '.png'); } catch (e) { log('  (shot falló: ' + e.message + ')'); } };
try { (await import('node:fs')).mkdirSync(SHOTDIR, { recursive: true }); } catch {}
const waitFor = async (expr, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const results = [];
const check = (n, c, x = '') => { const line = (c ? 'OK ' : 'FAIL ') + n + (x ? ' — ' + x : ''); results.push(line); log('  ' + line); };

// El boot corre dentro de syncFromCloud().then() → esperar el SÍMBOLO real, no el DOM (gotcha).
const booted = await waitFor("typeof renderProgressPanel==='function' && typeof progressRowModel==='function'", 40000);
if (!booted) { log('🔴 la app no arrancó (o los módulos no cargaron)'); process.exit(1); }

// ── EL FIXTURE: los tres casos que importan, con los números REALES de producción ──
// (1) Astrid: récord 42,5 kg y última sesión 4,5 (que son 45 con el punto corrido). Es el caso
//     que el panel pintaba como «4,5 kg ↓ bajando 35,5».
// (2) Alguien cuya última sesión ES su récord → no hay nada que aclarar.
// (3) Alguien PLANTADO: 10 sesiones al mismo peso en 9 semanas, que es lo que el detector de
//     estancamiento (v433) sabe reconocer — sus compuertas piden ≥8 semanas de historial.
const montaje = await ev(`(()=>{try{
  const dia=86400000, hoy=Date.now();
  const ses=(rid,exId,nom,musc,kg,offDias)=>({id:'s'+exId+offDias,routineId:rid,routineName:'Plan',
    date:new Date(hoy-offDias*dia).toISOString(),finishedAt:new Date(hoy-offDias*dia).toISOString(),
    exercises:[{id:exId,name:nom,muscle:musc,track:'peso_reps',
      sets:[{done:true,kg:String(kg),reps:'10'}]}]});
  DB.clients=[
    {id:'fk1',name:'Astrid Fixture',level:'Intermedio',days:3,goal:'Ganar músculo',routines:[{id:'r1',day:'Lunes',name:'Plan',exercises:[]}]},
    {id:'fk2',name:'Enrecord Fixture',level:'Intermedio',days:3,goal:'Ganar músculo',routines:[{id:'r2',day:'Lunes',name:'Plan',exercises:[]}]},
    {id:'fk3',name:'Plantada Fixture',level:'Intermedio',days:3,goal:'Ganar músculo',routines:[{id:'r3',day:'Lunes',name:'Plan',exercises:[]}]},
  ];
  DB.history={
    // nuevo→viejo, como se guarda de verdad
    fk1:[ses('r1','e13','Sentadilla con Barra','piernas',4.5,2),
         ses('r1','e13','Sentadilla con Barra','piernas',42.5,9),
         ses('r1','e13','Sentadilla con Barra','piernas',40,16)],
    fk2:[ses('r2','e50','Prensa de Pierna','piernas',45,2),
         ses('r2','e50','Prensa de Pierna','piernas',40,9),
         ses('r2','e50','Prensa de Pierna','piernas',30,16)],
    fk3:Array.from({length:10},(_,i)=>ses('r3','e24','Pullover en Polea','espalda',25,i*7)),
  };
  DB.prs={};
  _progFilter='all';
  renderProgressPanel();
  document.querySelectorAll('#prog-list .pload-card').forEach(c=>c.classList.add('open'));
  return 'ok';
}catch(e){return 'ERR: '+e.message}})()`);
check('MONTAJE el fixture se planta y el panel se pinta', montaje === 'ok', String(montaje));
if (montaje !== 'ok') { log('\n🔴 sin montaje no se mide nada'); process.exit(1); }

// Hace visible el panel de Cargas de verdad (pantalla del coach + su panel), o se mediría
// un contenedor apagado: `display:none` deja el innerText en blanco y la sonda aprobaría por vacío.
await ev(`(()=>{try{showScreen('s-coach');gp('p-progress',null,'Cargas');
  document.querySelectorAll('#prog-list .pload-card').forEach(c=>c.classList.add('open'));
  return 1;}catch(e){return 0}})()`);
await sleep(400);

// ── CONTROL DE COBERTURA: ¿de verdad hay algo pintado y VISIBLE? ──
const cobertura = await ev(`(()=>{const l=document.getElementById('prog-list');
  if(!l)return {filas:0,alto:0};
  const filas=[...l.querySelectorAll('.pex-row')].filter(r=>r.getBoundingClientRect().height>0);
  return {filas:filas.length,alto:Math.round(l.getBoundingClientRect().height)};})()`);
check('COBERTURA hay filas VISIBLES pintadas (si no, todo lo demás aprueba por vacío)',
  cobertura && cobertura.filas === 3 && cobertura.alto > 0, JSON.stringify(cobertura));
if (!cobertura || cobertura.filas !== 3) { log('\n🔴 sin cobertura las cifras de esta corrida no valen'); process.exit(1); }

// Texto VISIBLE de cada fila (innerText respeta display:none; textContent no).
const fila = async nombre => await ev(`(()=>{const l=document.getElementById('prog-list');
  const cards=[...l.querySelectorAll('.pload-card')];
  const c=cards.find(x=>x.innerText.includes(${JSON.stringify(nombre)}));
  if(!c)return null;
  const r=c.querySelector('.pex-row');
  return r?r.innerText.replace(/\\s+/g,' ').trim():null;})()`);

const fAstrid = await fila('Astrid Fixture');
const fRecord = await fila('Enrecord Fixture');
const fPlant = await fila('Plantada Fixture');
log('\n  ── lo que se LEE en cada fila ──');
log('   Astrid   : ' + fAstrid);
log('   En récord: ' + fRecord);
log('   Plantada : ' + fPlant);
log('');

// ── EL DEFECTO QUE SE ARREGLA ──
check('C1 el número grande de Astrid es su RÉCORD (42,5), no su última sesión (4,5)',
  /42[.,]5/.test(fAstrid || ''), fAstrid);
check('C2 y ese número va ROTULADO: un número desnudo es el defecto', /récord/i.test(fAstrid || ''), '');
check('C3 la fila DICE cuál fue su última sesión, que es lo que explica la gráfica',
  /última\s*4[.,]5/i.test(fAstrid || ''), '');
check('C4 ya NO la cuenta como retroceso: subió 2,5 kg desde que empezó',
  /↑/.test(fAstrid || '') && !/↓/.test(fAstrid || ''), '');

// ── LOS CONTROLES: sin ellos «arreglar» sería borrar la información ──
check('C5 CONTROL quien está EN su récord no arrastra la línea «última» (no hay nada que aclarar)',
  /45/.test(fRecord || '') && !/última/i.test(fRecord || ''), fRecord);
check('C6 el plantado sale marcado por el DETECTOR, no por comparar dos puntos sueltos',
  /⏸/.test(fPlant || '') && /sin mejorarlo/i.test(fPlant || ''), fPlant);
check('C7 y su titular también es su récord rotulado (25 kg)',
  /25/.test(fPlant || '') && /récord/i.test(fPlant || ''), '');

// ── EL FILTRO ──
const filtro = await ev(`(()=>{try{_progFilter='stalled';renderProgressPanel();
  document.querySelectorAll('#prog-list .pload-card').forEach(c=>c.classList.add('open'));
  const t=document.getElementById('prog-list').innerText;
  return {plantada:/Plantada/.test(t),astrid:/Astrid/.test(t),record:/Enrecord/.test(t)};
}catch(e){return {err:e.message}}})()`);
check('C8 el filtro «Estancados» deja SOLO a quien lo está',
  filtro && filtro.plantada && !filtro.astrid && !filtro.record, JSON.stringify(filtro));
await ev(`_progFilter='all';renderProgressPanel();document.querySelectorAll('#prog-list .pload-card').forEach(c=>c.classList.add('open'));`);
await sleep(300);

// ── LA BARRA PREMIUM: 360 px y letra grande, sin desborde lateral ──
// El desborde se busca en la CADENA DE PADRES, no en el documento: esta app scrollea en
// contenedores internos y `documentElement.scrollWidth` no lo ve (gotcha v544).
const desborde = async () => await ev(`(()=>{const r=document.querySelector('#prog-list .pex-row');
  if(!r)return -1; let el=r, peor=0;
  while(el&&el!==document.body){ if(el.scrollWidth>el.clientWidth+1) peor=Math.max(peor,el.scrollWidth-el.clientWidth); el=el.parentElement; }
  return peor;})()`);
await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true });
await ev(`renderProgressPanel();document.querySelectorAll('#prog-list .pload-card').forEach(c=>c.classList.add('open'));`);
await sleep(300);
const d360 = await desborde();
check('C9 a 360 px la fila no obliga a arrastrar la pantalla de lado', d360 === 0, d360 + 'px');
await ev(`document.documentElement.setAttribute('data-fs','xl');const s=document.getElementById('avi-loading');if(s)s.style.display='none';`);
await sleep(300);
const d360xl = await desborde();
check('C10 y con la letra en «Muy grande» tampoco', d360xl === 0, d360xl + 'px');
await shot('cargas-360-xl');
await ev(`document.documentElement.removeAttribute('data-fs');`);

// ── ¿LO QUE MEDIMOS ES LO QUE SE VE? ──
// El splash (`#avi-loading`, z-index 9999) queda encima mientras no resuelva la nube: sin
// bajarlo, las capturas son del splash y aprobarían cualquier cosa (v580). Y «tener rect» no es
// «estar visible»: se comprueba con hit-testing, tras llevar la fila a la vista (v525/v580).
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await ev(`(()=>{const s=document.getElementById('avi-loading');if(s)s.style.display='none';
  const o=document.getElementById('install-banner');if(o)o.style.display='none';return 1;})()`);
await ev(`document.querySelector('#prog-list .pex-row')?.scrollIntoView({block:'center'});`);
await sleep(400);
const tapa = await ev(`(()=>{const r=document.querySelector('#prog-list .pex-row');
  if(!r)return 'sin fila'; const b=r.getBoundingClientRect();
  const el=document.elementFromPoint(Math.round(b.left+b.width/2),Math.round(b.top+b.height/2));
  if(!el)return 'nada'; return r.contains(el)?'ok':(el.id||el.className||el.tagName);})()`);
check('C11 la fila se puede TOCAR de verdad: nada flotante se le pone encima', tapa === 'ok', String(tapa));

// ── CAPTURAS: los dos temas, para MIRARLAS (R2.6) ──
// ⚠️ El tema NO se cambia quitando la clase `.dark` del body: vive en
// `documentElement[data-theme]` y su valor por defecto es DARK. Tocar el body deja el panel
// oscuro con el texto oscuro encima — invisible— y la captura habria aprobado eso.
// El control mide el fondo de la SUPERFICIE donde vive la fila, no el del body (v453: una
// regla se mide dentro de su contenedor real).
const repinta = `renderProgressPanel();document.querySelectorAll('#prog-list .pload-card').forEach(c=>c.classList.add('open'));document.querySelector('#prog-list .pex-row')?.scrollIntoView({block:'center'});`;
const fondoFila = async () => await ev(`(()=>{const r=document.querySelector('#prog-list .pex-row');
  if(!r)return ''; let el=r;
  while(el&&el!==document.documentElement){ const c=getComputedStyle(el).backgroundColor;
    if(c&&c!=='rgba(0, 0, 0, 0)'&&c!=='transparent') return c; el=el.parentElement; }
  return getComputedStyle(document.body).backgroundColor;})()`);
const lum = c => { const m = String(c).match(/\d+/g); return m ? (+m[0] + +m[1] + +m[2]) / 3 : -1; };

await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await ev(`setTheme('light');` + repinta);
await sleep(400);
const fClaro = await fondoFila();
check('C12 CONTROL en claro la fila se pinta sobre fondo CLARO (o la captura no prueba nada)',
  lum(fClaro) > 180, String(fClaro));
await shot('cargas-claro');

await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await ev(`setTheme('dark');` + repinta);
await sleep(400);
const fOscuro = await fondoFila();
check('C13 CONTROL y en oscuro sobre fondo OSCURO: son dos temas distintos de verdad',
  lum(fOscuro) < 80, String(fOscuro));
await shot('cargas-oscuro');
await ev(`setTheme('dark');`);
await ev(`document.body.classList.remove('dark');`);

log('\njsErrors: ' + JSON.stringify(jsErrors));
const fallas = results.filter(r => r.startsWith('FAIL')).length;
log(`\n${fallas || jsErrors.length ? '🔴' : '✅'} ${results.length - fallas}/${results.length} OK` + (jsErrors.length ? ` · ${jsErrors.length} errores JS` : ''));
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(fallas || jsErrors.length ? 1 : 0);
