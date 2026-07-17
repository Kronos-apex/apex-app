// Captura del PANEL DEL COACH para auditoría de diseño — sin login, 390px,
// claro+oscuro, página COMPLETA. Panel via argv[2] (home|clients|detail|exercises), default home.
// Monta 4 clientes fake con pagos + historial de la semana.
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const PANEL = process.argv[2] || 'home';
const PORT = 8798, OUT = 'C:/Users/KRONOS/AppData/Local/Temp/avi-design';
try { mkdirSync(OUT, { recursive: true }); } catch {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9300', '--user-data-dir=' + process.env.TEMP + '/coach-' + Date.now(), '--no-first-run', '--window-size=390,844', `http://localhost:${PORT}/`]);
async function fp() { for (let i = 0; i < 120; i++) { try { const t = await (await fetch('http://localhost:9300/json/list')).json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await fp(); const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 2e8 });
let id = 1; const pend = new Map(); ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const { resolve } = pend.get(m.id); pend.delete(m.id); resolve(m.result); } });
const send = (m, p = {}) => new Promise(res => { const i = id++; pend.set(i, { resolve: res }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; };
const waitFor = async (e, ms = 45000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e)) return true; await sleep(400); } return false; };
const MAXH = parseInt(process.env.SHOT_MAXH || '0');
async function shotFull(n) {
  let h = await ev(`(()=>{
    const mn=document.querySelector('#s-coach .main'); if(mn){mn.style.overflow='visible';mn.style.height='auto';mn.style.flex='none';}
    const cs=document.getElementById('s-coach'); if(cs){cs.style.height='auto';cs.style.maxHeight='none';cs.style.overflow='visible';}
    document.querySelectorAll('.coach-topbar').forEach(e=>{e.style.position='static';});
    return document.getElementById('s-coach').scrollHeight;
  })()`);
  if (MAXH && h > MAXH) h = MAXH;
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  await sleep(400);
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n, `(${h}px)`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
}
await new Promise(r => ws.on('open', r)); await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await waitFor(`!!document.getElementById('s-login') && typeof showScreen==='function' && !document.getElementById('avi-loading')`);
await sleep(2500);

