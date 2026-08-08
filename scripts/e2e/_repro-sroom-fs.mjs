// ─────────────────────────────────────────────────────────────────────────────
// _repro-sroom-fs.mjs — LAS HABITACIONES CON LETRA GRANDE, ¿CRECEN?
//
// Defecto (auditoría de diseño del 2026-08-06, hallazgo 2): el ajuste «Tamaño de texto» del Perfil
// escala el contenido con `zoom`, pero la lista de selectores de `styles.css` sólo nombra `.cnp`,
// `#s-coach .panel`, `.gm-body` y `.md`. Las HABITACIONES (`.sroom`) no están → quien puso la letra
// en «Muy grande» sigue leyendo la habitación a 13 px. Son 7 habitaciones, y una de ellas es la de
// nutrición, que es texto denso.
//
// 🔴 POR QUÉ ESTE HARNESS NO SE FÍA DEL REPORTE: el hallazgo decía «falta `.sroom` en la lista».
// Aplicarlo literal sería un error — `.sroom` es `position:fixed;inset:0`, y `zoom` sobre él
// multiplica también la caja que ya ocupa el viewport entero: se sale de la pantalla. El objetivo
// correcto es el CONTENEDOR INTERNO (`.sroom-body` + `.sroom-bar`), que es exactamente lo que son
// `.cnp` y `.gm-body` en la lista que ya funciona. Por eso aquí se mide la consecuencia (¿el texto
// crece? ¿se desborda? ¿se puede volver?) y no la presencia de un selector en el CSS.
//
// QUÉ AFIRMA:
//   1. CONTROL de la sonda — `.cnp`, que SÍ está en la lista, tiene que crecer. Si no crece, la
//      sonda no sabe ver `zoom` y ninguna otra cifra de la corrida vale.
//   2. Las 7 habitaciones crecen con `lg` y con `xl`.
//   3. Ninguna se desborda a lo ancho en ningún tamaño (el ancho es el eje que SÍ depende del
//      motor: la lección de v452 es que altura y ancho no van bajo el mismo guard).
//   4. «‹ Volver» se sigue pudiendo pulsar (hit-testing, no un rect dentro del viewport).
//
//   node scripts/e2e/_repro-sroom-fs.mjs
// ─────────────────────────────────────────────────────────────────────────────
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { EMAIL, PASS } from './_creds.mjs';
import { afirmador, salir } from './_afirma.mjs';
const A = afirmador('habitaciones con letra grande');

const PORT = 8796, DP = 9296, APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-sroomfs-' + Date.now();
const OUT = (process.env.TEMP || '.').replace(/\\/g, '/') + '/avi-sroom-fs';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DP}`,
  '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP]);
async function findPage() { for (let i = 0; i < 60; i++) { try { const t = await (await fetch(`http://localhost:${DP}/json/list`)).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); A.verError(m); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
const shot = async n => { try { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); } catch {} };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(800);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(900);

await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
const dentro = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'&&!!CUR.clientId})()`, 30000);
A.ok(dentro, 'entró como asesorado');
for (let k = 0; k < 6; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(120); }
await ev(`(()=>{try{localStorage.setItem('ax_news_seen','9999');const t=document.getElementById('news-tour');if(t)t.classList.add('hidden');}catch(e){}})()`);

