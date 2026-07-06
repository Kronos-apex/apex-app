import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = 8786, APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-nutri-' + Date.now();
const OUT = process.env.TEMP + '/claude/C--Windows-system32/56434f7d-f330-463f-a375-4ada2bdd773f/scratchpad/nutri';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app' });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9286', '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=390,844', APP]);
async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9286/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw 0; }
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 1e8 });
let id = 1; const pend = new Map();
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => { try { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); return r.result?.value; } catch (x) { return 'ERR:' + x.message; } };
const waitFor = async (e, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(e)) return true; } catch {} await sleep(300); } return false; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); console.log('  shot', n); };
await new Promise(r => ws.on('open', r));
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(800);
await ev(`(async()=>{try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();}catch(e){}try{const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}})()`);
await send('Page.navigate', { url: APP });
await sleep(800);
await waitFor(`!!document.getElementById('lu') && typeof doLogin==='function'`);
await ev(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
await ev(`doLogin()`);
await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`);
for (let k = 0; k < 8; k++) { await ev(`(()=>{try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`); await sleep(150); }

// CASO A: estimacion automatica (sin plan del coach) — objetivo Ganar musculo
await ev(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.tier='premium';c.weight=74;c.height=176;c.age=28;c.sex='M';c.goal='Ganar músculo';c.activityFactor=1.55;(DB.nutrition||(DB.nutrition={}));delete DB.nutrition[CUR.clientId];})()`);
await ev(`document.fonts.ready`); await sleep(400);
await ev(`(async()=>{try{await document.fonts.load("600 25px Fraunces");}catch(e){}})()`);
await sleep(500);
await ev(`openNutritionRoom(CUR.clientId)`); await sleep(900);
await ev(`void document.body.offsetHeight`); await sleep(500);
console.log('A open?', await ev(`!!document.querySelector('.sroom.on')`));
console.log('A has guide?', await ev(`!!document.querySelector('#nutroom-body') && /Cómo repartir tu día/.test(document.getElementById('nutroom-body').textContent)`));
console.log('A scrollH/clientH', await ev(`(()=>{const b=document.getElementById('nutroom-body');return b?b.scrollHeight+'/'+b.clientHeight:'no'})()`));
await shot('A-estimacion-top');
// scroll abajo para ver las secciones nuevas
await ev(`(()=>{const b=document.getElementById('nutrition-room');if(b)b.scrollTop=b.scrollHeight*0.42;})()`); await sleep(500);
await shot('A-estimacion-mid');
await ev(`(()=>{const b=document.getElementById('nutrition-room');if(b)b.scrollTop=b.scrollHeight;})()`); await sleep(500);
await shot('A-estimacion-bottom');
await ev(`document.querySelectorAll('.sroom.on').forEach(r=>r.classList.remove('on'));AVINAV.layers=0;`); await sleep(300);

// CASO B: plan del coach con kcal+macros pero SIN ejemplos -> tambien se llena
await ev(`(()=>{DB.nutrition[CUR.clientId]={goal:'definicion',kcal:2100,water:10,meals:4,prot:160,carbs:180,fat:60,plan:'Prioriza comida real y proteína en cada comida.',avoid:'Gaseosas y frituras'};})()`);
await ev(`openNutritionRoom(CUR.clientId)`); await sleep(900);
await ev(`void document.body.offsetHeight`); await sleep(400);
console.log('B has guide?', await ev(`/Ideas para armar tu plato/.test(document.getElementById('nutroom-body').textContent)`));
await shot('B-coach-top');
await ev(`(()=>{const b=document.getElementById('nutrition-room');if(b)b.scrollTop=b.scrollHeight;})()`); await sleep(500);
await shot('B-coach-bottom');

ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
console.log('OUT', OUT);
process.exit(0);
