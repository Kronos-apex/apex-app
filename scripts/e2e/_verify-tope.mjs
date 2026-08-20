// _verify-tope.mjs — EL TOPE DE TARJETAS DE «HOY» (dirección B «El Compromiso», avi-v505).
//
// La regla que NO existía: `_todayOrder` ordena los 14 bloques y el modo día 1 apaga once de
// golpe, pero en un día normal nada limitaba CUÁNTAS salen a la vez. Medido sobre los 22
// asesorados reales: máximo 6 simultáneas, mediana 5, y les caen a las que MÁS entrenan.
//
// 🔴 LO QUE ESTE HARNESS PROTEGE, en orden de gravedad:
//   1. el tope NO puede tocar el entreno, la cabecera ni las HERRAMIENTAS del día (T4)
//   2. el tope APARTA, no silencia: lo apartado se abre y vuelve mañana (T5)
//   3. lo que se apaga con display:none se ENCIENDE de vuelta (clase v403 D5) (T6)
//   4. el orden es de PRIORIDAD, no el que llegue primero (T3)
// Sin login ni red. Capturas en claro y oscuro.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8831, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-tope';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9351', '--user-data-dir=' + process.env.TEMP + '/tope-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9351/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const evj = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
const viewport = async (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
await viewport(390, 844);
await waitFor(`!!document.getElementById('s-login') && typeof renderClientToday==='function' && !document.getElementById('avi-loading')`);
await sleep(1800);

// EL PEOR CASO REALISTA, armado con datos que disparan a las tarjetas POR SU CUENTA (no se les
// inyecta HTML: eso sería fabricarse el verde). Reproduce el perfil de las 4 personas que hoy
// llegan a 6 —Claudia, Luz, Miguel, Samuel— y le añade las 3 que solo viven en el teléfono.
const MONTAR = `((opts) => {try{
  opts=opts||{};
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const di=new Date().getDay(), hoy=days[di];
  // Rutina de un día YA PASADO de esta semana y sin entrenar → dispara «el día que se corrió».
  const pasado=days[di===0?6:(di-1)];
  const ex=(i)=>({id:'e'+i,name:'Ejercicio '+i,muscle:'Pierna',type:'Compuesto',sets:4,reps:'10'});
  const client={id:'tope',name:'Claudia Valbuena',sex:'F',level:'Intermedio',goal:'Ganar músculo',days:4,
    weight:62,height:163,age:31,activityFactor:1.55,createdAt:'2026-04-01T10:00:00.000Z',
    routines:[{id:'r1',name:'Pierna y glúteo',day:hoy,restSec:90,exercises:[0,1,2,3].map(ex)},
              {id:'r2',name:'Tren superior',day:pasado,restSec:90,exercises:[0,1,2].map(ex)}],
    habits:{water:{},steps:{}}};
  if(opts.libre)client.tier='libre';
  // Historial: 12 sesiones cerradas, ninguna hoy ni en el día pasado de esta semana.
  const hist=[];
  for(let i=1;i<=12;i++){ const d=new Date(Date.now()-(i*3+2)*86400000).toISOString();
    hist.push({id:'h'+i,sessionId:'s'+i,routineId:'r1',routineName:'Pierna y glúteo',date:d,finishedAt:d,
      doneSets:16,totalSets:16,totalVol:3000+i*40,
      exercises:[{name:'Ejercicio 0',sets:[{kg:40+i,reps:10,done:true}]}]}); }
  DB.clients=[client]; DB.history={tope:hist}; DB.prs={}; DB.bodyweight={};
  DB.nutrition = opts.libre?{}:{tope:{kcal:2100,prot:130,carbs:230,fat:60,water:8,goal:'mantenimiento'}};
  CUR.clientId='tope'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null;
  CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^ax_hbopen_|^coachmute_|^ax_missmute_|^ax_sharesnooze|^ax_news_seen|^ax_push_snooze|^ax_cmtynudge/.test(k)).forEach(k=>localStorage.removeItem(k));
  // Las tres del teléfono: permiso de notificaciones sin decidir y novedades sin ver.
  if(opts.local!==false){
    try{Object.defineProperty(window,'Notification',{value:{permission:'default'},configurable:true});}catch(e){}
    try{_pushCtx=_pushCtx||{clientId:'tope'};}catch(e){}
  }else{
    if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
  }
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return 'ok';
}catch(e){return 'err:'+e.message+' | '+((e.stack||'').split('\\n')[1]||'');}})`;

const montar = async (opts = {}) => {
  const r = await ev(`${MONTAR}(${JSON.stringify(opts)})`);
  if (String(r).startsWith('err:')) throw new Error('montaje: ' + r);
  await sleep(800);
};

const results = [];
console.log('\n──── comprobaciones ────');
const check = (n, c, x = '') => { const l = (c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : ''); results.push(l); console.log('  ' + l); };

// `abajo` lleva la FILA DE AVISOS a la vista: capturar solo el tope de la pantalla deja fuera
// justo lo que este harness viene a mirar (R2.6 — el elemento se captura EN VISTA).
async function shot(name, tema, abajo) {
  await ev(`typeof setTheme==='function' && setTheme('${tema}')`); await sleep(320);
  if (abajo) await ev(`(()=>{const m=document.querySelector('#cn-more .tod-more'); if(m&&m.scrollIntoView)m.scrollIntoView({block:'center'});})()`);
  else await ev(`(()=>{const b=document.querySelector('#s-client .cnbody'); if(b)b.scrollTop=0;})()`);
  await sleep(300);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}-${tema}.png`, Buffer.from(r.data, 'base64'));
}

// Estado leído del DOM: qué contenedores tienen algo Y se ven.
const ESTADO = `(()=>{const ids=TODAY_CARD_PRIORITY.concat(['cn-habits','cn-meals','qw-entry','cn-today-body','cn-today-head','cn-firstrun']);
  const vis=[], con=[], apagadas=[];
  ids.forEach(id=>{const e=document.getElementById(id); if(!e)return;
    const tiene=!!(e.innerHTML.trim()||id==='qw-entry');
    if(tiene)con.push(id);
    if(tiene&&e.style.display!=='none'&&!e.classList.contains('cap-off'))vis.push(id);
    if(e.classList.contains('cap-off'))apagadas.push(id);});
  const more=document.querySelector('#cn-more .tod-more');
  const rm=more?more.getBoundingClientRect():null;
  const body=document.querySelector('#s-client .cnbody');
  return {visibles:vis, conContenido:con, apagadas,
    mensajesVisibles:vis.filter(id=>TODAY_CARD_PRIORITY.indexOf(id)>=0),
    more:!!more, moreTxt:more?more.textContent.replace(/\\s+/g,' ').trim():'',
    moreAlto:rm?Math.round(rm.height):0,
    alto:body?body.scrollHeight:0, pantalla:body?body.clientHeight:0,
    desborde:Math.round(document.documentElement.scrollWidth-document.documentElement.clientWidth)};})()`;

// ══════════ LA MEDIDA · cuánto mide «Hoy» según el tope (esto ELIGE el número) ══════════
await montar();
// El original se guarda UNA vez: envolver el envuelto encadena los topes y las cinco filas
// salen iguales (pasó en la primera corrida — la medida era mía, no de la app).
await ev(`(()=>{window._planOrig=window._planOrig||todayCardPlan;})()`);
const medidas = {};
for (const n of [99, 3, 2, 1, 0]) {
  await ev(`(()=>{window.todayCardPlan=(p)=>window._planOrig(p,{max:${n}}); renderClientToday(DB.clients[0]);})()`);
  await sleep(600);
  const e = await evj(ESTADO);
  medidas[n] = { alto: e.alto, mensajes: e.mensajesVisibles.length, pantallas: Math.round(e.alto / e.pantalla * 10) / 10 };
}
await ev(`location.reload()`); await sleep(3000);
await waitFor(`typeof renderClientToday==='function' && !document.getElementById('avi-loading')`);
await sleep(1200);

// ══════════ T1 · el peor caso realista se arma solo ══════════
await montar();
let s = await evj(ESTADO);
check('T1 el fixture reproduce el peor caso real: al menos 4 tarjetas de mensaje QUIEREN salir',
  s.conContenido.filter(id => ['cn-deload', 'cn-missday', 'cn-coach-card', 'cn-push-nudge', 'cn-news', 'cn-cmty-nudge', 'cn-share', 'cn-today-upsell'].includes(id)).length >= 4,
  JSON.stringify({ conContenido: s.conContenido }));

// ══════════ T2 · el tope se aplica y lo apartado se CUENTA ══════════
check('T2 salen como máximo 2 tarjetas de mensaje, y una fila de una línea dice cuántas faltan',
  s.mensajesVisibles.length === 2 && s.more === true && /\d+ avisos? más/.test(s.moreTxt),
  JSON.stringify({ visibles: s.mensajesVisibles, fila: s.moreTxt }));
check('T2-bis táctil: la fila de avisos se puede pulsar (≥36 px)', s.moreAlto >= 36, JSON.stringify({ alto: s.moreAlto }));

// ══════════ T3 · gana la PRIORIDAD, no el orden de llegada ══════════
const prio = await evj(`TODAY_CARD_PRIORITY`);
const rank = id => prio.indexOf(id);
check('🔴 T3 las que salen son las de MÁS prioridad (lo que cambia su entreno, no lo que le pedimos)',
  s.mensajesVisibles.every(v => s.apagadas.every(o => rank(v) < rank(o))),
  JSON.stringify({ salen: s.mensajesVisibles, apartadas: s.apagadas }));

// ══════════ T4 · EL CANDADO: el tope no toca la pantalla ni las herramientas ══════════
const intocables = await evj(`(()=>{const ids=['cn-today-head','cn-today-body','cn-habits','cn-meals','qw-entry'];
  return ids.map(id=>{const e=document.getElementById(id);
    return {id, existe:!!e, visible:!!(e&&e.style.display!=='none'&&!e.classList.contains('cap-off')), capoff:!!(e&&e.classList.contains('cap-off'))};});})()`);
check('🔴 T4 el tope NO toca el entreno, la cabecera, la tira de hábitos, el plan de comida ni los rápidos',
  intocables.every(x => x.visible && !x.capoff), JSON.stringify(intocables.filter(x => !x.visible || x.capoff)));

// ══════════ T5 · APARTA, NO SILENCIA ══════════
await ev(`todayMoreToggle()`); await sleep(700);
let s2 = await evj(ESTADO);
check('🔴 T5 abrir la fila muestra TODAS las apartadas (nada se perdió)',
  s2.apagadas.length === 0 && s2.mensajesVisibles.length === s.mensajesVisibles.length + s.apagadas.length,
  JSON.stringify({ visiblesAhora: s2.mensajesVisibles, apagadas: s2.apagadas }));
await ev(`todayMoreToggle()`); await sleep(700);
s2 = await evj(ESTADO);
check('T5-bis se puede volver a cerrar y el tope se re-aplica igual',
  s2.mensajesVisibles.length === 2 && s2.apagadas.length === s.apagadas.length,
  JSON.stringify({ visibles: s2.mensajesVisibles, apartadas: s2.apagadas.length }));
// 🔴 Nada se marcó como visto: se vuelve a montar de cero y las mismas siguen queriendo salir.
await montar();
s2 = await evj(ESTADO);
check('🔴 T5-ter el tope NO silencia: al día siguiente las apartadas vuelven a competir',
  s2.conContenido.length === s.conContenido.length && s2.apagadas.length === s.apagadas.length,
  JSON.stringify({ antes: s.conContenido.length, ahora: s2.conContenido.length }));

// ══════════ T6 · LA RESTAURACIÓN (clase v403 D5) ══════════
// Si desaparece la causa de una tarjeta de más prioridad, la apartada tiene que ENCENDERSE.
const antesApagadas = s2.apagadas.slice();
await ev(`(()=>{const c=DB.clients[0];
  // Se calla «el día que se corrió» (la de rango 2) → una apartada tiene que subir.
  c.routines=c.routines.filter(r=>r.id!=='r2'); renderClientToday(c);})()`);
await sleep(700);
const s3 = await evj(ESTADO);
check('🔴 T6 (clase v403) al callarse una tarjeta, la apartada se ENCIENDE de vuelta',
  !s3.visibles.includes('cn-missday') && s3.mensajesVisibles.length === 2 &&
  s3.mensajesVisibles.some(id => antesApagadas.includes(id)),
  JSON.stringify({ antesApartadas: antesApagadas, ahoraVisibles: s3.mensajesVisibles }));

// ══════════ T7 · la fila aparece SI Y SOLO SI sobra algo ══════════
// Se afirma la propiedad, no un estado concreto: así vale en cualquier combinación y no depende
// de que el fixture logre apagar exactamente las tarjetas que yo creía.
const mensajesCon = e => e.conContenido.filter(id => prio.includes(id)).length;
check('T7 con avisos de sobra, la fila está', mensajesCon(s) > 2 && s.more === true,
  JSON.stringify({ conContenido: mensajesCon(s), fila: s.more }));
await montar({ local: false });
await ev(`(()=>{const c=DB.clients[0]; c.routines=c.routines.filter(r=>r.id!=='r2');
  try{delete window.Notification;}catch(e){}
  localStorage.setItem('ax_sharesnooze_tope',String(Date.now()+9e8));
  ['cn-push-nudge','cn-share','cn-cmty-nudge','cn-news'].forEach(id=>{const e=document.getElementById(id);if(e)e.innerHTML='';});
  _applyTodayCap();})()`);
await sleep(700);
const s4 = await evj(ESTADO);
check('T7-bis sin avisos de sobra NO aparece la fila (no se fabrica ruido donde no lo hay)',
  mensajesCon(s4) <= 2 && s4.more === false,
  JSON.stringify({ conContenido: s4.conContenido, fila: s4.more }));

// ══════════ T8 · el DÍA 1 sigue mandando ══════════
await montar();
await ev(`(()=>{DB.history={tope:[]}; renderClientToday(DB.clients[0]);})()`);
await sleep(800);
const s5 = await evj(ESTADO);
check('🔴 T8 el día 1 manda: solo la portada, ni tarjetas ni fila de avisos',
  s5.visibles.includes('cn-firstrun') && s5.mensajesVisibles.length === 0 && s5.more === false,
  JSON.stringify({ visibles: s5.visibles, fila: s5.more }));

// ══════════ T9 · 360 px y letra grande ══════════
await montar();
await shot('1-tope', 'light'); await shot('1-tope', 'dark');
await shot('2-fila', 'light', true); await shot('2-fila', 'dark', true);
await viewport(360, 640); await sleep(400);
await ev(`renderClientToday(DB.clients[0])`); await sleep(600);
let s6 = await evj(ESTADO);
check('T9 a 360 px la fila de avisos no desborda', s6.desborde === 0 && s6.more === true,
  JSON.stringify({ desborde: s6.desborde, fila: s6.more }));
await ev(`(()=>{document.documentElement.setAttribute('data-fs','xl');renderClientToday(DB.clients[0]);})()`);
await sleep(700);
s6 = await evj(ESTADO);
check('🔴 T9-bis (clase v452) con LETRA GRANDE la fila crece y no se sale a lo ancho',
  s6.desborde === 0 && s6.moreAlto >= 36, JSON.stringify({ desborde: s6.desborde, alto: s6.moreAlto }));
await shot('9-360-xl', 'light');
await ev(`document.documentElement.removeAttribute('data-fs')`);
await viewport(390, 844); await sleep(400);

check('Sin errores JS', jsErrors.length === 0, jsErrors.join(' | '));

console.log('\n──── LA MEDIDA · cuánto mide «Hoy» según el tope ────');
console.log('  (peor caso realista: el perfil de las 4 personas que hoy llegan a 6 tarjetas)');
Object.keys(medidas).sort((a, b) => b - a).forEach(n => {
  const m = medidas[n];
  console.log(`  tope ${n === '99' ? 'ninguno' : n.padStart(6)} → ${String(m.alto).padStart(5)} px · ${String(m.pantallas).padStart(4)} pantallas · ${m.mensajes} mensajes a la vez`);
});

console.log('\n──── EL TOPE DE TARJETAS (dirección B) ────');
const failed = results.filter(r => r.startsWith('❌'));
console.log('\njsErrors: ' + JSON.stringify(jsErrors));
console.log(failed.length ? `\n❌ ${failed.length} FALLARON` : '\n✅ TODO OK');
console.log('  capturas en:', OUT);
try { ws.close(); } catch {}
try { chrome.kill(); } catch {}
try { srv.kill(); } catch {}
process.exit(failed.length ? 1 : 0);