// Fixture RICO: una habitación vacía mide cuatro líneas y no puede desbordarse — el mismo error
// que dejó verde al harness de los modales. Se le dan sesiones, récords y un plan de nutrición
// para que cada habitación tenga texto de verdad que crecer.
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
  DB.nutrition[CUR.clientId]={kcal:2800,prot:170,carb:320,fat:78,water:10,meals:4,
    goal:'ganar_musculo',
    examples:'Desayuno: avena con leche y huevos\\nAlmuerzo: arroz, fríjol y pollo\\nCena: pescado con ensalada'};
})()`);
// Congelar el poll de la nube: repuebla DB con los datos reales (vacíos) de la cuenta QA.
await ev(`(()=>{try{clearInterval(_msgPollInt);}catch(e){}try{window.pollMessages=()=>{};}catch(e){}try{window._pollAuthData=()=>Promise.resolve();}catch(e){}try{window.syncFromCloud=()=>Promise.resolve();}catch(e){}})()`);
await ev(`document.fonts.ready`); await sleep(700);

// ── SONDA ────────────────────────────────────────────────────────────────────
// Mide el tamaño EFECTIVO en píxeles de pantalla, no el `font-size` computado: `zoom` NO cambia
// el font-size computado, cambia la caja pintada. Por eso se usa `getBoundingClientRect()`, que
// es lo que de verdad ve el ojo. Se elige el elemento con más texto para que la medida sea
// estable y no dependa de una etiqueta de dos letras.
const SONDA = sel => `(()=>{
  const raiz=document.querySelector('${sel}'); if(!raiz) return {falta:true};
  let mejor=null, largo=0;
  raiz.querySelectorAll('*').forEach(el=>{
    const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim().length>0)
      .map(n=>n.textContent.trim()).join('');
    const r=el.getBoundingClientRect();
    if(t.length>largo && r.height>0 && r.width>0){largo=t.length;mejor=el;}
  });
  if(!mejor) return {sinTexto:true};
  const r=mejor.getBoundingClientRect();
  return {alto:Math.round(r.height*100)/100, ancho:Math.round(r.width*100)/100,
          txt:mejor.textContent.trim().slice(0,26)};
})()`;

const DESBORDE = sel => `(()=>{
  const raiz=document.querySelector('${sel}'); if(!raiz) return {falta:true};
  const vw=window.innerWidth;
  let peor=0, culpable='';
  raiz.querySelectorAll('*').forEach(el=>{
    const r=el.getBoundingClientRect();
    const ex=Math.round(r.right-vw);
    if(ex>peor){peor=ex;culpable=(el.className||el.tagName)+'';}
  });
  return {vw, excesoPx:peor, culpable:culpable.slice(0,40)};
})()`;

// «‹ Volver» tiene que seguir siendo pulsable: si el zoom empuja la barra fuera de la pantalla,
// la habitación se convierte en una trampa sin salida. Hit-testing, no rect.
const VOLVER = `(()=>{
  const b=document.querySelector('.sroom.on .sroom-back'); if(!b) return {falta:true};
  const r=b.getBoundingClientRect(), vh=window.innerHeight, vw=window.innerWidth;
  const dentro = r.top>=0 && r.bottom<=vh && r.left>=0 && r.right<=vw;
  const cx=Math.min(vw-1,Math.max(0,(r.left+r.right)/2)), cy=Math.min(vh-1,Math.max(0,(r.top+r.bottom)/2));
  const el=document.elementFromPoint(cx,cy);
  return {dentro, alcanzable: dentro && !!el && (el===b||b.contains(el)), alto:Math.round(r.height)};
})()`;

const rid = await ev(`((DB.clients.find(x=>x.id===CUR.clientId).routines||[])[0]||{}).id`);
const HABITACIONES = [
  ['sesión',    `openSessionRoom(CUR.clientId,'h0')`,                       '#sroom-body'],
  ['ejercicio', `openExerciseRoom(CUR.clientId,'e13')`,                     '#exroom-body'],
  ['mes',       `(()=>{const d=new Date();openMonthRoom(CUR.clientId,d.getFullYear(),d.getMonth());})()`, '#mroom-body'],
  ['récord',    `openRecordRoom(CUR.clientId,'Sentadilla con Barra')`,      '#rroom-body'],
  ['músculo',   `openMuscleRoom(CUR.clientId,'piernas')`,                   null],
  ['nutrición', `openNutritionRoom(CUR.clientId)`,                          null],
  ['rutina',    `openRoutineRoom(CUR.clientId, ${JSON.stringify(rid || 'r0')})`, null],
];

const FS = ['', 'lg', 'xl'];
const MIN = { lg: 1.12, xl: 1.30 };   // los factores del CSS son 1.18 y 1.40; se deja holgura de redondeo

// ── 1) CONTROL DE LA SONDA ───────────────────────────────────────────────────
// `.cnp` YA está en la lista de `zoom` desde siempre. Si la sonda no lo ve crecer, no sabe medir
// `zoom` y hay que arreglar la sonda, no la app. Sin este control, un «no crece» en las
// habitaciones no distingue entre un defecto y una sonda ciega.
{
  const m = {};
  for (const fs of FS) {
    await ev(`applyTextSize('${fs}')`); await sleep(350);
    const puesto = await ev(`document.documentElement.getAttribute('data-fs')`);
    A.ok(fs === '' ? !puesto : puesto === fs, `CONTROL · el ajuste «${fs || 'normal'}» quedó puesto de verdad`, { puesto });
    m[fs || 'normal'] = await ev(SONDA('.cnp'));
  }
  const base = m.normal?.alto || 0;
  for (const fs of ['lg', 'xl']) {
    const r = base ? m[fs].alto / base : 0;
    A.ok(r >= MIN[fs], `CONTROL · la sonda VE el zoom: .cnp crece ×${r.toFixed(2)} con «${fs}» (≥${MIN[fs]})`,
      { base, alto: m[fs]?.alto, txt: m[fs]?.txt });
  }
}

// ── 2) LAS 7 HABITACIONES ────────────────────────────────────────────────────
for (const [nombre, abrir, bodyId] of HABITACIONES) {
  await ev(`applyTextSize('')`); await sleep(200);
  await ev(`document.querySelectorAll('.sroom.on').forEach(r=>r.classList.remove('on'));try{AVINAV.layers=0;}catch(e){}`);
  await sleep(200);
  await ev(abrir); await sleep(900);
  const abierta = await ev(`!!document.querySelector('.sroom.on')`);
  A.ok(abierta, `${nombre}: la habitación abre`, abierta);
  if (!abierta) continue;
  const sel = bodyId || '.sroom.on .sroom-body';

  const m = {};
  for (const fs of FS) {
    await ev(`applyTextSize('${fs}')`); await sleep(400);
    m[fs || 'normal'] = await ev(SONDA(sel));
    const d = await ev(DESBORDE('.sroom.on'));
    // El ancho es el eje que SÍ depende del motor (lección de v452): se afirma en los tres tamaños.
    A.ok(!d.falta && d.excesoPx <= 1,
      `${nombre} · ${fs || 'normal'}: no se desborda a lo ancho (exceso ${d.excesoPx}px)`, d);
    const v = await ev(VOLVER);
    A.ok(!!v.alcanzable, `${nombre} · ${fs || 'normal'}: «‹ Volver» se puede pulsar`, v);
    if (!v.alcanzable || (d.excesoPx > 1)) await shot(`${nombre}-${fs || 'normal'}-FAIL`);
  }

  // CONTROL por habitación: si la sonda no encontró texto, esta habitación no se midió y no se
  // da por buena en silencio (un verde sobre lo que no se vio).
  const base = m.normal?.alto || 0;
  A.ok(base > 0, `${nombre}: la sonda encontró texto que medir`, m.normal);
  if (!base) continue;
  for (const fs of ['lg', 'xl']) {
    const r = m[fs].alto / base;
    A.ok(r >= MIN[fs],
      `${nombre} · «${fs}»: el texto crece ×${r.toFixed(2)} (≥${MIN[fs]})`,
      { base, alto: m[fs].alto, txt: m[fs].txt });
  }
}

await ev(`applyTextSize('')`);
ws.close();
salir(A, { chrome, srv, out: OUT });
