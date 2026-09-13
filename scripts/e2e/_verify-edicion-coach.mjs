// _verify-edicion-coach.mjs — LO QUE EL COACH EDITA DE UN EJERCICIO DEL CATÁLOGO TIENE QUE DURAR.
//
// El defecto (punto 2 del radar, abierto desde que `migrateExercises` dejó de solo-agregar):
// `saveEx` guarda nombre/músculo/tipo/ícono/descripción y canta «✅ actualizado»… y en el
// siguiente arranque `migrateExercises` REFRESCA esos mismos campos desde `defaultExercises`,
// o sea revierte la edición sin decir nada. La app le miente al coach.
//
// Este harness prueba las DOS mitades, que es lo que hace difícil el arreglo:
//   (A) lo que el coach editó SOBREVIVE al arranque,
//   (B) lo que el coach NO tocó SIGUE refrescándose desde el código (para eso existe la
//       migración: que las fichas viejas no queden sin descSimple/muscleLabel).
// Sin login ni red: monta la app local y opera el catálogo real, 374 ejercicios.
// exit 1 · cero jsErrors.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
const PORT = 8877, DBG = 9421;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + DBG, '--user-data-dir=' + process.env.TEMP + '/edcoach-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch(`http://localhost:${DBG}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id).resolve(m.result); pend.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
for (let i = 0; i < 90; i++) { if (await ev(`typeof saveEx==='function' && typeof migrateExercises==='function' && typeof openEditEx==='function'`)) break; await sleep(500); }
await sleep(1500);

const results = [];
const check = (n, c, x = '') => { results.push((c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : '')); };

// CONTROL DE COBERTURA: si el catálogo no está cargado, lo que siga no prueba nada.
const base = await ev(`(()=>{['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  CUR.loggedAs='coach';showScreen('s-coach');
  return {catalogo:DB.exercises.length, e1:(DB.exercises.find(e=>e.id==='e1')||{}).name,
          defE1:(defaultExercises.find(e=>e.id==='e1')||{}).name};})()`);
if (!base || base.catalogo < 300 || !base.e1) { console.error('🔴 sonda rota: catálogo no cargado', JSON.stringify(base)); process.exit(1); }
check('C0 control: el catálogo real está cargado y e1 arranca con el nombre del código',
  base.catalogo > 300 && base.e1 === base.defE1, JSON.stringify(base));

// ── C1 · DISPOSITIVO NUEVO (todavía sin `ax_e`): la biblioteca de trabajo NO puede ser el
//    MISMO array que el catálogo del código. Si lo es, editar un ejercicio reescribe la fuente
//    de la verdad en memoria — y de paso deja ciega a la migración, que compara contra ella.
const c1 = await ev(`(()=>({sinAxE: localStorage.getItem('ax_e')===null, mismoArray: DB.exercises===defaultExercises}))()`);
check('C1 en un dispositivo nuevo la biblioteca es una COPIA, no el catálogo del código',
  c1.sinAxE === true && c1.mismoArray === false, JSON.stringify(c1));

// ── El dispositivo REAL del coach ya tiene su biblioteca guardada (`ax_e`: 374 ejercicios en la
//    nube hoy). En ese estado `ld` devuelve una copia parseada y el catálogo del código queda
//    intacto — que es justo cuando la migración sí revierte. Se siembra ese estado.
await ev(`(()=>{localStorage.setItem('ax_e',JSON.stringify(defaultExercises));
  DB.exercises=JSON.parse(localStorage.getItem('ax_e'));})()`);

// ── EL COACH EDITA, COMO LO HACE EN LA APP: abre la ficha, cambia el nombre, guarda.
const NUEVO = 'Press de Banca (barra corta del gym)';
const edit = await ev(`(()=>{openEditEx('e1');
  document.getElementById('ex-n').value=${JSON.stringify(NUEVO)};
  saveEx();
  const g=(JSON.parse(localStorage.getItem('ax_e')||'[]')).find(e=>e.id==='e1')||{};
  return {enMemoria:(DB.exercises.find(e=>e.id==='e1')||{}).name, guardado:g.name};})()`);
check('E1 el cambio queda guardado en el momento (memoria y ax_e)',
  edit.enMemoria === NUEVO && edit.guardado === NUEVO, JSON.stringify(edit));

// CONTROL DE DISCRIMINACIÓN: si editar contamina `defaultExercises`, todo lo que sigue aprueba
// por casualidad (la migración compararía el dato contra sí mismo y nunca revertiría nada).
const limpio = await ev(`(()=>({def:(defaultExercises.find(e=>e.id==='e1')||{}).name}))()`);
check('C2 control: editar NO cambió el catálogo del código (si no, E2 aprobaría por casualidad)',
  limpio.def === base.defE1, JSON.stringify(limpio));

