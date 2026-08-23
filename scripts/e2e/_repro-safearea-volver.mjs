// ─────────────────────────────────────────────────────────────────────────────
// _repro-safearea-volver.mjs — «VOLVER» BAJO LA ISLA DINÁMICA (reporte de Kathe, iPhone)
//
// EL REPORTE: Kathe entra a una habitación y no puede salir. El botón «‹ Volver» está tan pegado
// arriba que no lo alcanza, y para regresar a la rutina tiene que CERRAR Y ABRIR la app.
//
// LA HIPÓTESIS QUE SE MIDE: AVI se instala como PWA (`"display":"standalone"` en manifest.json) y
// declara `viewport-fit=cover`. En standalone la webview ocupa la pantalla ENTERA, incluida la
// franja del reloj y la isla dinámica; con `viewport-fit=cover` el contenido se mete debajo. iOS
// publica esa franja en `env(safe-area-inset-top)` para que uno la respete — 59 px en los iPhone
// con isla dinámica, 47 en los del notch.
//   `.sroom` es `position:fixed;inset:0` → su borde superior ES el borde de la pantalla.
//   `.sroom-bar` es `position:sticky;top:0;padding:13px 16px` → NO nombra el área segura.
// Si la hipótesis es correcta, «Volver» queda pintado DEBAJO del reloj: se ve (o ni eso) pero el
// dedo no lo alcanza, porque ahí manda el sistema. Es exactamente el síntoma reportado.
//
// 🔴 POR QUÉ NO BASTA EL HIT-TESTING QUE YA TIENE `_repro-sroom-fs.mjs`: `elementFromPoint` vive
// dentro del viewport del navegador y el viewport SÍ incluye la franja del sistema. Un botón
// tapado por el reloj del iPhone sale «alcanzable» en esa prueba — y por eso lleva meses verde
// mientras Kathe no puede volver. Lo que hay que medir es GEOMETRÍA contra la línea del área
// segura, no si un punto pertenece al elemento.
//
// QUÉ AFIRMA:
//   0a. CONTROL DE LA SONDA — la sustitución del `env()` tiene que haber llegado al CSS servido.
//       Si no llegó, el inset vale 0, todo sale «despejado» y NINGUNA cifra de la corrida vale.
//   0b. CONTROL DE LA APP — `.exlb-close` (el cierre del visor de fotos) SÍ nombra el área segura
//       en el css. Tiene que salir despejado. Sin este control, un «todo tapado» podría ser que
//       la sonda mide mal, no que la app esté rota.
//   1.  En las 7 habitaciones, «‹ Volver» queda ENTERO por debajo de la línea del área segura.
//   2.  El área PULSABLE de «Volver» (barrida con elementFromPoint, no `rect.height`) llega a los
//       44 px de alto que pide la guía de Apple.
//   3.  El nav del panel del coach — mismo defecto de clase — tampoco arranca bajo la franja.
//
//   node scripts/e2e/_repro-safearea-volver.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { EMAIL, PASS } from './_creds.mjs';
import { afirmador, salir } from './_afirma.mjs';
const A = afirmador('«Volver» bajo el área segura del iPhone');

// iPhone 14/15/16 Pro — isla dinámica. El caso más común hoy y el peor de los tres.
const INSET = 59;
const HIG_MIN = 44;   // objetivo táctil mínimo de la Human Interface Guidelines de Apple

const PORT = 8799, DP = 9299, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-safearea-' + Date.now();
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-safearea';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
  '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=393,852', APP]);
async function findPage() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
const eventos = [];
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.method) eventos.forEach(f => f(m)); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); } catch {} };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true });

// ── EMULAR EL ÁREA SEGURA DEL IPHONE ─────────────────────────────────────────
// Chrome de escritorio resuelve `env(safe-area-inset-*)` a 0 y NO trae `Emulation.setSafeAreaInsets`
// (probado: el método no existe en 151.0.7922). Así que el iPhone se simula donde de verdad importa:
// se intercepta `styles.css` al vuelo y se sustituye `env(safe-area-inset-top)` por el valor real del
// teléfono. La sustitución es TEXTUAL y ciega: toca las reglas que nombran el área segura y no toca
// las que no la nombran — que es exactamente la diferencia que se está investigando.
let reescritas = 0;
eventos.push(async m => {
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = m.params;
  try {
    if (!/styles\.css/.test(request.url)) { await send('Fetch.continueRequest', { requestId }); return; }
    const b = await send('Fetch.getResponseBody', { requestId });
    let css = b.base64Encoded ? Buffer.from(b.body, 'base64').toString('utf8') : b.body;
    const antes = css;
    css = css.replace(/env\(safe-area-inset-top\)/g, `${INSET}px`)
             .replace(/env\(safe-area-inset-bottom\)/g, '34px');
    if (css !== antes) reescritas++;
    await send('Fetch.fulfillRequest', { requestId, responseCode: 200,
      responseHeaders: [{ name: 'content-type', value: 'text/css; charset=utf-8' }],
      body: Buffer.from(css, 'utf8').toString('base64') });
  } catch (e) { try { await send('Fetch.continueRequest', { requestId }); } catch {} }
});
// La caché de Chrome puede servir styles.css sin pasar por la interceptacion (la pagina ya
// se cargo al arrancar el navegador) → el control salta con 0 reescrituras. Se apaga.
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Response' }] });
await sleep(300);

