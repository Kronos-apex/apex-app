// Harness de «LO QUE EL COACH EDITA EN EL PERFIL NO LO PISA UN TELÉFONO ABIERTO» (v623), medido
// DE PUNTA A PUNTA con LOS DOS APARATOS.
//
// v623 se verificó por partes (la función pura, el cableado, 14 sabotajes) y **nunca se corrió el
// caso del PO entero**: él registra un pago en su panel mientras el teléfono del asesorado lleva
// abierto desde antes, y ese teléfono guarda un vaso de agua con su copia vieja del perfil.
//
// 🔒 NO se toca la nube real: los harness escriben SELLADOS en localhost a propósito (v298) y el
//    único proyecto Supabase que existe es el de PRODUCCIÓN. Lo que se simula es la NUBE —con la
//    propiedad que causa el defecto: **PostgREST reemplaza la columna jsonb ENTERA**—; el código
//    que corre es el de la app, por sus dos vías reales de escritura:
//      · el panel del coach → `_persistCoachWrite('ax_c',…)` → `UD.updateClientRow`
//      · el teléfono        → `_persistAuthUser('ax_c',…)`   → `UD.upsertOwn`
//
// 🔒 CONTROL DE DISCRIMINACIÓN (sin él esto no vale nada): el MISMO guion se corre con la fusión
//    APAGADA y ahí el dato TIENE que perderse. Si los dos salen bien, la sonda no mide.
// ⚠️ `_authUid` (let) y `_coachSnap` (const) son bindings de SCRIPT, no propiedades de `window`:
//    se tocan con asignación pelada en ámbito global (y el `const` se MUTA, no se reasigna).
//
// Corre: node scripts/e2e/_verify-perfil-dos-aparatos.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';

const PORT = 8853;
const RAIZ = 'C:/Users/KRONOS/Desktop/AVI/apex-app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: RAIZ });
await sleep(1400);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new', '--disable-gpu', '--remote-debugging-port=9363',
   '--user-data-dir=' + process.env.TEMP + '/cdos-' + Date.now(), '--no-first-run',
   '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9363/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || 'x'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return { _error: (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || 'excepción' };
  return r.result && r.result.value;
};
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e) === true) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');

let pass = 0, fail = 0;
const ok = (n, c, extra) => { if (c) { pass++; console.log('  ✅', n, extra === undefined ? '' : '— ' + JSON.stringify(extra)); } else { fail++; console.log('  ❌', n, extra === undefined ? '' : '— ' + JSON.stringify(extra)); } };

// ── LA NUBE DE MENTIRA, con la propiedad que causa el defecto ────────────────────────────────
const MONTAJE = `(()=>{
  const clon=o=>JSON.parse(JSON.stringify(o));
  window.__nube={profile:null,routines:[],escrituras:0};
  window.__reset=()=>{
    window.__nube.profile={name:'Astrid Beltran',sex:'F',age:33,weight:70,level:'Intermedio',
      habits:{water:{'2026-09-17':3}},
      payments:[{date:'2026-08-15',dueDate:'2026-09-15',amount:100000}]};
    window.__nube.routines=[{id:'r1',name:'Glúteo A',day:'Lunes',
      exercises:[{id:'e1',name:'Hip Thrust con Barra',muscle:'gluteo',sets:4,reps:'10'}]}];
    window.__nube.escrituras=0;
  };
  window.__reset();
  // 🔒 El stub copia la FORMA real de UD.readClientCol ({estado,row}) — un stub con la forma vieja
  //    fue lo que dio 5 rojos falsos en v612.
  UD.readClientCol=async()=>({estado:'ok',row:{profile:clon(window.__nube.profile),
    routines:clon(window.__nube.routines),updated_at:new Date().toISOString()}});
  UD.readPrTombs=async()=>((window.__nube.profile&&window.__nube.profile.prTombs)||null);
  const escribir=patch=>{ window.__nube.escrituras++;
    if(patch&&'profile' in patch) window.__nube.profile=clon(patch.profile);
    if(patch&&'routines' in patch) window.__nube.routines=clon(patch.routines);
    return {ok:true}; };
  UD.upsertOwn=async patch=>escribir(patch);
  UD.updateClientRow=async(cid,patch)=>escribir(patch);

  // Un «aparato» = el estado en memoria de una app ABIERTA: leyó la fila y desde entonces no se
  // enteró de nada de lo que hizo el otro. Eso es exactamente el caso del PO.
  // 🔒 Por eso recibe la FOTO de cuando abrió y NO lee la nube de ahora: montar el segundo aparato
  //    desde la nube ya escrita es montarlo recién abierto, y entonces no hay nada que pisar — el
  //    control de discriminación lo cazó (con la fusión apagada tampoco se perdía nada).
  window.__montar=function(rol,foto){
    const fila=clon(foto||window.__nube);
    const c=Object.assign({id:'cli-1'},fila.profile,{routines:fila.routines});
    DB.clients=[c]; DB.prs={}; DB.history={};
    if(rol==='coach'){
      CUR.loggedAs='coach'; CUR.clientId=null;
      _authUid='uid-coach';                     // binding de script: asignación pelada
      Object.keys(_coachSnap).forEach(k=>delete _coachSnap[k]);   // const: se MUTA
      _coachSnap['ax_c:cli-1']=_coachClientJSON(c);               // lo último confirmado = la base
      if(typeof COACH_OWN_ROW!=='undefined') COACH_OWN_ROW=null;
    } else {
      CUR.loggedAs='client'; CUR.clientId='cli-1';
      _authUid='uid-astrid';
      _authBaseSet({profile:clon(fila.profile),routines:clon(fila.routines)});
    }
    return DB.clients[0].name;
  };
  return true;
})()`;