const setup = await ev(`(()=>{try{
  ['avi-loading','apex-loading'].forEach(x=>{const l=document.getElementById(x);if(l)l.style.display='none';});
  const mkEx=(nm,mus)=>({id:nm,name:nm,muscle:mus,type:'Compuesto',track:'peso_reps',sets:3,reps:'10'});
  const rout=(nm,day)=>({id:'r'+nm+day,name:nm,day,exercises:[mkEx('Sentadilla','Cuádriceps'),mkEx('Press banca','Pecho'),mkEx('Remo','Espalda')]});
  const mkC=(id,name,due,sex,goal)=>({id,name,email:name.toLowerCase().replace(/ /g,'.')+'@gmail.com',goal,level:'Intermedio',days:4,weight:75,height:178,age:32,sex,phone:'3001234567',tier:'premium',
    payments:[{date:'2026-06-15',dueDate:due,amount:120000}],routines:[rout('Empuje','Lunes'),rout('Tracción','Martes'),rout('Pierna','Jueves')]});
  DB.clients=[
    mkC('c1','Samuel Cifuentes','2026-08-05','M','Ganar músculo'),
    mkC('c2','Andrea Molina','2026-07-16','F','Bajar de peso'),
    mkC('c3','Julián Restrepo','2026-07-02','M','Fuerza'),
    mkC('c4','Valery Gómez','2026-08-20','F','Tonificar')
  ];
  DB.clients[2].suspended=false; // vencido (due pasado)
  const mkS=(cid,daysAgo,vol)=>{const d=new Date();d.setDate(d.getDate()-daysAgo);d.setHours(18,0,0,0);
    return {id:cid+'s'+daysAgo,sessionId:cid+'sid'+daysAgo,routineId:'r1',routineName:'Empuje',date:d.toISOString(),startedAt:d.toISOString(),totalVol:vol,doneSets:12,totalSets:12,exercises:[]};};
  DB.history={c1:[mkS('c1',0,4800),mkS('c1',2,4600),mkS('c1',5,4400)],c2:[mkS('c2',1,3200),mkS('c2',4,3100)],c4:[mkS('c4',0,2800)]};
  // I2: adherencia de agua para la ficha (#d-habits). c1 tiene registro (tarjeta VISIBLE);
  // c2/c3/c4 sin habits → tarjeta OCULTA (progressive disclosure). Plan del coach: 8 vasos.
  const _dk=off=>{const d=new Date();d.setDate(d.getDate()-off);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  DB.nutrition={c1:{water:8}};
  DB.clients[0].habits={water:{[_dk(0)]:8,[_dk(1)]:10,[_dk(2)]:4,[_dk(3)]:8,[_dk(5)]:6,[_dk(6)]:8}}; // metDays=4, loggedDays=6, día -4 sin registro
  window.CUR=window.CUR||{}; CUR.loggedAs='coach';
  if(typeof COACH_NAME!=='undefined'){}
  showScreen('s-coach');
  if(typeof renderAll==='function')renderAll();
  const panel='${PANEL}';
  if(panel==='home'){ gp('p-home',document.getElementById('sbi-home'),'Inicio'); if(typeof renderHome==='function')renderHome(); }
  else if(panel==='clients'){ gp('p-clients',document.getElementById('sbi-clients'),'Asesorados'); if(typeof renderClients==='function')renderClients(); }
  else if(panel==='exercises'){ gp('p-exercises',document.getElementById('sbi-exercises'),'Ejercicios'); if(typeof renderExercises==='function')renderExercises(); }
  else if(panel==='detail'){ if(typeof openDetail==='function')openDetail('c1'); if(${process.env.EXPAND_VAL?'true':'false'}&&typeof toggleValoracion==='function'){setTimeout(toggleValoracion,300);} if(${process.env.EXPAND_PLAN?'true':'false'}){setTimeout(()=>{const h=document.querySelector('#d-freelead .plan-control-h');if(h)togglePlanControl(h);},300);} }
  else if(panel==='templates'){
    const mkE=(nm,mus)=>({id:nm,name:nm,muscle:mus,type:'Compuesto',track:'peso_reps',sets:3,reps:'10'});
    DB.templates=[
      {id:'t1',name:'Full Body Principiante',tag:'Principiante',restSec:90,note:'Ideal para las primeras 3 semanas.',exercises:[mkE('Sentadilla','Cuádriceps'),mkE('Press banca','Pecho'),mkE('Remo','Espalda')]},
      {id:'t2',name:'Empuje — Hipertrofia',tag:'Intermedio',restSec:75,exercises:[mkE('Press inclinado','Pecho'),mkE('Press militar','Hombro'),mkE('Fondos','Tríceps')]},
      {id:'t3',name:'Pierna Fuerza',tag:'Avanzado',restSec:120,exercises:[mkE('Sentadilla','Cuádriceps'),mkE('Peso muerto','Isquios'),mkE('Prensa','Cuádriceps')]}
    ];
    gp('p-templates',document.getElementById('sbi-templates'),'Plantillas'); if(typeof renderTemplates==='function')renderTemplates();
  }
  else if(panel==='msgs'){
    const mkM=(from,text,hAgo)=>{const d=new Date();d.setHours(d.getHours()-hAgo);return{from,text,date:d.toISOString()};};
    DB.msgs={
      c1:[mkM('coach','¡Buen trabajo hoy Samuel!',5),mkM('client','Gracias coach, me sentí fuerte 💪',3)],
      c2:[mkM('client','Coach, me dolió un poco la rodilla en la sentadilla',2)],
      c4:[mkM('coach','Valery, subí tu nueva rutina de pierna',20)]
    };
    gp('p-msgs',document.getElementById('sbi-msgs'),'Mensajes'); if(typeof renderMsgs==='function')renderMsgs();
  }
  return true;
}catch(e){return 'err:'+e.message+' | '+e.stack;}})()`);
console.log('  setup:', setup);
await sleep(1000);
if (PANEL === 'detail') {
  const hab = await ev(`(()=>{const el=document.getElementById('d-habits');return {disp:el?el.style.display:'?',txt:el?(el.innerText||'').replace(/\\s+/g,' ').trim():'',dots:el?el.querySelectorAll('.card > div > span[title]').length:0};})()`);
  console.log('  #d-habits (c1, con datos):', JSON.stringify(hab));
  const empty = await ev(`(()=>{try{DB.clients[1].habits={};openDetail('c2');const el=document.getElementById('d-habits');return {disp:el?el.style.display:'?'};}catch(e){return 'err:'+e.message;}})()`);
  console.log('  #d-habits (c2, 0 días → debe ocultar):', JSON.stringify(empty));
  await ev(`openDetail('c1')`); await sleep(600); // volver a c1 con datos para los shots
}
await ev(`typeof setTheme==='function' && setTheme('light')`); await sleep(500); await shotFull('coach-'+PANEL+'-claro');
await ev(`typeof setTheme==='function' && setTheme('dark')`); await sleep(500); await shotFull('coach-'+PANEL+'-oscuro');
console.log('OUT:', OUT);
chrome.kill(); srv.kill(); process.exit(0);
