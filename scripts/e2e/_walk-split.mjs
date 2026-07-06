import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = 8732;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-split-' + Date.now();
const OUT = 'C:/Users/KRONOS/AppData/Local/Temp/claude/C--Windows-system32/eaf2f608-a6af-4f54-bd34-5f3f5cb557ea/scratchpad/shots';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9230', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
chrome.on('error', e => { console.error('chrome', e); process.exit(1); });

async function findPage() {
  for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9230/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); }
  throw new Error('no page');
}
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map(); const jsErrors = [], consoleErrors = [];
ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '?'); else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push((m.params.args || []).map(a => a.value || a.description || '').join(' ')); });
const send = (method, params = {}) => new Promise((res, rej) => { const id = msgId++; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.subtype === 'error') throw new Error(r.result.description); return r.result.value; };
const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.data, 'base64')); log('  📸', n); };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await evaluate(expr)) return true; } catch {} await sleep(300); } return false; };

await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 1500, deviceScaleFactor: 2, mobile: true });

const report = { levels: {} };
try {
  await waitFor(`!!document.getElementById('lu')`, 15000);
  await evaluate(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
  await evaluate(`doLogin()`);
  report.login = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 20000);
  for (let k = 0; k < 8; k++) { await evaluate(`(()=>{try{if(typeof _dobFinish==='function'){const d=document.getElementById('data-ob');if(d&&d.classList.contains('on'))_dobFinish();}}catch(e){}try{const o=document.getElementById('onboarding');if(typeof obSkip==='function'&&o&&o.style.display!=='none')obSkip();}catch(e){}try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.remove('on');});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`).catch(()=>{}); await sleep(400); }
  await sleep(1500);
  // inject varied history once
  await evaluate(`(()=>{const cid=CUR.clientId;const mk=(d,exs)=>{const dt=new Date();dt.setDate(dt.getDate()-d);return {id:'h'+d,date:dt.toISOString(),routineName:'T',doneSets:9,totalSets:9,totalVol:1000,exercises:exs.map(([m,n])=>({muscle:m,track:'peso_reps',sets:Array.from({length:n},()=>({kg:'40',reps:'10',done:true}))}))};};DB.history=DB.history||{};DB.history[cid]=[mk(1,[['pecho',4],['triceps',3],['hombros',3]]),mk(3,[['espalda',4],['biceps',3]]),mk(5,[['piernas',5],['gluteo',3],['core',2]])];})()`);

  // helper to set tier and probe both gates
  async function probe(tier, label) {
    await evaluate(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.tier=${JSON.stringify(tier)};})()`);
    // Progreso (advstats)
    await evaluate(`cnTab('cn-history', document.querySelectorAll('.cntab')[3]); if(typeof renderClientHistory==='function')renderClientHistory(CUR.clientId);`);
    await sleep(500);
    const advLocked = await evaluate(`/🔒|Quiero un coach/.test((document.getElementById('cn-advstats')||{}).innerText||'')`);
    const advHasNumbers = await evaluate(`/series/i.test((document.getElementById('cn-advstats')||{}).innerText||'')`);
    // Mensajes (chat)
    await evaluate(`cnTab('cn-messages', document.querySelectorAll('.cntab')[2]); if(typeof renderClientMsgs==='function')renderClientMsgs(CUR.clientId);`);
    await sleep(400);
    const chatLocked = await evaluate(`/🔒|Quiero un coach/.test((document.getElementById('cn-msg-thread')||{}).innerText||'')`);
    const composerVisible = await evaluate(`(()=>{const c=document.getElementById('cn-msg-composer');return c?getComputedStyle(c).display!=='none':null})()`);
    report.levels[label] = { advLocked, advHasNumbers, chatLocked, composerVisible };
  }
  await probe('libre', 'libre');
  await probe('app', 'app');
  await probe('premium', 'coach');

  // screenshot the app-tier progreso (premium features unlocked) + messages (chat locked)
  await evaluate(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.tier='app';})()`);
  await evaluate(`cnTab('cn-history', document.querySelectorAll('.cntab')[3]); renderClientHistory(CUR.clientId);`); await sleep(500);
  await evaluate(`(()=>{const e=document.getElementById('cn-advstats');if(e)e.scrollIntoView({block:'start'});})()`); await sleep(300);
  await shot('split-app-progreso');
  await evaluate(`cnTab('cn-messages', document.querySelectorAll('.cntab')[2]); renderClientMsgs(CUR.clientId);`); await sleep(400);
  await shot('split-app-chatlock');
} catch (e) { report.fatal = e.message; }
finally {
  report.jsErrors = jsErrors; report.consoleErrors = consoleErrors.slice(0, 20);
  log('\n===REPORT===\n' + JSON.stringify(report, null, 2));
  ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
  await sleep(300); process.exit(0);
}