// ── EL GUION: los dos aparatos, con la fusión encendida o apagada (su propio control) ────────
const guion = (conFusion, coachPrimero, edita = 'pago') => `(async()=>{
  window.__reset();
  const real=window.mergeOwnRow3;
  if(!${conFusion}) window.mergeOwnRow3=undefined;    // apaga v623 en las DOS vías
  const hechos=[];
  // La foto que LOS DOS tienen en memoria: abrieron antes de que ninguno escribiera.
  const foto=JSON.parse(JSON.stringify(window.__nube));
  try{
    for(const rol of (${coachPrimero}?['coach','tel']:['tel','coach'])){
      hechos.push(window.__montar(rol,foto));
      const c=DB.clients[0];
      if(rol==='coach'){
        if('${edita}'==='plan'){
          // 🏋️ el coach le añade un ejercicio a la rutina (lo que hace el constructor)
          c.routines[0].exercises=c.routines[0].exercises.concat(
            [{id:'e2',name:'Prensa de Pierna',muscle:'piernas',sets:3,reps:'12'}]);
        } else {
          // 💳 el coach registra el pago del mes (lo que hace \`registerPayment\`)
          c.payments=(c.payments||[]).concat([{date:'2026-09-17',dueDate:'2026-10-17',amount:100000}]);
        }
        await _persistCoachWrite('ax_c',DB.clients);
      } else {
        // 💧 ella suma dos vasos de agua (lo que hace \`waterAdd\`)
        c.habits=Object.assign({},c.habits,{water:Object.assign({},(c.habits||{}).water,{'2026-09-17':5})});
        await _persistAuthUser('ax_c',DB.clients);
      }
    }
  } finally { window.mergeOwnRow3=real; }
  const p=window.__nube.profile||{};
  return { montados:hechos.length, pagos:(p.payments||[]).length,
           agua:((p.habits||{}).water||{})['2026-09-17'], peso:p.weight,
           claves:Object.keys(p).length, rutinas:(window.__nube.routines||[]).length,
           ejercicios:(((window.__nube.routines||[])[0]||{}).exercises||[]).length,
           escrituras:window.__nube.escrituras };
})()`;

try {
  ok('la app arrancó de verdad (símbolo post-arranque)',
    await waitFor(`typeof window._aviUpdateBusy!=='undefined'`, 45000));
  ok('existen las dos vías reales de escritura y la fusión de v623',
    await ev(`typeof _persistCoachWrite==='function' && typeof _persistAuthUser==='function' && typeof mergeOwnRow3==='function'`) === true);
  ok('CONTROL DE MONTAJE: la nube de prueba quedó puesta', await ev(MONTAJE) === true);

  const con = await ev(guion(true, true));
  ok('CONTROL: el guion corrió — dos aparatos montados y dos escrituras a la nube',
    !!con && !con._error && con.montados === 2 && con.escrituras === 2, con);
  ok('🔒 el PAGO que registró el coach sobrevive al guardado del teléfono abierto',
    !!con && con.pagos === 2, { pagos: con && con.pagos });
  ok('🔒 y el AGUA que anotó ella no se pierde',
    !!con && con.agua === 5, { agua: con && con.agua });
  ok('🔒 no se cae nada más del perfil ni del plan por el camino',
    !!con && con.peso === 70 && con.claves >= 6 && con.rutinas === 1 && con.ejercicios === 1, con);

  const sin = await ev(guion(false, true));
  ok('🔒 CONTROL DE DISCRIMINACIÓN: con la fusión APAGADA el dato SÍ se pierde',
    !!sin && !sin._error && (sin.pagos === 1 || sin.agua !== 5), sin);

  const rev = await ev(guion(true, false));
  ok('🔒 en el orden contrario (ella primero, el coach después) tampoco se pierde nada',
    !!rev && rev.pagos === 2 && rev.agua === 5, rev);
  const revSin = await ev(guion(false, false));
  ok('🔒 CONTROL: en el orden contrario, sin fusión, también se pierde',
    !!revSin && !revSin._error && (revSin.pagos === 1 || revSin.agua !== 5), revSin);

  // ── El caso más delicado: el coach edita EL PLAN mientras el teléfono está abierto ─────────
  // Aquí es donde vive `sendRoutines`: el teléfono NO manda las rutinas que no tocó, porque su
  // copia en memoria puede ser vieja (el refresco en vivo no las cambia en pleno entreno).
  const plan = await ev(guion(true, true, 'plan'));
  ok('🔒 el EJERCICIO que el coach añadió al plan sobrevive al guardado del teléfono',
    !!plan && plan.ejercicios === 2 && plan.agua === 5, plan);
  const planSin = await ev(guion(false, true, 'plan'));
  ok('🔒 CONTROL: sin fusión, el teléfono le devuelve el plan viejo (el ejercicio se pierde)',
    !!planSin && !planSin._error && planSin.ejercicios === 1, planSin);

  console.log('\n  jsErrors:', JSON.stringify(jsErrors.slice(0, 3)));
  ok('sin errores JS', jsErrors.length === 0);
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
}
console.log(`\n${fail ? '❌' : '✅'} ${pass} OK · ${fail} fallos`);
process.exitCode = fail ? 1 : 0;
if (fail) process.exit(1);
