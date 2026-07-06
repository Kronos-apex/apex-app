import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = 8761;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-room-' + Date.now();
const OUT = 'C:/Users/KRONOS/AppData/Local/Temp/claude/C--Windows-system32/eaf2f608-a6af-4f54-bd34-5f3f5cb557ea/scratchpad/shots';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9261', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
chrome.on('error', e => { console.error('chrome', e); process.exit(1); });
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9261/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [], consoleErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?'); else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push((m.params.args || []).map(a => a.value || a.description || '').join(' ')); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.subtype === 'error') throw new Error(r.result.description); return r.result.value; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); log('  📸', n); };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await evaluate(expr)) return true; } catch {} await sleep(300); } return false; };

await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const report = {};
try {
  await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`, 20000);
  await evaluate(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
  await evaluate(`doLogin()`);
  report.login = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 20000);
  report.fnHasRing = await evaluate(`typeof openSessionRoom==='function' && openSessionRoom.toString().includes('sroom-ring')`);
  for (let k = 0; k < 10; k++) { await evaluate(`(()=>{try{if(typeof _dobFinish==='function'){const d=document.getElementById('data-ob');if(d&&d.classList.contains('on'))_dobFinish();}}catch(e){}try{const o=document.getElementById('onboarding');if(typeof obSkip==='function'&&o&&o.style.display!=='none')obSkip();}catch(e){}try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`).catch(()=>{}); await sleep(300); }
  await sleep(1200);

  // premium + history with duration/kcal/prs + ids
  await evaluate(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.tier='premium';c.weight=c.weight||72;
    const mk=(d,name,exs,extra)=>{const dt=new Date();dt.setDate(dt.getDate()-d);const done=exs.reduce((a,[,n])=>a+n,0);return Object.assign({id:'h'+d,routineId:'r'+d,routineName:name,date:dt.toISOString(),startedAt:new Date(dt.getTime()-52*60000).toISOString(),totalVol:3200-d*40,doneSets:done,totalSets:done,exercises:exs.map(([id,n,m])=>({id,muscle:m,name:'x',track:'peso_reps',sets:Array.from({length:n},()=>({kg:'45',reps:'10',done:true}))}))},extra||{});};
    DB.history=DB.history||{};
    DB.history[CUR.clientId]=[
      mk(0,'Pierna y empuje',[['e13',4,'piernas'],['e1',3,'pecho'],['e7',3,'hombros']],{durationSec:3120,kcal:331,feeling:4,prs:[{name:'Sentadilla con Barra',val:100,unit:'kg',reps:5,isNew:false}]}),
      mk(2,'Espalda y bíceps',[['e4',4,'espalda'],['e9',3,'biceps']],{durationSec:2700,kcal:288,feeling:3}),
      mk(5,'Full body',[['e13',3,'piernas'],['e1',3,'pecho']],{}),
    ];})()`);
  // entrar a Progreso
  await evaluate(`cnTab('cn-history',_cnTabEl('cn-history'))`);
  await sleep(600);

  // 5) gamif presente de inmediato
  report.gamifHasContent = await evaluate(`((document.getElementById('cn-gamif')||{}).innerText||'').length>0`);
  report.gamifText = await evaluate(`((document.getElementById('cn-gamif')||{}).innerText||'').slice(0,60)`);

  // 6) overflow horizontal: documento + peores ofensores
  report.docScrollW = await evaluate(`document.documentElement.scrollWidth`);
  report.docClientW = await evaluate(`document.documentElement.clientWidth`);
  report.offenders = await evaluate(`(()=>{const vw=document.documentElement.clientWidth;const out=[];document.querySelectorAll('#s-client *').forEach(el=>{const r=el.getBoundingClientRect();if(r.width>0&&(r.right>vw+1||r.left<-1)){out.push((el.id?'#'+el.id:el.className&&typeof el.className==='string'?'.'+el.className.split(' ')[0]:el.tagName)+' w='+Math.round(r.width)+' right='+Math.round(r.right)+' left='+Math.round(r.left));}});return out.slice(0,12);})()`);

  // calendario a tamaño normal: ¿se ven las 7 columnas sin recorte?
  await evaluate(`(()=>{const g=document.querySelector('.cal-grid');if(g)g.scrollIntoView({block:'center'});})()`); await sleep(300);
  report.calGrid = await evaluate(`(()=>{const g=document.querySelector('.cal-grid');if(!g)return null;const r=g.getBoundingClientRect();const vw=document.documentElement.clientWidth;return {left:Math.round(r.left),right:Math.round(r.right),vw, cols:[...g.children].slice(0,7).map(c=>Math.round(c.getBoundingClientRect().width))};})()`);
  await shot('calendar-normal');

  // 6b) overflow con texto MUY GRANDE (data-fs=xl): debe encajar exacto (sin scroll lateral)
  await evaluate(`document.documentElement.setAttribute('data-fs','xl')`); await sleep(400);
  report.xl_docScrollW = await evaluate(`document.documentElement.scrollWidth`);
  report.xl_docClientW = await evaluate(`document.documentElement.clientWidth`);
  report.xl_cnpRight = await evaluate(`(()=>{const p=document.querySelector('#cn-history.cnp.on')||document.querySelector('.cnp.on');if(!p)return null;const r=p.getBoundingClientRect();return {left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)};})()`);
  report.xl_mainScrollW = await evaluate(`(()=>{const m=document.querySelector('#s-client .main')||document.querySelector('.main');return m?{sw:m.scrollWidth,cw:m.clientWidth}:null;})()`);
  await shot('overflow-xl');
  await evaluate(`document.documentElement.removeAttribute('data-fs')`); await sleep(300);

  // 7) habitación: tocar tarjeta del historial → abre room
  await evaluate(`openSessionRoom(CUR.clientId,'h0')`);
  await sleep(600);
  report.roomOpen = await evaluate(`document.getElementById('session-room').classList.contains('on')`);
  report.roomText = await evaluate(`(document.getElementById('sroom-body')||{}).innerText||''`);
  report.roomStats = await evaluate(`[...document.querySelectorAll('#sroom-body .sroom-stat')].map(s=>s.querySelector('.sroom-stat-l').textContent+':'+s.querySelector('.sroom-stat-v').textContent)`);
  report.roomHasPR = await evaluate(`/Récord/.test((document.getElementById('sroom-body')||{}).innerText||'')`);
  await shot('room-open');

  // cerrar con botón atrás físico
  await evaluate(`history.back()`); await sleep(400);
  report.roomClosedAfterBack = await evaluate(`!document.getElementById('session-room').classList.contains('on')`);

  // abrir desde el calendario + RE-CAPTURA del nuevo diseño
  await evaluate(`(()=>{const dt=new Date();cnOpenDayHistory(CUR.clientId,dt.getFullYear(),dt.getMonth(),dt.getDate());})()`);
  await sleep(700);
  report.roomFromCalendar = await evaluate(`document.getElementById('session-room').classList.contains('on')`);
  report.roomHasRing = await evaluate(`!!document.querySelector('#sroom-body .sroom-ring .sr-fg')`);
  await shot('room-v2');
  await evaluate(`closeSessionRoom()`); await sleep(300);

  // FLOOR FIX: en Progreso con stack VACÍO, atrás debe ir a Inicio (Hoy), NO salir.
  await evaluate(`navReset('cn-today'); cnTab('cn-history',_cnTabEl('cn-history'),true);`); // silent → curTab=history, stack vacío
  report.floorBefore = { tab: await evaluate(`(document.querySelector('#s-client .cnp.on')||{}).id`), stack: await evaluate(`AVINAV.stack.length`), armed: await evaluate(`AVINAV.exitArmed`) };
  await evaluate(`history.back()`); await sleep(400);
  report.floorAfterBack = { tab: await evaluate(`(document.querySelector('#s-client .cnp.on')||{}).id`), armed: await evaluate(`AVINAV.exitArmed`) };
  // y un back más en Inicio → ahora SÍ arma salida
  await evaluate(`history.back()`); await sleep(400);
  report.homeBackArms = await evaluate(`AVINAV.exitArmed`);
} catch (e) { report.fatal = e.message; }
finally {
  report.jsErrors = jsErrors; report.consoleErrors = consoleErrors.slice(0, 20);
  log('\n===REPORT===\n' + JSON.stringify(report, null, 2));
  ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
  await sleep(300); process.exit(0);
}
