// ─────────────────────────────────────────────────────────────────────────────
// _verify-prfix.mjs — EL COACH PUEDE CORREGIR UN RÉCORD MAL ANOTADO
//
// Nace de un caso REAL: Nataly tenía «Patada de Glúteo en Polea 30 kg» y de verdad levantaba 15
// (anotó el número de la placa de la máquina, no la carga). Hasta v456 **no había forma de
// corregirlo**: los récords solo se escriben solos cuando alguien supera su marca. Y un récord
// falso hace daño por tres lados — nadie puede volver a superarlo, infla la gráfica, y **envenena
// el peso que la app sugiere**. Esto último es lo que el PO pidió arreglar, textual: «que los
// pesos sugeridos sean pesos de récords reales».
//
// QUÉ AFIRMA, y por qué así: no comprueba que un input cambie de valor — comprueba **la
// consecuencia que le importa al PO**, que el PESO SUGERIDO baje con el récord corregido. Un test
// que solo mirase `DB.prs` pasaría igual si la sugerencia siguiera saliendo de otro lado.
//
//   node scripts/e2e/_verify-prfix.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { afirmador, salir } from './_afirma.mjs';
const A = afirmador('corregir récords (coach)');
const PORT = 8809, DP = 9309, APP = `http://localhost:${PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
   '--user-data-dir=' + process.env.TEMP + '/prfix-' + Date.now(), '--no-first-run',
   '--window-size=390,844', APP]);
async function fp() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { pend.get(m.id).res(m.result); pend.delete(m.id); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const waitFor = async (e, ms = 25000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(300); } return false; };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(700);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP }); await sleep(900);
const listo = await waitFor(`typeof renderCoachPRsCard==='function' && typeof coachEditPR==='function' && typeof prfixSave==='function' && typeof suggestFromPR==='function'`);
A.ok(listo, 'las funciones de corrección existen (módulos cargados)');

// Montaje: un asesorado con el récord MAL anotado, tal como estaba el de Nataly.
const FECHA = '2026-06-01T10:00:00.000Z';
const montaje = await ev(`(()=>{try{
  CUR.loggedAs='coach'; showScreen('s-coach');
  DB.clients=[{id:'cQA',name:'QA Récord',tier:'premium',days:3,level:'Intermedio'}];
  CUR.clientId='cQA';
  DB.prs={cQA:{e44:{val:30,kg:30,unit:'kg',reps:15,name:'Patada de Glúteo en Polea',muscle:'gluteo',date:'${FECHA}'}}};
  renderCoachPRsCard(DB.clients[0]);
  return 'ok';
}catch(e){return 'ERR '+(e&&e.message)}})()`);
A.ok(montaje === 'ok', 'el montaje deja un récord mal anotado (30 kg donde eran 15)', montaje);

// La tarjeta tiene que PINTARSE y ofrecer el botón — si no, no hay por dónde corregir.
// ⚠️ El texto se busca ENTERO, no en un `slice(0,120)`: el nombre del ejercicio va después del
// párrafo de encabezado y el recorte lo dejaba fuera — el primer fallo de este harness era del
// harness, no de la app.
const tarjeta = await ev(`(()=>{const el=document.getElementById('d-prs');
  const t=el?(el.innerText||''):'';
  return {visible: !!el && el.style.display!=='none',
          nombra: /Patada de Gl/i.test(t),
          muestra30: /30\\s*kg/i.test(t),
          boton: !!(el&&el.querySelector('button'))};})()`);
A.ok(tarjeta.visible && tarjeta.boton, 'la ficha del coach muestra la tarjeta de récords con su botón', tarjeta);
A.ok(tarjeta.nombra && tarjeta.muestra30, 'la tarjeta nombra el ejercicio y su valor actual', tarjeta);

// El peso que la app sugeriría HOY, con el récord malo. Es la cifra que le importa al PO.
const antes = await ev(`suggestFromPR(DB.prs.cQA.e44, 15)`);
A.ok(typeof antes === 'number' && antes > 0, `con el récord malo la app sugiere ${antes} kg`, { antes });

// Abrir el modal y comprobar que llega con el valor actual (no en blanco: se CORRIGE, no se re-teclea).
await ev(`coachEditPR('e44')`); await sleep(400);
const modal = await ev(`(()=>{const bg=document.getElementById('m-prfix');const i=document.getElementById('prfix-val');
  return {abierto: !!bg && bg.classList.contains('on'), valor: i?i.value:null,
          dice: (document.getElementById('prfix-ex')||{}).innerText||''};})()`);
A.ok(modal.abierto, 'el modal de corrección abre', modal);
A.ok(String(modal.valor) === '30', 'llega con el valor actual cargado, para corregirlo', modal);

// Corregir a 15 y guardar.
await ev(`(()=>{document.getElementById('prfix-val').value='15';})()`);
await ev(`prfixSave()`); await sleep(400);
const dsp = await ev(`(()=>{const p=DB.prs.cQA.e44;const bg=document.getElementById('m-prfix');
  return {val:p&&p.val, kg:p&&p.kg, fecha:p&&p.date, de:p&&p.corregidoDe, cerrado: !!bg && !bg.classList.contains('on')};})()`);
A.ok(dsp.val === 15 && dsp.kg === 15, 'el récord queda corregido a 15 kg', dsp);
// 🔴 La FECHA no se toca: es el día en que ocurrió. Moverla haría que un récord viejo pareciera
// reciente y dispararía el «¡nuevo récord!» del pulso del coach.
A.ok(dsp.fecha === FECHA, 'la fecha del récord NO se movió (sigue siendo el día en que ocurrió)', dsp);
A.ok(dsp.de === 30, 'queda registrado de qué valor se corrigió', dsp);
A.ok(dsp.cerrado, 'el modal se cierra al guardar', dsp);

// ── LO QUE DE VERDAD PEDÍA EL PO ────────────────────────────────────────────────────────────
const despues = await ev(`suggestFromPR(DB.prs.cQA.e44, 15)`);
A.ok(typeof despues === 'number' && despues > 0 && despues < antes,
  `el PESO SUGERIDO baja con el récord corregido: ${antes} → ${despues} kg`, { antes, despues });

// Un valor imposible no entra (mismo tope que la anotación de series).
await ev(`coachEditPR('e44')`); await sleep(300);
await ev(`(()=>{document.getElementById('prfix-val').value='5000';})()`);
await ev(`prfixSave()`); await sleep(300);
const tope = await ev(`(()=>{const p=DB.prs.cQA.e44;const bg=document.getElementById('m-prfix');
  return {val:p&&p.val, sigueAbierto: !!bg && bg.classList.contains('on')};})()`);
A.ok(tope.val === 15 && tope.sigueAbierto, 'un valor imposible (5.000 kg) NO entra y el modal no se cierra', tope);
await ev(`cm('m-prfix')`); await sleep(200);

// Borrar deja el récord fuera (y si vuelve a levantarlo, se re-crea solo en la próxima sesión).
await ev(`window.confirm=()=>true;`);
await ev(`coachEditPR('e44')`); await sleep(300);
await ev(`prfixDelete()`); await sleep(300);
const borrado = await ev(`(()=>({queda: !!(DB.prs.cQA&&DB.prs.cQA.e44), card:(document.getElementById('d-prs')||{}).style.display}))()`);
A.ok(!borrado.queda, 'borrar quita el récord', borrado);

ws.close();
salir(A, { chrome, srv });
