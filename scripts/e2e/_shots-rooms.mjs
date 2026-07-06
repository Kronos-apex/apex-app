import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = 8785, APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-shots-' + Date.now();
const OUT = 'C:/Users/KRONOS/AppData/Local/Temp/claude/C--Windows-system32/fc5f138c-693b-4f0d-a22f-194c8a6a677a/scratchpad/rooms';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9285', '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP]);
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9285/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw 0; }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 1e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n); };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

// Bypass del service worker (sirve CSS/JS viejo de CacheStorage pese a setCacheDisabled)
await sleep(800);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(800);

await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`);
for (let k = 0; k < 8; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }

// datos sinteticos ricos
await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.tier='premium';c.weight=c.weight||74;c.height=c.height||176;c.goal=c.goal||'ganar_musculo';c.sex=c.sex||'M';
  DB.history=DB.history||{};const mk=(d,name,rid,exs,extra)=>{const dt=new Date();dt.setDate(dt.getDate()-d);return Object.assign({id:'h'+d,routineId:rid,routineName:name,date:dt.toISOString(),startedAt:new Date(dt.getTime()-52*60000).toISOString(),totalVol:3400-d*30,doneSets:exs.reduce((a,[, n])=>a+n,0),totalSets:exs.reduce((a,[, n])=>a+n,0),exercises:exs.map(([eid,n,m])=>({id:eid,muscle:m,name:'x',track:'peso_reps',sets:Array.from({length:n},()=>({kg:'50',reps:'10',done:true}))}))},extra||{});};
  DB.history[CUR.clientId]=[mk(0,'Pierna',[ 'r0'],[['e13',4,'piernas'],['e1',3,'pecho']],{durationSec:3120,kcal:331,feeling:4}),mk(2,'Espalda',[ 'r1'],[['e4',4,'espalda'],['e9',3,'biceps']],{durationSec:2700,kcal:288}),mk(5,'Pierna',[ 'r0'],[['e13',3,'piernas']],{durationSec:2400,kcal:250})];
  DB.prs=DB.prs||{};DB.prs[CUR.clientId]={e13:{val:120,unit:'kg',reps:5},e1:{val:80,unit:'kg',reps:6},'Sentadilla':{val:120,unit:'kg',reps:5}};})()`);
await sleep(400);

await ev(`document.fonts.ready`); await sleep(600);
// forzar carga de Fraunces (display=swap puede no pintarla hasta usarla)
await ev(`(async()=>{try{await document.fonts.load("600 25px Fraunces");await document.fonts.load("700 14px Fraunces");}catch(e){}})()`);
await sleep(700);

const cap = async (name, openExpr) => {
  await ev(openExpr); await sleep(900);
  await ev(`document.fonts.ready`);              // asegurar fuentes pintadas
  await ev(`void document.body.offsetHeight`);   // forzar reflow
  await sleep(700);
  const open = await ev(`!!document.querySelector('.sroom.on')`);
  await shot(name + (open ? '' : '_FAIL'));
  await ev(`document.querySelectorAll('.sroom.on').forEach(r=>r.classList.remove('on'));AVINAV.layers=0;`);
  await sleep(250);
};

await cap('1-session', `openSessionRoom(CUR.clientId,'h0')`);
await cap('2-exercise', `openExerciseRoom(CUR.clientId,'e13')`);
await cap('3-month', `(()=>{const d=new Date();openMonthRoom(CUR.clientId,d.getFullYear(),d.getMonth());})()`);
await cap('4-record', `openRecordRoom(CUR.clientId,'Sentadilla')`);
await cap('5-muscle', `openMuscleRoom(CUR.clientId,'piernas')`);
await cap('6-nutrition', `openNutritionRoom(CUR.clientId)`);
const rid = await ev(`((DB.clients.find(x=>x.id===CUR.clientId).routines||[])[0]||{}).id`);
await cap('7-routine', `openRoutineRoom(CUR.clientId, ${JSON.stringify(rid || 'r0')})`);
// tema CLARO: verificar que el premium tambien luce bien
await ev(`setTheme('light')`); await sleep(500);
await cap('8-session-light', `openSessionRoom(CUR.clientId,'h0')`);
await ev(`setTheme('dark')`); await sleep(300);

ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
process.exit(0);
