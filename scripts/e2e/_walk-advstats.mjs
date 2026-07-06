import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = 8731;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-adv-' + Date.now();
const OUT = 'C:/Users/KRONOS/AppData/Local/Temp/claude/C--Windows-system32/eaf2f608-a6af-4f54-bd34-5f3f5cb557ea/scratchpad/shots';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

// ── static server (python) serving the LOCAL repo ──
const srv = spawn('python', ['-m', 'http.server', String(PORT)], {
  cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false,
});
srv.on('error', e => { console.error('server error', e); });
await sleep(1200);

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--remote-debugging-port=9229',
  '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check',
  '--window-size=390,844', APP,
], { detached: false });
chrome.on('error', e => { console.error('chrome spawn error', e); process.exit(1); });

async function findPage() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch('http://localhost:9229/json/list');
      const targets = await r.json();
      const p = targets.find(t => t.type === 'page' && t.url.includes('localhost'));
      if (p && p.webSocketDebuggerUrl) return p;
    } catch {}
    await sleep(500);
  }
  throw new Error('no page target');
}
const page = await findPage();
const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 200 * 1024 * 1024 });
let msgId = 1; const pending = new Map();
const jsErrors = [], consoleErrors = [];
ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') jsErrors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || 'unknown');
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push((m.params.args || []).map(a => a.value || a.description || '').join(' '));
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = msgId++; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.subtype === 'error') throw new Error(r.result.description); return r.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); log('  📸', name); };
const waitFor = async (expr, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await evaluate(expr)) return true; } catch {} await sleep(300); } return false; };

await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 1400, deviceScaleFactor: 2, mobile: true });

const report = {};
try {
  await waitFor(`!!document.getElementById('lu')`, 15000);
  await evaluate(`(()=>{document.getElementById('lu').value=${JSON.stringify(EMAIL)};document.getElementById('lp').value=${JSON.stringify(PASS)};})()`);
  await evaluate(`doLogin()`);
  report.login = await waitFor(`(()=>{const e=document.getElementById('s-client');return e&&getComputedStyle(e).display!=='none'})()`, 20000);
  for (let k = 0; k < 8; k++) {
    await evaluate(`(()=>{try{if(typeof _dobFinish==='function'){const d=document.getElementById('data-ob');if(d&&d.classList.contains('on'))_dobFinish();}}catch(e){}try{const o=document.getElementById('onboarding');if(typeof obSkip==='function'&&o&&o.style.display!=='none')obSkip();}catch(e){}try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro'].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.remove('on');});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`).catch(()=>{});
    await sleep(400);
  }
  await sleep(1500); // let cloud sync settle

  // Inject: premium tier + varied history (empuje/tracción/piernas/core)
  const inj = await evaluate(`(()=>{
    const cid=CUR.clientId; const c=DB.clients.find(x=>x.id===cid); if(c)c.tier='premium';
    const mk=(daysAgo,exs)=>{const d=new Date();d.setDate(d.getDate()-daysAgo);return {id:'h'+daysAgo,date:d.toISOString(),routineName:'Test',totalVol:1000,doneSets:9,totalSets:9,exercises:exs.map(([m,n])=>({muscle:m,track:'peso_reps',sets:Array.from({length:n},()=>({kg:'40',reps:'10',done:true}))}))};};
    DB.history=DB.history||{};
    DB.history[cid]=[mk(1,[['pecho',4],['triceps',3],['hombros',3]]),mk(3,[['espalda',4],['biceps',3]]),mk(5,[['piernas',5],['gluteo',3],['core',2]]),mk(8,[['pecho',3],['hombros',2]]),mk(12,[['espalda',4],['biceps',2],['core',2]])];
    cnTab('cn-history', document.querySelectorAll('.cntab')[3]);
    if(typeof renderClientHistory==='function')renderClientHistory(cid);
    return {cid, isFree:isFreeClient(c)};
  })()`);
  report.inject = inj;
  await sleep(900);

  // scroll the adv-stats block into view + capture text
  await evaluate(`(()=>{const e=document.getElementById('cn-advstats');if(e)e.scrollIntoView({block:'start'});})()`);
  await sleep(500);
  await shot('advstats');
  report.advHTMLlen = await evaluate(`(document.getElementById('cn-advstats')||{}).innerHTML?.length||0`);
  report.advText = await evaluate(`(document.getElementById('cn-advstats')||{}).innerText||''`);
  report.barLabels = await evaluate(`[...document.querySelectorAll('#cn-advstats .adv-row-lbl')].map(e=>e.textContent)`);
  report.barVals = await evaluate(`[...document.querySelectorAll('#cn-advstats .adv-row-val')].map(e=>e.textContent.trim())`);
  report.balPcts = await evaluate(`[...document.querySelectorAll('#cn-advstats .adv-bal-seg')].map(e=>e.textContent.trim())`);
  report.verdict = await evaluate(`(document.querySelector('#cn-advstats .adv-verdict')||{}).innerText||''`);

  // toggle 7 days to verify recompute
  await evaluate(`setAdvWin(7)`); await sleep(500);
  report.win7Text = await evaluate(`(document.getElementById('cn-advstats')||{}).innerText?.slice(0,90)||''`);
  await shot('advstats-7d');
  await evaluate(`setAdvWin(30)`); await sleep(400);
} catch (e) { report.fatal = e.message; }
finally {
  report.jsErrors = jsErrors; report.consoleErrors = consoleErrors.slice(0, 20);
  log('\n===REPORT===\n' + JSON.stringify(report, null, 2));
  ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
  await sleep(300); process.exit(0);
}