await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(900);

// ── 0a) CONTROL DE LA SONDA ──────────────────────────────────────────────────
// Si la sustitución no llegó, `env(...)` sigue valiendo 0, todo saldrá «despejado» y la corrida
// entera sería un verde mentiroso. Se comprueba ANTES de nada.
const llegó = A.ok(reescritas >= 1, `CONTROL sonda: se reescribió el área segura en styles.css (${reescritas} respuesta/s)`, { reescritas });
if (!llegó) {
  console.log('\n  🔴 La simulación del iPhone NO llegó al CSS. Ninguna medida de abajo significa nada.');
  await salir(A, { chrome, srv, out: OUT });
}

// ── LOGIN + FIXTURE (mismo arranque que _repro-sroom-fs.mjs) ─────────────────
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
const dentro = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'&&!!CUR.clientId})()`, 30000);
A.ok(dentro, 'entró como asesorado');
for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(120); }
await ev(`(()=>{try{localStorage.setItem('ax_news_seen','9999');const t=document.getElementById('news-tour');if(t)t.classList.add('hidden');}catch(e){}})()`);
await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.tier='premium';c.weight=c.weight||74;c.height=c.height||176;c.goal=c.goal||'ganar_musculo';c.sex=c.sex||'M';c.age=c.age||30;c.activityFactor=c.activityFactor||1.55;
  DB.history=DB.history||{};
  const mk=(d,name,rid,exs,extra)=>{const dt=new Date();dt.setDate(dt.getDate()-d);const sets=exs.reduce((a,e)=>a+e[3],0);return Object.assign({id:'h'+d,routineId:rid,routineName:name,date:dt.toISOString(),startedAt:new Date(dt.getTime()-52*60000).toISOString(),totalVol:3400-d*30,doneSets:sets,totalSets:sets,exercises:exs.map(([eid,nm,m,n,kg])=>({id:eid,muscle:m,name:nm,track:'peso_reps',sets:Array.from({length:n},()=>({kg:String(kg),reps:'10',done:true}))}))},extra||{});};
  DB.history[CUR.clientId]=[
    mk(0,'Pierna','r0',[['e13','Sentadilla con Barra','piernas',4,120],['e1','Press de Banca','pecho',3,80]],{durationSec:3120,kcal:331,feeling:4}),
    mk(2,'Espalda','r1',[['e4','Peso Muerto','espalda',4,100],['e9','Curl de Bíceps','biceps',3,20]],{durationSec:2700,kcal:288}),
    mk(5,'Pierna','r0',[['e13','Sentadilla con Barra','piernas',3,100],['e1','Press de Banca','pecho',3,70]],{durationSec:2400,kcal:250})];
  DB.prs=DB.prs||{};DB.prs[CUR.clientId]={
    e13:{val:120,unit:'kg',reps:5,kg:120,name:'Sentadilla con Barra',muscle:'piernas',date:new Date().toISOString()},
    e1:{val:80,unit:'kg',reps:6,kg:80,name:'Press de Banca',muscle:'pecho',date:new Date().toISOString()}};
  DB.nutrition=DB.nutrition||{};
  DB.nutrition[CUR.clientId]={kcal:2800,prot:170,carb:320,fat:78,water:10,meals:4,goal:'ganar_musculo',
    examples:'Desayuno: avena con leche y huevos\\nAlmuerzo: arroz, fríjol y pollo\\nCena: pescado con ensalada'};
})()`);
await ev(`(()=>{try{clearInterval(_msgPollInt);}catch(e){}try{window.pollMessages=()=>{};}catch(e){}try{window._pollAuthData=()=>Promise.resolve();}catch(e){}try{window.syncFromCloud=()=>Promise.resolve();}catch(e){}})()`);
await ev(`document.fonts.ready`); await sleep(700);

// ── 0b) CONTROL DE LA APP ────────────────────────────────────────────────────
// `.exlb-close` declara `top:max(16px,calc(env(safe-area-inset-top)+8px))`. Es CSS real de la app
// sobre un elemento real. Si ESTE también saliera tapado, el defecto estaría en la sonda.
const ctrlApp = await ev(`(()=>{
  const w=document.createElement('div'); w.className='exlb'; w.style.cssText='display:block;opacity:1;visibility:visible';
  const b=document.createElement('button'); b.className='exlb-close'; b.textContent='×';
  w.appendChild(b); document.body.appendChild(w);
  const r=b.getBoundingClientRect();
  const out={top:Math.round(r.top), bottom:Math.round(r.bottom), alto:Math.round(r.height)};
  w.remove(); return out;
})()`);
// max(16px, 59+8) = 67 → si sale 16, la sustitución no tocó la cascada y la corrida no vale.
A.ok(ctrlApp.top === INSET + 8, `CONTROL app: «×» del visor SÍ respeta el área segura — arranca en y=${ctrlApp.top} (esperado ${INSET + 8})`, ctrlApp);

// ── LA SONDA ─────────────────────────────────────────────────────────────────
// No pregunta «¿el punto central pertenece al botón?» (eso ya sale verde hoy y Kathe sigue
// atrapada). Pregunta dónde está el botón respecto de la franja que gobierna el sistema.
// El ALTO PULSABLE no es `rect.height`: el ::after invisible extiende el área más allá del pill.
// Se mide barriendo con `elementFromPoint`, que es lo que hace el dedo — cuántas filas de píxeles
// aciertan de verdad en el botón.
const VOLVER = `(()=>{
  const b=document.querySelector('.sroom.on .sroom-back'); if(!b) return {falta:true};
  const r=b.getBoundingClientRect();
  const top=Math.round(r.top), bottom=Math.round(r.bottom);
  const cx=(r.left+r.right)/2;
  let pulsable=0;
  for(let y=Math.floor(r.top)-14; y<=Math.ceil(r.bottom)+14; y++){
    if(y<0||y>=window.innerHeight) continue;
    const el=document.elementFromPoint(cx,y);
    if(el && (el===b || b.contains(el))) pulsable++;
  }
  return {top, bottom, alto:Math.round(r.height), pulsable,
    tapadoEntero: bottom <= ${INSET},
    tapadoAMedias: top < ${INSET} && bottom > ${INSET},
    despejado: top >= ${INSET},
    pxUtiles: Math.max(0, bottom - Math.max(top, ${INSET}))};
})()`;


// ── BARRIDO DE LA CLASE ──────────────────────────────────────────────────────
// «Volver» es el caso que reportó Kathe; la CLASE es «un control pulsable pintado debajo de la
// franja del sistema». No se puede decidir leyendo el CSS —`.prog-anchors` es sticky en top:0 y
// está PERFECTA, porque su scroller (`.cnbody`) empieza debajo de una barra que sí reserva el
// área— así que se mide en el DOM vivo, superficie por superficie.
const BARRIDO = `(()=>{
  const out=[];
  document.querySelectorAll('button,a,input,select,textarea,[onclick],[role="button"]').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.width<=0||r.height<=0) return;
    const cs=getComputedStyle(el);
    if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)<0.05) return;
    if(r.top>=${INSET}) return;   // despejado de la franja
    if(r.bottom<=0) return;       // scrolleado fuera de la pantalla, no lo tapa el sistema
    let n=el.tagName.toLowerCase();
    if(el.id) n+='#'+el.id;
    else if(typeof el.className==='string'&&el.className.trim()) n+='.'+el.className.trim().split(/\s+/)[0];
    out.push({el:n, top:Math.round(r.top), bottom:Math.round(r.bottom),
              txt:(el.innerText||el.value||'').replace(/\s+/g,' ').trim().slice(0,22)});
  });
  return out;
})()`;
const tapados = [];
const anota = async (donde) => {
  const l = await ev(BARRIDO);
  if (Array.isArray(l)) l.forEach(x => tapados.push(Object.assign({ donde }, x)));
};

const rid = await ev(`((DB.clients.find(x=>x.id===CUR.clientId).routines||[])[0]||{}).id`);
const HABITACIONES = [
  ['sesión',    `openSessionRoom(CUR.clientId,'h0')`],
  ['ejercicio', `openExerciseRoom(CUR.clientId,'e13')`],
  ['mes',       `(()=>{const d=new Date();openMonthRoom(CUR.clientId,d.getFullYear(),d.getMonth());})()`],
  ['récord',    `openRecordRoom(CUR.clientId,'Sentadilla con Barra')`],
  ['músculo',   `openMuscleRoom(CUR.clientId,'piernas')`],
  ['nutrición', `openNutritionRoom(CUR.clientId)`],
  ['rutina',    `openRoutineRoom(CUR.clientId, ${JSON.stringify(rid || 'r0')})`],
];

console.log(`\n  Línea del área segura del iPhone: y = ${INSET} px. Todo lo que quede por encima lo tapa el sistema.\n`);
const fila = (a, b, c, d, e) => console.log('  ' + String(a).padEnd(12) + String(b).padStart(6) + String(c).padStart(8) + String(d).padStart(7) + '   ' + e);
fila('HABITACIÓN', 'top', 'bottom', 'puls.', 'veredicto');
console.log('  ' + '─'.repeat(74));

let tapadas = 0, chicas = 0;
for (const [nombre, abrir] of HABITACIONES) {
  await ev(`document.querySelectorAll('.sroom.on').forEach(r=>r.classList.remove('on'));try{AVINAV.layers=0;}catch(e){}`);
  await sleep(220);
  await ev(abrir); await sleep(900);
  const abierta = await ev(`!!document.querySelector('.sroom.on')`);
  if (!A.ok(abierta, `habitación «${nombre}» abre`)) continue;
  const v = await ev(VOLVER);
  if (v.falta) { A.ok(false, `«${nombre}»: no se encontró «Volver»`); continue; }
  const veredicto = v.tapadoEntero ? '🔴 TAPADO ENTERO por el sistema'
                  : v.tapadoAMedias ? `🟡 tapado a medias — quedan ${v.pxUtiles}px útiles`
                  : '🟢 despejado';
  fila(nombre, v.top, v.bottom, v.pulsable, veredicto);
  if (!v.despejado) tapadas++;
  if (v.pulsable < HIG_MIN) chicas++;
  await anota('habitación ' + nombre);
  if (nombre === 'nutrición') await shot('nutricion-volver');
}

await ev(`document.querySelectorAll('.sroom.on').forEach(r=>r.classList.remove('on'));try{AVINAV.layers=0;}catch(e){}`);
await sleep(400);
for (const tab of ['cn-today', 'cn-routines', 'cn-history', 'cn-profile']) {
  await ev(`(()=>{try{cnGo('${tab}');}catch(e){}})()`); await sleep(600);
  await anota('pestaña ' + tab);
}

console.log('');
if (tapados.length) {
  console.log('  Controles pulsables DENTRO de la franja del sistema:');
  tapados.forEach(t => console.log(`    ${t.donde}: ${t.el}  y=${t.top}..${t.bottom}  "${t.txt}"`));
}
A.ok(tapados.length === 0, `BARRIDO: ningún control pulsable cae bajo la franja del sistema (${HABITACIONES.length} habitaciones + 4 pestañas)`, tapados.slice(0, 6));

A.ok(tapadas === 0, `«Volver» despejado del área segura en las ${HABITACIONES.length} habitaciones`, { tapadas, de: HABITACIONES.length });
A.ok(chicas === 0, `«Volver» ofrece al menos ${HIG_MIN}px de alto pulsable (guía de Apple)`, { porDebajo: chicas, de: HABITACIONES.length });

// ── 3) LA MISMA CLASE DE DEFECTO EN EL PANEL DEL COACH ───────────────────────
// `.sidebar` es `position:fixed;top:0` con `padding:16px` fijo: su primer hijo (el logo «AVI ·
// Panel del Coach») cae en la misma franja. No es la pantalla de Kathe, pero es el mismo error.
await ev(`document.querySelectorAll('.sroom.on').forEach(r=>r.classList.remove('on'));try{AVINAV.layers=0;}catch(e){}`);
const nav = await ev(`(()=>{
  const n=document.createElement('nav'); n.className='sidebar open';
  const hijo=document.createElement('div'); hijo.textContent='AVI · Panel del Coach';
  n.appendChild(hijo); document.body.appendChild(n);
  const r=hijo.getBoundingClientRect();
  const out={top:Math.round(r.top), padTop:Math.round(parseFloat(getComputedStyle(n).paddingTop))};
  n.remove(); return out;
})()`);
A.ok(nav.top >= INSET,
  `panel del coach: lo primero del menú lateral arranca en y=${nav.top} (línea: ${INSET})`, nav);

await salir(A, { chrome, srv, out: OUT });