// ── EL SIGUIENTE ARRANQUE: es exactamente lo que corre `initCoach` en cada login.
const boot = await ev(`(()=>{DB.exercises=JSON.parse(localStorage.getItem('ax_e')||'[]');
  migrateExercises();
  const g=(JSON.parse(localStorage.getItem('ax_e')||'[]')).find(e=>e.id==='e1')||{};
  return {enMemoria:(DB.exercises.find(e=>e.id==='e1')||{}).name, guardado:g.name};})()`);
check('E2 🔴 EL DEFECTO: el nombre que puso el coach SOBREVIVE al arranque (no vuelve al del código)',
  boot.enMemoria === NUEVO && boot.guardado === NUEVO, JSON.stringify(boot));

// ── Y la migración SIGUE haciendo su trabajo en lo que el coach no tocó: una biblioteca vieja
//    (ficha sin descSimple y con muscleLabel desfasado) tiene que quedar al día igual.
const refresh = await ev(`(()=>{const d=defaultExercises.find(e=>e.id==='e2');
  const lista=JSON.parse(localStorage.getItem('ax_e')||'[]');
  const x=lista.find(e=>e.id==='e2'); delete x.descSimple; x.muscleLabel='ETIQUETA VIEJA';
  localStorage.setItem('ax_e',JSON.stringify(lista));
  DB.exercises=JSON.parse(localStorage.getItem('ax_e'));
  migrateExercises();
  const y=(DB.exercises.find(e=>e.id==='e2')||{});
  const e1=(DB.exercises.find(e=>e.id==='e1')||{});
  return {descSimple:y.descSimple===d.descSimple, etiqueta:y.muscleLabel===d.muscleLabel,
          e1:e1.name, defLabel:d.muscleLabel, quedo:y.muscleLabel};})()`);
check('E3 lo que el coach NO tocó se sigue refrescando desde el código (ficha vieja al día)',
  refresh.descSimple === true && refresh.etiqueta === true, JSON.stringify(refresh));
check('E3-bis y el refresco de otro ejercicio no le devuelve el nombre viejo al editado',
  refresh.e1 === NUEVO, JSON.stringify({ e1: refresh.e1 }));

// ── El campo editado se "suelta" si el coach lo deja otra vez como el código: a partir de ahí
//    vuelve a mandar el catálogo (si no, una edición congela ese campo PARA SIEMPRE).
const soltar = await ev(`(()=>{openEditEx('e1');
  document.getElementById('ex-n').value=${JSON.stringify(base.defE1)};
  saveEx();
  const lista=JSON.parse(localStorage.getItem('ax_e')||'[]');
  const x=lista.find(e=>e.id==='e1'); x.name='NOMBRE DE BIBLIOTECA VIEJA';
  localStorage.setItem('ax_e',JSON.stringify(lista));
  DB.exercises=JSON.parse(localStorage.getItem('ax_e'));
  migrateExercises();
  return {name:(DB.exercises.find(e=>e.id==='e1')||{}).name};})()`);
check('E4 si el coach lo deja igual al del código, el campo vuelve a refrescarse (no queda congelado)',
  soltar.name === base.defE1, JSON.stringify(soltar));

// ── Un ejercicio PROPIO del coach (id no-catálogo) nunca lo toca la migración.
const custom = await ev(`(()=>{openAddEx();
  document.getElementById('ex-n').value='Remo Australiano del parque';
  document.getElementById('ex-m').value='espalda';
  saveEx();
  const lista=JSON.parse(localStorage.getItem('ax_e')||'[]');
  const mio=lista.find(e=>e.name==='Remo Australiano del parque');
  DB.exercises=JSON.parse(localStorage.getItem('ax_e'));
  migrateExercises();
  const d=(DB.exercises.find(e=>e.id===(mio||{}).id)||{});
  return {existe:!!mio, sigue:d.name==='Remo Australiano del parque'};})()`);
check('E5 el ejercicio propio del coach sigue intacto tras el arranque',
  custom.existe === true && custom.sigue === true, JSON.stringify(custom));

console.log('\n── EDICIÓN DEL COACH SOBRE EL CATÁLOGO ──');
results.forEach(r => console.log(r));
if (jsErrors.length) { console.log('\n🔴 errores JS:'); jsErrors.forEach(e => console.log('   ' + e)); }
const fail = results.filter(r => r.startsWith('❌')).length;
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
if (fail || jsErrors.length) { console.log(`\n❌ ${fail} fallos, ${jsErrors.length} errores JS`); process.exit(1); }
console.log('\n✅ TODO OK');
process.exit(0);
