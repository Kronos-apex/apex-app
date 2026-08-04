// Verificación E2E de la SEMANA DE DESCARGA (v434). Patrón _verify-shock: NO login real, se
// inyectan clientes fake y se fuerza la pantalla; el sello v298 protege la nube.
// Cubre lo que el motor puro NO puede ver: que la tarjeta de la asesorada se PINTE (y arriba del
// entreno), que el aviso de descarga vencida salga en el Inicio del coach, y que el peso sugerido
// que se le muestra baje el 10%. Capturas en claro y oscuro para mirarlas.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PORT = 8786;
const APP = `http://localhost:${PORT}/`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-deload-' + Date.now();
const OUT = process.env.DELOAD_OUT || (process.env.TEMP + '/avi-deload');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9286', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
async function findPage() { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:9286/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push((m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?').split('\n')[0]); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { try { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (e) { return '<<err:' + e.message + '>>'; } };
const evj = async expr => JSON.parse(await ev(`JSON.stringify(${expr})`));
const waitFor = async (expr, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Runtime.enable'); await send('Page.enable');

let fails = 0;
const check = (name, ok, detail) => { log(`  ${ok ? 'OK' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); if (!ok) fails++; };
// R2.6: la captura tiene que traer el elemento EN VISTA, no la parte de la pantalla que tocó.
const shot = async (name, sel) => {
  if (sel) { await ev(`(()=>{const e=document.querySelector('${sel}');if(e)e.scrollIntoView({block:'center'});})()`); await sleep(300); }
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
};
// El tema real vive en `data-theme` del <html> (app-1-infra), no en una clase del body.
const setTheme = async t => { await ev(`(()=>{document.documentElement.setAttribute('data-theme','${t}');})()`); await sleep(300); };

// Cliente con plan y descarga activa. `DL_OFF` = días desde que empezó (para probar «vencida»).
const fixture = (offDays) => `(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const c={id:'a1',name:'Kathe Prueba',level:'Intermedio',days:4,tier:'premium',goal:'Ganar músculo',notes:'',
    payments:[{date:'2026-06-15',dueDate:'2026-12-01',amount:120000}],
    routines:[{id:'r1',name:'Glúteo A',day:['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][(new Date().getDay()+6)%7],restSec:90,exercises:[
      {id:'e1',name:'Hip Thrust en Máquina',muscle:'gluteo',type:'Compuesto',sets:4,reps:15},
      {id:'e2',name:'Peso Muerto Rumano',muscle:'piernas',type:'Compuesto',sets:3,reps:12}]}]};
  const r=startDeload(c,Date.now()-${offDays}*86400000);
  c.routines=r.routines; c.deload=r.deload;
  // Con historial vacío la app entra en modo «día 1» y apaga TODAS las tarjetas secundarias
  // (incluida esta), así que el fixture trae sesiones: quien está en descarga ya venía entrenando.
  const _ses=Array.from({length:12},(_,i)=>({date:new Date(Date.now()-(i+1)*3*86400000).toISOString(),
    finishedAt:new Date(Date.now()-(i+1)*3*86400000).toISOString(),doneSets:6,totalSets:6,
    exercises:[{name:'Hip Thrust en Máquina',muscle:'gluteo',track:'peso_reps',sets:[{done:true,kg:'60',reps:'15'}]}]}));
  DB.clients=[c]; DB.history={a1:_ses}; DB.prs={a1:{e1:{val:60,unit:'kg',reps:15,name:'Hip Thrust en Máquina',date:new Date(Date.now()-5*86400000).toISOString()}}}; DB.msgs={};
  window.CUR=window.CUR||{}; CUR.loggedAs='client'; CUR.clientId='a1';
  // El tour de novedades se monta encima de «Hoy» y tapa las capturas: se marca como visto.
  if(typeof ntClose==='function')ntClose(false);
  try{localStorage.setItem(_NEWS_SEEN_KEY,'9999');}catch(e){}
  return true;
}catch(e){return 'err:'+e.message+' | '+e.stack;}})()`;

try {
  await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && typeof startDeload==='function'`);
  await sleep(1500);

  // ── D1: la tarjeta de la asesorada se PINTA y va ARRIBA del entreno ──
  if (await ev(fixture(0)) !== true) throw new Error('fixture');
  const d1 = await evj(`(()=>{try{
    showScreen('s-client');
    if(typeof cnTab==='function'){const t=document.getElementById('tab-today'); cnTab('cn-today',t);}
    renderClientToday(DB.clients[0]);
    const el=document.getElementById('cn-deload');
    const panel=document.getElementById('cn-today');
    const ids=[...panel.children].map(x=>x.id);
    return {txt:(el&&el.innerText)||'', vis:!!(el&&el.offsetHeight>0),
      iDeload:ids.indexOf('cn-deload'), iBody:ids.indexOf('cn-today-body'), ids};
  }catch(e){return {err:e.message+' | '+e.stack};}})()`);
  if(d1.err) throw new Error('D1: '+d1.err);
  await setTheme('light'); await shot('D1-asesorada-claro','#cn-deload');
  check('D1 la asesorada VE por qué tiene menos series', d1.vis && /revoluciones|suave/i.test(d1.txt), d1.txt.replace(/\n/g, ' ').slice(0, 90));
  check('D1b va ARRIBA del entreno (explica el plan que está a punto de hacer)', d1.iDeload >= 0 && d1.iDeload < d1.iBody, `deload=${d1.iDeload} body=${d1.iBody}`);
  check('D1c sin jerga: ni «deload» ni «estancado»', !/deload|estanc/i.test(d1.txt), d1.txt.slice(0, 60));
  await setTheme('dark'); await shot('D1-asesorada-oscuro','#cn-deload'); await setTheme('light');

  // ── D2: el peso sugerido que VE la asesorada baja ~10% ──
  const d2 = await evj(`(()=>{
    const c=DB.clients[0], ex=c.routines[0].exercises[0];
    const sin=suggestFromPR(DB.prs.a1.e1,parseInt(ex.reps)||10);
    const con=_suggestKg(ex);
    return {sin, con, factor: (sin&&con)?con/sin:null};})()`);
  check('🔒 D2 el peso sugerido baja ~10% durante la descarga', d2.con < d2.sin && d2.factor > 0.85 && d2.factor < 0.95, JSON.stringify(d2));

  // ── D3: la tarjeta NO miente cuando la semana ya pasó ──
  if (await ev(fixture(10)) !== true) throw new Error('fixture 10');
  const d3 = await ev(`(()=>{renderClientToday(DB.clients[0]);return (document.getElementById('cn-deload')||{}).innerText||'';})()`);
  await shot('D3-vencida-asesorada','#cn-deload');
  check('D3 con la semana ya terminada el texto NO promete días que no quedan', /termin/i.test(d3) && !/quedan/i.test(d3), d3.replace(/\n/g, ' ').slice(0, 90));

  // ── D4: el coach ve el aviso de descarga VENCIDA en su Inicio ──
  const d4 = await evj(`(()=>{
    CUR.loggedAs='coach'; showScreen('s-coach'); gp('p-home',null,'Inicio',true);
    renderDeloadAlerts();
    const el=document.getElementById('h-deload');
    return {vis:el.style.display!=='none', txt:el.innerText||''};})()`);
  await setTheme('light'); await shot('D4-coach-aviso-claro','#h-deload');
  check('🔒 D4 el coach ve en Inicio a quién se le pasó la descarga', d4.vis && /Kathe/.test(d4.txt) && /termin/i.test(d4.txt), d4.txt.replace(/\n/g, ' ').slice(0, 90));
  await setTheme('dark'); await shot('D4-coach-aviso-oscuro','#h-deload'); await setTheme('light');

  // ── D5: dentro de los 7 días el aviso NO molesta ──
  if (await ev(fixture(2)) !== true) throw new Error('fixture 2');
  const d5 = await ev(`(()=>{renderDeloadAlerts();return document.getElementById('h-deload').style.display;})()`);
  check('D5 dentro de la semana el Inicio del coach NO se llena de avisos', d5 === 'none', 'display=' + d5);

  // ── D6: el panel de la ficha y la vuelta al plan normal ──
  const d6 = await evj(`(()=>{
    gp('p-detail',null,'Detalle',true); CUR.clientId='a1';
    renderDeloadPanel(DB.clients[0]);
    const antes=(document.getElementById('d-deload')||{}).innerText||'';
    const series=DB.clients[0].routines[0].exercises.map(e=>e.sets);
    window.confirm=()=>true; endDeloadFor('a1');
    const despues=(document.getElementById('d-deload')||{}).innerText||'';
    return {antes, despues, series, restauradas:DB.clients[0].routines[0].exercises.map(e=>e.sets),
      sinDeload:!DB.clients[0].deload};})()`);
  await shot('D6-ficha-plan-normal','#d-deload');
  check('D6 la ficha ofrece «Volver al plan normal» y al tocarlo restaura', /Volver al plan normal/.test(d6.antes) && d6.sinDeload &&
    JSON.stringify(d6.restauradas) === JSON.stringify([4, 3]), JSON.stringify({ series: d6.series, restauradas: d6.restauradas }));
  check('D6b tras volver, la ficha ofrece activarla de nuevo', /Semana de descarga/.test(d6.despues), d6.despues.slice(0, 50));

  log('\njsErrors:', jsErrors);
  if (jsErrors.length) { fails++; log('  FAIL hubo errores JS'); }
  log('shots en:', OUT);
  log(fails ? `\n${fails} FALLA(S)` : '\nTODO OK');
} catch (e) {
  log('ERROR:', e.message); fails++;
} finally {
  try { chrome.kill(); } catch {}
  try { srv.kill(); } catch {}
  process.exit(fails ? 1 : 0);
}
