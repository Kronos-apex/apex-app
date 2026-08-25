// _verify-renovacion.mjs — EL RECORDATORIO DE RENOVACIÓN (avi-v540).
//
// Decisión del PO (25-ago): el aviso le llega AL ASESORADO, 3 días antes, SIN cifras y sin número
// de cuenta, y abre el chat con su coach. *«Un recordatorio de pago sin que sea incómodo.»*
//
// 🔴 POR QUÉ HACE FALTA UN HARNESS Y NO BASTA LA SUITE: lo que había —`renderPaymentCard`, la
// tarjeta de cobro de ≤7 días— es letra muerta desde siempre y la suite nunca lo notó, porque
// depende de un dato que el teléfono del asesorado NO PUEDE LEER (el Nequi vive en la fila del
// coach y la RLS de `user_data` es por dueño). Un motor puro en verde no prueba que algo se PINTE.
//
// LO QUE PROTEGE, en orden de gravedad:
//   1. la banda se PINTA de verdad en la pantalla del asesorado (R1-R2)
//   2. NO nombra plata: ni monto, ni Nequi, ni cuenta (R3) ← la decisión del PO
//   3. su acción abre el chat con el coach y se puede pulsar de verdad (R4)
//   4. a quien no se le cobra NO le llega (R5, cortesía de v539) — con su control
//   5. jamás se apila con la banda de gracia: son excluyentes (R6)
//   6. quien nunca ha pagado no recibe un cobro el día que estrena la app (R7)
// Sin login ni red. Capturas en claro y oscuro, MIRADAS.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8836, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-renov';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9356', '--user-data-dir=' + process.env.TEMP + '/renov-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9356/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const evj = async e => JSON.parse(await ev(`JSON.stringify(${e})`));
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderClientToday==='function' && !document.getElementById('avi-loading')`);
await sleep(1800);

// El montaje: una asesorada normal, con historial, cuyo plan vence en N días. Las fechas van
// RELATIVAS a hoy (lección del fixture con fechas absolutas, que mide una app distinta cada día).
const MONTAR = `((opts) => {try{
  opts=opts||{};
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const hoy=days[new Date().getDay()];
  const iso=n=>new Date(Date.now()+n*86400000).toISOString();
  const ex=i=>({id:'e'+i,name:'Ejercicio '+i,muscle:'Pierna',type:'Compuesto',sets:4,reps:'10'});
  const client={id:'ren',name:'Claudia Valbuena',sex:'F',level:'Intermedio',goal:'Ganar músculo',days:4,
    weight:62,height:163,age:31,activityFactor:1.55,createdAt:iso(-120),
    routines:[{id:'r1',name:'Pierna y glúteo',day:hoy,restSec:90,exercises:[0,1,2,3].map(ex)}],
    habits:{water:{},steps:{}}};
  if(opts.pagos!==false) client.payments=[{date:iso(-30+ (opts.vence||0)),dueDate:iso(opts.vence||0),amount:130000,note:''}];
  if(opts.courtesy) client.courtesy=true;
  if(opts.suspended) client.suspended=true;
  const hist=[];
  for(let i=1;i<=8;i++){ const d=new Date(Date.now()-(i*3+2)*86400000).toISOString();
    hist.push({id:'h'+i,sessionId:'s'+i,routineId:'r1',routineName:'Pierna y glúteo',date:d,finishedAt:d,
      doneSets:16,totalSets:16,totalVol:3000+i*40,exercises:[{name:'Ejercicio 0',sets:[{kg:40+i,reps:10,done:true}]}]}); }
  DB.clients=[client]; DB.history={ren:hist}; DB.prs={}; DB.bodyweight={}; DB.nutrition={};
  CUR.clientId='ren'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null;
  CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^coachmute_|^ax_missmute_|^ax_sharesnooze|^ax_push_snooze|^ax_cmtynudge/.test(k)).forEach(k=>localStorage.removeItem(k));
  if(typeof AVI_NEWS!=='undefined')localStorage.setItem('ax_news_seen',String(AVI_NEWS.reduce((m,x)=>Math.max(m,x.v),0)));
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
  await sleep(700);
};

// Lo que la persona ve en la banda, leído del DOM VIVO (nada de mirar el código fuente).
const BANDA = `(()=>{const el=document.getElementById('cn-grace');
  if(!el)return {existe:false};
  const b=el.querySelector('.gband');
  const btn=el.querySelector('.gband-b');
  const r=b?b.getBoundingClientRect():null, rb=btn?btn.getBoundingClientRect():null;
  // innerText aplica text-transform: es lo que se LEE de verdad (gotcha v453).
  const txt=b?(b.innerText||'').replace(/\\s+/g,' ').trim():'';
  return {existe:!!b, txt, alto:r?Math.round(r.height):0, ancho:r?Math.round(r.width):0,
    visible:!!(r&&r.height>0&&el.style.display!=='none'),
    btn:btn?(btn.innerText||'').trim():'', btnAlto:rb?Math.round(rb.height):0,
    suave:!!(b&&b.classList.contains('gband-soft')),
    fondo:b?getComputedStyle(b).backgroundColor:'', titulo:b?getComputedStyle(b.querySelector('.gband-t')).color:'',
    // ¿el toque le llega al botón o hay algo encima? (clase del banner que robaba el toque)
    btnPulsable: rb? (()=>{const e=document.elementFromPoint(rb.left+rb.width/2, rb.top+rb.height/2);
      return !!(e && (e===btn || btn.contains(e)));})() : false,
    accion: btn?(btn.getAttribute('onclick')||''):''};})()`;

const results = [];
console.log('\n──── comprobaciones ────');
const check = (n, c, x = '') => { const l = (c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : ''); results.push(l); console.log('  ' + l); };

async function shot(name, tema) {
  await ev(`typeof setTheme==='function' && setTheme('${tema}')`); await sleep(320);
  await ev(`(()=>{const b=document.getElementById('cn-grace'); if(b&&b.scrollIntoView)b.scrollIntoView({block:'center'});})()`);
  await sleep(300);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}-${tema}.png`, Buffer.from(r.data, 'base64'));
}

// ══════════ R1 · la banda se PINTA los 3 días previos, y no antes ══════════
await montar({ vence: 2 });
let b = await evj(BANDA);
check('R1 la banda se pinta en la pantalla del asesorado cuando faltan 2 días',
  b.existe && b.visible && b.alto > 40, JSON.stringify({ alto: b.alto, ancho: b.ancho }));
check('R2 dice CUÁNDO se renueva, con la fecha, sin que la persona tenga que calcular nada',
  /renueva en 2 días/i.test(b.txt) && /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i.test(b.txt),
  b.txt.slice(0, 120));

// ══════════ R3 · LA DECISIÓN DEL PO: ni un peso en pantalla ══════════
// El fixture SÍ trae `amount: 130.000` a propósito: si la banda lo pintara, aquí se vería.
check('R3 🔒 no nombra plata: ni monto, ni Nequi, ni número de cuenta',
  !/\$|130|nequi|cop|pesos|paga|pago/i.test(b.txt), b.txt);

// ══════════ R4 · su única acción abre el chat con el coach, y se puede pulsar ══════════
check('R4 su acción es hablar con el coach, mide ≥36px y el toque LE LLEGA (nada encima)',
  /coach/i.test(b.btn) && /cn-messages/.test(b.accion) && b.btnAlto >= 36 && b.btnPulsable,
  JSON.stringify({ btn: b.btn, alto: b.btnAlto, pulsable: b.btnPulsable }));

// El TONO es una decisión del PO, no un detalle: «sin que sea incómodo». La banda de vencido va
// en naranja de alerta; esta llega ANTES de que pase nada y va en el azul de información.
const alerta = await (async () => { await montar({ vence: -3 }); const g = await evj(BANDA); await montar({ vence: 2 }); return g; })();
b = await evj(BANDA);
check('R4b 🔒 el recordatorio NO se pinta con el rojo/naranja de «vencido»: es aviso, no alarma',
  b.suave && b.fondo !== alerta.fondo && b.titulo !== alerta.titulo,
  JSON.stringify({ renov: b.fondo, vencido: alerta.fondo }));

await shot('renov', 'light'); await shot('renov', 'dark');

// ══════════ R5 · a quien no se le cobra, NO le llega (v539) ══════════
await montar({ vence: 2, courtesy: true });
let c = await evj(BANDA);
check('R5 🔒 en CORTESÍA no aparece nada (a esta persona no se le cobra)', !c.existe, JSON.stringify(c));
await montar({ vence: 2, suspended: true });
c = await evj(BANDA);
check('R5b un asesorado suspendido tampoco recibe recordatorio de cobro', !c.existe, JSON.stringify(c));

// ══════════ R6 · nunca se apilan las dos bandas ══════════
await montar({ vence: -3 });
c = await evj(BANDA);
check('R6 ya vencido → sale la banda de GRACIA, y sale UNA sola vez',
  c.existe && /venci/i.test(c.txt) && !/se renueva en/i.test(c.txt), c.txt.slice(0, 110));
const cuantas = await ev(`document.querySelectorAll('#cn-grace .gband').length`);
check('R6b una sola banda de estado de cuenta en toda la pantalla', cuantas === 1, 'gband=' + cuantas);

// ══════════ R7 · quien nunca ha pagado no recibe un cobro ══════════
await montar({ vence: 2, pagos: false });
c = await evj(BANDA);
check('R7 sin pagos registrados (asesorado nuevo) NO se le pide renovar nada', !c.existe, JSON.stringify(c));

// ══════════ R8 · fuera de la ventana, silencio ══════════
await montar({ vence: 8 });
c = await evj(BANDA);
check('R8 faltando 8 días la app se calla (el aviso vive en los 3 previos)', !c.existe, JSON.stringify(c));

// ══════════ R9 · CONTROL DE MONTAJE ══════════
// Sin esto, un fixture que no monte nada dejaría R5/R7/R8 en verde por vacío.
await montar({ vence: 1 });
c = await evj(BANDA);
check('R9 🔒 CONTROL: con el mismo montaje y 1 día, la banda SÍ vuelve a salir',
  c.existe && /mañana/i.test(c.txt), c.txt.slice(0, 110));

console.log('\njsErrors:', JSON.stringify(jsErrors));
const fallos = results.filter(r => r.startsWith('❌')).length;
console.log(`\n${fallos ? '❌' : '✅'} ${results.length - fallos}/${results.length} comprobaciones` + (fallos ? ' — ' + fallos + ' FALLARON' : ' · TODO OK'));
console.log('capturas en ' + OUT);
try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(fallos || jsErrors.length ? 1 : 0);
