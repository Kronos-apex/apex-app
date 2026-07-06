import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = 8733;
const APP = `http://localhost:${PORT}/`;
import { EMAIL, PASS } from './_creds.mjs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = process.env.TEMP + '/cdp-prog-' + Date.now();
const OUT = 'C:/Users/KRONOS/AppData/Local/Temp/claude/C--Windows-system32/eaf2f608-a6af-4f54-bd34-5f3f5cb557ea/scratchpad/shots';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: 'C:/Users/KRONOS/Desktop/AVI/apex-app', detached: false });
await sleep(1200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9231', '--user-data-dir=' + PROFILE, '--no-first-run', '--no-default-browser-check', '--window-size=390,844', APP], { detached: false });
chrome.on('error', e => { console.error('chrome', e); process.exit(1); });

async function findPage() { for (let i = 0; i < 40; i++) { try { const r = await fetch('http://localhost:9231/json/list'); const t = await r.json(); const p = t.find(x => x.type === 'page' && x.url.includes('localhost')); if (p?.webSocketDebuggerUrl) return p; } catch {} await sleep(500); } throw new Error('no page'); }
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
  for (let k = 0; k < 10; k++) { await evaluate(`(()=>{try{if(typeof _dobFinish==='function'){const d=document.getElementById('data-ob');if(d&&d.classList.contains('on'))_dobFinish();}}catch(e){}try{const o=document.getElementById('onboarding');if(typeof obSkip==='function'&&o&&o.style.display!=='none')obSkip();}catch(e){}try{if(typeof hideClientWelcome==='function')hideClientWelcome();}catch(e){}try{if(typeof setTextSize==='function'){const f=document.getElementById('m-textsize');if(f&&getComputedStyle(f).display!=='none')f.style.display='none';}}catch(e){}['data-ob','cwelcome','fsintro','m-fsintro','m-textsize'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.remove('on');e.style.display='none';}});const ob=document.getElementById('onboarding');if(ob)ob.style.display='none';})()`).catch(()=>{}); await sleep(350); }
  await sleep(1500);

  // premium + history with REAL exercise ids so submuscles resolve via MM_EX
  await evaluate(`(()=>{const c=DB.clients.find(x=>x.id===CUR.clientId);c.tier='premium';
    const mk=(d,exs)=>{const dt=new Date();dt.setDate(dt.getDate()-d);return {id:'h'+d,routineId:'r'+d,routineName:'Pierna y empuje',date:dt.toISOString(),startedAt:dt.toISOString(),doneSets:99,totalSets:99,totalVol:1200,exercises:exs.map(([id,m,n])=>({id,muscle:m,name:'x',track:'peso_reps',sets:Array.from({length:n},()=>({kg:'40',reps:'10',done:true}))}))};};
    DB.history=DB.history||{};
    DB.history[CUR.clientId]=[
      mk(0,[['e13','piernas',4],['e15','piernas',3],['e60','piernas',2],['e16','piernas',2],['e1','pecho',3]]),
      mk(2,[['e4','espalda',4],['e9','biceps',3]]),
      mk(4,[['e7','hombros',3],['e11','triceps',3]]),
      mk(6,[['e13','piernas',3],['e1','pecho',3]]),
    ];})()`);
  await evaluate(`cnTab('cn-history', document.querySelectorAll('.cntab')[3]); renderClientHistory(CUR.clientId);`);
  await sleep(700);

  // 1. discount banner gone
  report.gamifText = await evaluate(`(document.getElementById('cn-gamif')||{}).innerText?.slice(0,300)||''`);
  report.discountBannerGone = await evaluate(`!/Descuento de este mes|🎁/.test((document.getElementById('cn-gamif')||{}).innerText||'')`);
  // 2. history collapsed to 2 + collapse-more
  report.histCardsShown = await evaluate(`document.querySelectorAll('#cn-hist-list .sescard').length`);
  report.collapseMore = await evaluate(`(()=>{const b=document.querySelector('#cn-hist-list .collapse-more');return b?b.textContent:null})()`);
  // 4. expand Piernas group → submuscle rows
  await evaluate(`(()=>{const rows=[...document.querySelectorAll('#cn-advstats .adv-grp')];const pier=rows.find(r=>/Piernas/.test(r.querySelector('.adv-row-lbl')?.textContent||''));if(pier){pier.querySelector('.adv-row').click();}})()`);
  await sleep(400);
  report.piernasSubs = await evaluate(`(()=>{const rows=[...document.querySelectorAll('#cn-advstats .adv-grp')];const pier=rows.find(r=>/Piernas/.test(r.querySelector('.adv-row-lbl')?.textContent||''));if(!pier)return null;const sm=pier.querySelector('.adv-sm');if(!sm||sm.style.display==='none')return 'hidden';return [...sm.querySelectorAll('.adv-smrow')].map(r=>r.querySelector('.adv-smrow-lbl').textContent+':'+r.querySelector('.adv-smrow-val').textContent);})()`);
  await evaluate(`(()=>{const rows=[...document.querySelectorAll('#cn-advstats .adv-grp')];const pier=rows.find(r=>/Piernas/.test(r.querySelector('.adv-row-lbl')?.textContent||''));if(pier)pier.scrollIntoView({block:'center'});})()`); await sleep(300);
  await shot('prog-piernas-expandido');

  // 3. calendar click → open that day's session. Use a known injected day (6 days ago).
  await evaluate(`(()=>{const dt=new Date();dt.setDate(dt.getDate()-6);cnOpenDayHistory(CUR.clientId,dt.getFullYear(),dt.getMonth(),dt.getDate());})()`);
  await sleep(700);
  report.calOpenedSession = await evaluate(`(()=>{const card=document.getElementById('sescard-h6');if(!card)return 'no-card';const det=card.children[1];return det&&det.style.display==='block'?'opened':'closed';})()`);
  report.histCardsAfterCalClick = await evaluate(`document.querySelectorAll('#cn-hist-list .sescard').length`);
  await evaluate(`(()=>{const card=document.getElementById('sescard-h6');if(card)card.scrollIntoView({block:'center'});})()`); await sleep(400);
  await shot('prog-cal-opened');
} catch (e) { report.fatal = e.message; }
finally {
  report.jsErrors = jsErrors; report.consoleErrors = consoleErrors.slice(0, 20);
  log('\n===REPORT===\n' + JSON.stringify(report, null, 2));
  ws.close(); try { chrome.kill(); } catch {} try { srv.kill(); } catch {}
  await sleep(300); process.exit(0);
}
