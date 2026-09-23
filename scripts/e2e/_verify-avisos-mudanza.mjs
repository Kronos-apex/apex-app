// _verify-avisos-mudanza.mjs — v665 · A QUIEN SE MUDÓ Y PERDIÓ SUS AVISOS SE LE RECUERDA ACTIVARLOS.
//
// Pedido del PO (23-sep): «recuérdale a las personas que se mudaron activar las notificaciones».
// El permiso de avisos es por dirección: al saltar a app.avientrena.com se llega sin él. La marca de
// que los TENÍA (`apex_push:<id>`) viajó con la mudanza, y también viajó el «ahora no» de 7 días de
// la dirección vieja — que, si se respetara, escondería justo este recordatorio.
//   A1 tenía avisos + «ahora no» viejo reciente + permiso sin dar → sale el recordatorio, ARRIBA
//      (justo bajo la cabecera), con el tope de «Hoy» lleno, y el aviso normal se calla.
//   A2 al activar, el recordatorio desaparece.
//   A3 CONTROL: quien nunca tuvo avisos NO ve este recordatorio (le toca el aviso normal).
//   A4 su «Mañana» lo calla (un día).
//   C1 el coach que se mudó lo ve en su Inicio.
// Sin login ni red. Corre: node scripts/e2e/_verify-avisos-mudanza.mjs
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8833, OUT = process.env.TEMP + '/avi-avisos-mudanza';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9353', '--user-data-dir=' + process.env.TEMP + '/avmud-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9353/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || 'exception'); });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof renderClientToday==='function' && !document.getElementById('avi-loading')`);
await sleep(1800);

// Un asesorado con el tope de «Hoy» LLENO (día que se corrió + coach + novedades…), para probar
// que el recordatorio NO queda detrás de «Tienes N avisos más».
// (sin comillas invertidas: esto vive dentro de un template literal)
const MONTAR = `((o) => {try{
  o=o||{};
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const di=new Date().getDay(), hoy=days[di], pasado=days[di===0?6:(di-1)];
  const ex=(i)=>({id:'e'+i,name:'Ejercicio '+i,muscle:'Pierna',type:'Compuesto',sets:4,reps:'10'});
  const client={id:'mud',name:'Claudia Valbuena',sex:'F',level:'Intermedio',goal:'Ganar músculo',days:4,
    weight:62,height:163,age:31,activityFactor:1.55,createdAt:'2026-04-01T10:00:00.000Z',
    routines:[{id:'r1',name:'Pierna y glúteo',day:hoy,restSec:90,exercises:[0,1,2,3].map(ex)},
              {id:'r2',name:'Tren superior',day:pasado,restSec:90,exercises:[0,1,2].map(ex)}],
    habits:{water:{},steps:{}}};
  const hist=[];
  for(let i=1;i<=12;i++){ const d=new Date(Date.now()-(i*3+2)*86400000).toISOString();
    hist.push({id:'h'+i,sessionId:'s'+i,routineId:'r1',routineName:'Pierna y glúteo',date:d,finishedAt:d,
      doneSets:16,totalSets:16,totalVol:3000+i*40,exercises:[{name:'Ejercicio 0',sets:[{kg:40+i,reps:10,done:true}]}]}); }
  DB.clients=[client]; DB.history={mud:hist}; DB.prs={}; DB.bodyweight={};
  DB.nutrition={mud:{kcal:2100,prot:130,carbs:230,fat:60,water:8,goal:'mantenimiento'}};
  CUR.clientId='mud'; CUR.loggedAs='client'; CUR.trainAgain=false; CUR.todayOverride=null; CUR.todayExpanded=null; CUR.todayWorking=null;
  Object.keys(localStorage).filter(k=>/^done_|^log_|^session_|^ax_hbopen_|^coachmute_|^ax_missmute_|^ax_sharesnooze|^ax_news_seen|^ax_push_snooze|^ax_pushmv_snooze|^apex_push:|^ax_cmtynudge/.test(k)).forEach(k=>localStorage.removeItem(k));
  // El teléfono: permiso SIN DAR (o el que pida el caso), y lo que viajó con la mudanza.
  window.__perm=o.perm||'default';
  try{Object.defineProperty(window,'Notification',{configurable:true,value:{
    get permission(){return window.__perm;},
    requestPermission:async()=>{window.__perm='granted';return 'granted';}}});}catch(e){}
  try{_pushCtx={clientId:'mud',days:[],shifts:null};}catch(e){}
  if(o.marca)localStorage.setItem('apex_push:mud','https://fcm.googleapis.com/fcm/send/viejo-endpoint');
  if(o.snoozeViejo)localStorage.setItem('ax_push_snooze_mud',String(Date.now()-3600e3));
  if(o.snoozeMv)localStorage.setItem('ax_pushmv_snooze_mud',String(Date.now()-3600e3));
  showScreen('s-client');
  document.querySelectorAll('#s-client .cnp').forEach(p=>p.classList.remove('on'));
  const tod=document.getElementById('cn-today'); if(tod)tod.classList.add('on');
  renderClientToday(client);
  if(typeof ntClose==='function')ntClose(false);
  return 'ok';
}catch(e){return 'err:'+e.message;}})`;
const montar = async (o = {}) => { const r = await ev(`${MONTAR}(${JSON.stringify(o)})`); if (String(r).startsWith('err:')) throw new Error('montaje: ' + r); await sleep(700); };
const estado = () => ev(`(()=>{
  const mv=document.getElementById('cn-push-moved'), nd=document.getElementById('cn-push-nudge'), head=document.getElementById('cn-today-head');
  const r=mv?mv.getBoundingClientRect():null;
  let prev=mv?mv.previousElementSibling:null;
  return {mvTxt:(mv&&mv.innerText||'').trim().slice(0,160), mvAlto:r?Math.round(r.height):0,
    mvTope:!!(mv&&mv.classList.contains('cap-off')), trasCabecera:!!(prev&&prev.id==='cn-today-head'),
    ndTxt:(nd&&nd.innerText||'').trim().slice(0,80),
    apartadas:document.querySelectorAll('#cn-today .cap-off').length};
})()`);

const results = [];
const check = (n, c, x = '') => { const l = (c ? '✅' : '❌') + ' ' + n + (x ? ' — ' + x : ''); results.push(l); console.log('  ' + l); };
try {
  // ── A1 ──
  await montar({ marca: true, snoozeViejo: true });
  const a1 = await estado();
  check('A1a tenía avisos y los perdió: sale «Vuelve a activar tus avisos»', /Vuelve a activar tus avisos/.test(a1.mvTxt) && a1.mvAlto > 40, JSON.stringify(a1));
  check('A1b el «ahora no» de la dirección vieja NO lo esconde', a1.mvAlto > 40);
  check('A1c va ARRIBA, justo bajo la cabecera', a1.trasCabecera);
  check('A1d con el tope lleno (' + a1.apartadas + ' apartadas) el recordatorio NO se aparta', a1.apartadas > 0 && !a1.mvTope, JSON.stringify(a1));
  check('A1e el aviso normal se calla (no se repite el mismo pedido dos veces)', a1.ndTxt === '', a1.ndTxt);
  await ev(`(()=>{const e=document.getElementById('cn-push-moved');if(e)e.scrollIntoView({block:'center'});})()`); await sleep(400);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(OUT + '/a1-recordatorio.png', Buffer.from(shot.data, 'base64'));
  console.log('  shot -> ' + OUT + '/a1-recordatorio.png');
  // ── A2: activar ──
  await ev(`(async()=>{ subscribePush=async()=>true; await aviAskPush(); return true; })()`); await sleep(500);
  const a2 = await estado();
  check('A2 al activar, el recordatorio desaparece', a2.mvTxt === '' && a2.mvAlto === 0, JSON.stringify(a2));
  // ── A3: CONTROL — nunca tuvo avisos ──
  await montar({ marca: false });
  const a3 = await estado();
  check('A3 CONTROL: quien nunca tuvo avisos NO ve este recordatorio', a3.mvTxt === '', JSON.stringify(a3));
  check('A3b y le sigue saliendo el aviso normal', /Activa tus recordatorios/.test(a3.ndTxt), a3.ndTxt);
  // ── A4: «Mañana» ──
  await montar({ marca: true, snoozeMv: true });
  const a4 = await estado();
  check('A4 su «Mañana» lo calla', a4.mvTxt === '', JSON.stringify(a4));
  check('A4b y no lo reemplaza el aviso genérico pidiendo lo mismo', a4.ndTxt === '', a4.ndTxt);
  // ── C1: el coach ──
  const c1 = await ev(`(()=>{
    CUR.loggedAs='coach'; window.__perm='default';
    localStorage.removeItem('ax_pushmv_snooze__coach');
    localStorage.setItem('ax_push_snooze__coach',String(Date.now()-3600e3));
    localStorage.setItem('apex_push:_coach','https://fcm.googleapis.com/fcm/send/viejo-coach');
    renderCoachPushNudge();
    const t1=(document.getElementById('h-push-nudge').innerText||'').trim();
    localStorage.removeItem('apex_push:_coach'); renderCoachPushNudge();
    const t2=(document.getElementById('h-push-nudge').innerText||'').trim();
    return {conMarca:t1.slice(0,60), sinMarca:t2.slice(0,60)};
  })()`);
  check('C1 el coach que se mudó ve «Vuelve a activar tus notificaciones»', /Vuelve a activar tus notificaciones/.test(c1.conMarca), JSON.stringify(c1));
  check('C1-CONTROL sin la marca, el coach no ve ese recordatorio', !/Vuelve a activar/.test(c1.sinMarca), JSON.stringify(c1));
  check('sin errores JS', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));
} catch (e) { check('el harness corrió', false, String(e)); }
finally { try { ws.close(); } catch {} try { chrome.kill(); } catch {} try { srv.kill(); } catch {} }
const fallas = results.filter(r => r.startsWith('❌')).length;
console.log(fallas ? `\n🔴 ${fallas} FALLA(S)` : `\n✅ ${results.length}/${results.length} OK`);
process.exit(fallas ? 1 : 0);
